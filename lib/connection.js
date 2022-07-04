'use strict';

const sqlite3 = require('sqlite3').verbose();
const Queue = require('./queue');
const Worker = require('./worker');
const { TABLE_NAME } = require('./enum');

class Connection {
    constructor(filename, mode) {
        this.db = new sqlite3.Database(filename, mode);
    }

    /**
     * 实例化队列
     * @param {*} name 
     * @param {*} options 
     * @returns 
     */
    queue(name, options) {
        return new Queue(this, name, options);
    }

    /**
     * 创建处理队列消息的worker
     * @param {*} queues 
     * @param {*} options 
     * @returns 
     */
    worker(queues, options) {
        const self = this;

        options || (options = {});

        const table = options.table || TABLE_NAME;

        if (queues === '*') {
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
    }

    /**
     * 关闭数据库链接
     */
    close() {
        this.db.close();
    }
}

module.exports = Connection;
