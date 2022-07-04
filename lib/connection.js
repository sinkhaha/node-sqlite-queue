const Queue = require('./queue');
const Worker = require('./worker');

const sqlite3 = require('sqlite3').verbose();

module.exports = Connection;

/**
* @constructor
* @param {string} filename - sqlite数据库文件名
* @param {number} mode - mode为sqlite3.OPEN_READWRITE 或 sqlite3.OPEN_CREATE
*/
function Connection(filename, mode) {
    this.db = new sqlite3.Database(filename, mode);
}

/**
* Returns a new {@link Worker}
* @param {string[]|string} queues - list of queue names, a single queue name, or '*' for a universal worker
* @param {Object} options - an object with worker options
*/
Connection.prototype.worker = function (queues, options) {
    const self = this;

    options || (options = {});

    const table = options.table || 'jobs';

    if (queues === "*") {
        options.universal = true;

        queues = [self.queue('*', {
            universal: true,
            table: table
        })];
    } else {
        if (!Array.isArray(queues)) {
            queues = [queues];
        }

        queues = queues.map(function (queue) {
            if (typeof queue === 'string') {
                queue = self.queue(queue, {
                    table: table
                });
            }

            return queue;
        });
    }

    return new Worker(queues, options);
};

Connection.prototype.queue = function (name, options) {
    return new Queue(this, name, options);
};

Connection.prototype.close = function () {
    this.db.close();
};
