'use strict';

const { EventEmitter } = require('events');

/**
 * 任务
 */
class Job extends EventEmitter {
    static QUEUED = 'queued';
    static DEQUEUED = 'dequeued';
    static COMPLETE = 'complete';
    static FAILED = 'failed';
    static CANCELLED = 'cancelled';

    constructor(db, table, data) {
        super();

        this.db = db;
        this.table = table;

        if (data) {
            // Convert plain object to JobData type
            data.__proto__ = JobData.prototype;
            this.data = data;
        } else {
            this.data = new JobData();
        }
    }

    /**
     * 入队
     * @param {*} callback 
     */
    enqueue(callback) {
        if (this.data.delay === undefined) {
            this.data.delay = new Date().getTime();
        }

        if (this.data.priority === undefined) {
            this.data.priority = 0;
        }

        this.data.status = Job.QUEUED;
        this.data.enqueued = new Date().getTime();

        this.save(callback);
    };

    /**
     * 插入数据到任务表
     * @param {*} callback 
     */
    save(callback) {
        const self = this;

        // TODO 有id则更新，没有则插入
        const insertSql = `INSERT OR REPLACE INTO ${this.table} (id, name, params, queue, attempts, timeout, delay, priority,status, enqueued,dequeued,ended,result) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`;
        const { id, name, params = '', queue, attempts, timeout, delay, priority, status, enqueued, dequeued, ended, result } = this.data;

        const values = [id, name, typeof params === 'object' ? JSON.stringify(params) : params, queue, typeof attempts == 'object' ? JSON.stringify(attempts) : attempts, timeout, delay, priority, status, enqueued, dequeued, ended, result];
        this.db.run(insertSql, values, (err) => {
            if (err) {
                console.log('保存数据错误', err);
                throw err;
            }

            console.log('插入数据库id', id);

            callback && callback(null, self);
        });
    };

    /**
     * 修改任务为取消状态
     * @param {*} callback 
     * @returns 
     */
    cancel(callback) {
        if (this.data.status !== Job.QUEUED) {
            return callback(new Error('Only queued jobs may be cancelled'));
        }

        this.data.status = Job.CANCELLED;
        this.data.ended = new Date().getTime();

        this.save(callback);
    };

    /**
     * 修改任务为完成状态
     * @param {*} result 
     * @param {*} callback 
     */
    complete(result, callback) {
        this.data.status = Job.COMPLETE;
        this.data.ended = new Date().getTime();
        this.data.result = result;

        console.log('===complete===', this.data);

        this.save(callback);
    };

    /**
     * 修改任务为失败状态，并保存错误信息
     * @param {*} err 
     * @param {*} callback 
     */
    fail(err, callback) {
        this.data.status = Job.FAILED;
        this.data.ended = new Date().getTime();

        const errRst = {
            message: err.message || '',
            stack: err.stack || ''
        }
        this.data.result = JSON.stringify(errRst);

        this.save(callback);
    };

    /**
     * 入队并延迟至行
     * @param {*} delay 
     * @param {*} callback 
     */
    delay(delay, callback) {
        this.data.delay = new Date(new Date().getTime() + delay);

        this.enqueue(callback);
    };
}

class JobData { }

module.exports = Job;
