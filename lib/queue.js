'use strict';

const Job = require('./job');
const { parseTimeout, parseAttempts } = require('./utils');
const { TABLE_NAME } = require('./enum');

/**
 * 队列
 */
class Queue {
    constructor(connection, name = 'default', options) {
        if (typeof name === 'object' && options === undefined) {
            options = name;
            name = undefined;
        }

        options || (options = {});
        options.table || (options.table = TABLE_NAME);
        options.universal || (options.universal = false);

        this.name = name || 'default';
        this.options = options;

        this.connection = connection;
        this.db = this.connection.db;
        this.table = options.table;

        // 创建任务表
        let createTableSql = `CREATE TABLE IF NOT EXISTS ${this.table} (id INTEGER PRIMARY KEY ASC AUTOINCREMENT,` +
            `name TEXT,params TEXT,queue TEXT,attempts TEXT,timeout INT,delay TIMESTAMP,` +
            `priority INT,status TEXT,enqueued TIMESTAMP,dequeued TIMESTAMP,ended TIMESTAMP, ` +
            `result TEXT,created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,` +
            `updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP); `;

        const self = this;

        this.db.run(createTableSql, function (err) {
            if (err) {
                console.error('创建表错误', createTableSql, err);
                throw err;
            }
        });

        // 索引不存在则创建索引
        if (options.index !== false) {
            const indexName = 'status_queue_priority';
            const queryIndexSql = `SELECT * FROM sqlite_master WHERE type = 'index' and name = '${indexName}';`;
            const createIndexSql = `CREATE INDEX ${indexName} on ${this.table} (status, queue, priority);`;

            this.db.get(queryIndexSql, function (err, row) {
                if (err) {
                    throw err;
                }
                if (row) {
                    return;
                }

                self.db.run(createIndexSql, function (err) {
                    if (err) {
                        console.error('创建索引错误', createIndexSql, err);
                        throw err;
                    }
                });
            });
        }
    }

    /**
     * 入队
     * @param {*} name 
     * @param {*} params 
     * @param {*} options 
     * @param {*} callback 
     */
    enqueue(name, params, options, callback) {
        if (!callback && typeof options === 'function') {
            callback = options;
            options = {};
        }

        const job = this.job({
            name: name,
            params: params,
            queue: this.name,
            attempts: parseAttempts(options.attempts),
            timeout: parseTimeout(options.timeout),
            delay: options.delay,
            priority: options.priority
        });

        job.enqueue(callback);
    };

    /**
     * 出队
     * @param {*} options 
     * @param {*} callback 
     */
    dequeue(options, callback) {
        const self = this;

        if (callback === undefined) {
            callback = options;
            options = {};
        }

        // 查到所有任务
        let querySql = `select * from ${this.table} where status = '${Job.QUEUED}' and delay <= ${Date.now()}`;
        if (!this.options.universal) {
            querySql += ` and queue = '${this.name}'`;
        }
        if (options.minPriority !== undefined) {
            querySql += ` and priority >= ${options.minPriority}`;
        }
        if (options.callbacks !== undefined) {
            const callback_names = Object.keys(options.callbacks);

            let names = ``;
            for (let i = 0; i < callback_names.length; i++) {
                names += `'${callback_names[i]}'`;
            }
            querySql += ` and name in (${names})`;
        }
        querySql += ` ORDER BY priority DESC, id ASC;`;


        this.db.each(querySql, (err, row) => {
            if (err) {
                console.log('消费时查询任务错误', querySql, err);
                return callback(err);
            }

            const id = row.id;

            if (!id) {
                return callback();
            }

            const newStatus = Job.DEQUEUED;
            const dequeued = Date.now();
            const updateSql = `update ${this.table} set status = '${newStatus}', dequeued=${dequeued} where id = ${id} `;

            this.db.run(updateSql, (err) => {
                if (err) {
                    console.log('更新任务状态出错', updateSql, err);
                    return callback(err);
                }

                // XXX 更新执行后取不到结果数据
                callback(null, self.job(Object.assign(row, { status: newStatus, dequeued })));
            });
        });
    };

    /**
    * 根据id获取某个任务，并执行回调
    * @param {*} id 
    * @param {*} callback 
    */
    get(id, callback) {
        const self = this;

        let querySql = `select * from ${this.table} where id = ${id}`;
        if (!this.options.universal) {
            querySql += ` queue = '${this.name}'`;
        }

        this.db.each(querySql, (err, row) => {
            if (err) {
                console.log('查询某个任务错误', querySql, err);
                callback(err);
            }

            const job = new Job(self.db, self.table, row);
            callback(null, job);
        });
    };

    /**
     * 实例化job对象
     * @param {*} data 
     * @returns 
     */
    job(data) {
        return new Job(this.db, this.table, data);
    };
}

module.exports = Queue;
