const Job = require('./job');

module.exports = Queue;

function Queue(connection, name, options) {
    if (typeof name === 'object' && options === undefined) {
        options = name;
        name = undefined;
    }

    options || (options = {});
    options.table || (options.table = 'jobs'); // TODO
    options.universal || (options.universal = false);

    this.connection = connection;
    this.name = name || 'default';
    this.options = options;

    this.db = this.connection.db;
    this.table = options.table;

    // 创建sqlite任务表 跟 索引
    this.db.serialize();

    // TODO 时间类型
    let query = `CREATE TABLE IF NOT EXISTS ${options.table} (id INTEGER PRIMARY KEY ASC AUTOINCREMENT,` +
        `name TEXT,params TEXT,queue TEXT,attempts TEXT,timeout INT,delay DATETIME,` +
        `priority INT,status TEXT,enqueued DATETIME,dequeued DATETIME,ended DATETIME,result TEXT); `;

    this.db.run(query, (err) => {
        if (err) {
            console.log('建表错误', err);
            throw err;
        }
    });

    // TODO 创建索引 先判断索引不存在再创建
    // if (options.index !== false) {
    //     // db.index(this.table);
    //     const indexSql = `CREATE INDEX status_queue_priority on ${options.table} (status, queue, priority);`;
    //     this.db.run(indexSql);
    //     console.log('==创建索引成功');
    // }
}

Queue.prototype.job = function (data) {
    return new Job(this.db, this.table, data);
};

Queue.prototype.get = function (id, callback) {
    const self = this;

    let querySql = `select * from ${this.table} where id = ${id}`;
    if (!this.options.universal) {
        querySql += ` queue = '${this.name}'`;
    }

    this.db.each(querySql, (err, row) => {
        if (err) {
            console.log('查询某个任务错误', id, err);
            callback(err);
        }

        const job = new Job(self.db, self.table, row);
        callback(null, job);
    });
};

Queue.prototype.enqueue = function (name, params, options, callback) {
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

Queue.prototype.dequeue = function (options, callback) {
    const self = this;

    if (callback === undefined) {
        callback = options;
        options = {};
    }

    // TODO 查到所有任务
    let querySql = `select * from ${this.table} where status = '${Job.QUEUED}' and delay <= ${new Date().getTime()}`;
    if (!this.options.universal) {
        querySql += ` and queue = '${this.name}'`;
    }
    if (options.minPriority !== undefined) {
        querySql += ` and priority >= ${options.minPriority}`;
    }
    if (options.callbacks !== undefined) {
        const callback_names = Object.keys(options.callbacks);

        let ids = ``;
        for (let i = 0; i < callback_names.length; i++) {
            ids += `'${callback_names[i]}'`;
        }
        querySql += ` and name in (${ids})`;
    }
    querySql += ` ORDER BY priority DESC, id ASC;`;

    console.log('消费时查询的sql语句', querySql);

    this.db.each(querySql, (err, row) => {
        if (err) {
            console.log('消费时查询任务错误', err);
            return callback(err);
        }

        const id = row.id;
        console.log('查询到要消费的任务', id, row);

        if (!id) {
            return callback();
        }

        // TODO 更新状态 用不用保持原子性
        const newStatus = Job.DEQUEUED;
        const dequeued = new Date().getTime();
        const updateSql = `update ${this.table} set status = '${newStatus}', dequeued=${dequeued} where id = ${id} `;

        this.db.run(updateSql, (result, err) => {
            if (err) {
                console.log('更新任务状态出错', err);
                return callback(err);
            }

            // TODO 这里更新好像取不到结果数据
            callback(null, self.job(Object.assign(row, { status: newStatus, dequeued })));
        });
    });
};

// Helpers

function parseTimeout(timeout) {
    if (timeout === undefined) return undefined;
    return parseInt(timeout, 10);
}

function parseAttempts(attempts) {
    if (attempts === undefined) return undefined;

    if (typeof attempts !== 'object') {
        throw new Error('attempts must be an object');
    }

    const result = {
        count: parseInt(attempts.count, 10)
    };

    if (attempts.delay !== undefined) {
        result.delay = parseInt(attempts.delay, 10);
        result.strategy = attempts.strategy;
    }

    return result;
}
