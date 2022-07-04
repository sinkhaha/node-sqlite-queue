const events = require('events');
const util = require('util');

module.exports = Job;

/**
* Job retry specification
* @typedef {Object} Job~Attempts
* @property {string} strategy - Name of {@link Worker~strategyCallback} to use on retry
* @property {number} count - total number of attempts so far
* @property {number} delay - a delay constant for use in determining a delay.  In default linear strategy, this will be the delay between attempts
*/

/**
* @constructor
* @param {string} table - The table to save the job to
* @param {Object} data - The Job data
*/
function Job(db, table, data) {
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

util.inherits(Job, events.EventEmitter);

Job.QUEUED = 'queued';
Job.DEQUEUED = 'dequeued';
Job.COMPLETE = 'complete';
Job.FAILED = 'failed';
Job.CANCELLED = 'cancelled';

Job.prototype.save = function (callback) {
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

Job.prototype.cancel = function (callback) {
    if (this.data.status !== Job.QUEUED) {
        return callback(new Error('Only queued jobs may be cancelled'));
    }

    this.data.status = Job.CANCELLED;
    this.data.ended = new Date().getTime();

    this.save(callback);
};

Job.prototype.complete = function (result, callback) {
    this.data.status = Job.COMPLETE;
    this.data.ended = new Date().getTime();
    this.data.result = result;

    console.log('===complete===', this.data);

    this.save(callback);
};

/**
 * 消费错误时执行该函数保存错误信息
 * @param {*} err 
 * @param {*} callback 
 */
Job.prototype.fail = function (err, callback) {
    this.data.status = Job.FAILED;
    this.data.ended = new Date().getTime();

    const errRst = {
        message: err.message || '',
        stack: err.stack || ''
    }
    this.data.result = JSON.stringify(errRst);

    this.save(callback);
};

Job.prototype.enqueue = function (callback) {
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

Job.prototype.delay = function (delay, callback) {
    this.data.delay = new Date(new Date().getTime() + delay);

    this.enqueue(callback);
};

function JobData() { }

