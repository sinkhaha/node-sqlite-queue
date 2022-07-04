'use strict';

const { EventEmitter } = require('events');

/**
 * 消费者
 */
class Worker extends EventEmitter {
    constructor(queues, options) {
        super();

        options || (options = {});

        this.empty = 0;
        this.queues = queues || [];
        this.interval = options.interval || 5000;

        this.callbacks = options.callbacks || {};
        this.strategies = options.strategies || {};
        this.universal = options.universal || false;

        // Default retry strategies
        this.strategies.linear || (this.strategies.linear = linear);
        this.strategies.exponential || (this.strategies.exponential = exponential);

        // This worker will only process jobs of this priority or higher
        this.minPriority = options.minPriority;

    }

    /**
     * 注册队列消费后要执行的方法
     * @param {*} callbacks 
     */
    register(callbacks) {
        for (let name in callbacks) {
            this.callbacks[name] = callbacks[name];
        }
    };

    /**
     * 开始消费
     * @returns 
     */
    start() {
        if (this.queues.length === 0) {
            return setTimeout(this.start.bind(this), this.interval);
        }
        this.working = true;
        this.poll();
    };

    /**
     * 停止消费
     * @param {*} callback 
     * @returns 
     */
    stop(callback) {
        const self = this;

        function done() {
            if (callback) callback();
        }

        if (!this.working) done();
        this.working = false;

        if (this.pollTimeout) {
            clearTimeout(this.pollTimeout);
            this.pollTimeout = null;
            return done();
        }

        this.once('stopped', done);
    };

    /**
    * 添加策略
    * @param {*} strategies 
    */
    strategies(strategies) {
        for (let name in strategies) {
            this.strategies[name] = strategies[name];
        }
    };

    /**
     * 添加队列
     * @param {*} queue 
     */
    addQueue(queue) {
        if (!this.universal) {
            this.queues.push(queue);
        }
    };

    /**
     * 轮询执行
     * @returns 
     */
    poll() {
        if (!this.working) {
            return this.emit('stopped');
        }

        const self = this;

        this.dequeue(function (err, job) {
            if (err) return self.emit('error', err);

            if (job) {
                self.empty = 0;
                self.emit('dequeued', job.data);
                self.work(job);
            } else {
                self.emit('empty');

                if (self.empty < self.queues.length) {
                    self.empty++;
                }

                if (self.empty === self.queues.length) {
                    // All queues are empty, wait a bit
                    self.pollTimeout = setTimeout(function () {
                        self.pollTimeout = null;
                        self.poll();
                    }, self.interval);
                } else {
                    self.poll();
                }
            }
        });
    };

    /**
     * 出队
     * @param {*} callback 
     */
    dequeue(callback) {
        let queue = this.queues.shift();
        this.queues.push(queue);
        queue.dequeue({ minPriority: this.minPriority, callbacks: this.callbacks }, callback);
    };

    /**
     * 
     * @param {*} job 
     */
    work(job) {
        const self = this;
        let finished = false;

        let timer;
        if (job.data.timeout) {
            timer = setTimeout(function () {
                done(new Error('timeout'));
            }, job.data.timeout);
        }

        function done(err, result) {
            // It's possible that this could be called twice in the case that a job times out,
            // but the handler ends up finishing later on
            if (finished) {
                return;
            } else {
                finished = true;
            }

            timer && clearTimeout(timer);
            self.emit('done', job.data);

            if (err) {
                self.error(job, err, function (err) {
                    if (err) return self.emit('error', err);

                    self.emit('failed', job.data);
                    self.poll();
                });
            } else {
                job.complete(result, function (err) {
                    if (err) return self.emit('error', err);

                    console.log('==完成==', result);
                    self.emit('complete', job.data);
                    self.poll();
                });
            }
        };

        this.process(job.data, done);
    };


    process(data, callback) {
        const func = this.callbacks[data.name];

        if (!func) {
            callback(new Error('No callback registered for `' + data.name + '`'));
        } else {
            func(data.params, callback);
        }
    };

    /**
     * 错误重试
     * @param {*} job 
     * @param {*} err 
     * @param {*} callback 
     */
    error(job, err, callback) {
        const attempts = job.data.attempts;
        const remaining = 0;

        if (attempts) {
            remaining = attempts.remaining = (attempts.remaining || attempts.count) - 1;
        }

        if (remaining > 0) {
            const strategy = this.strategies[attempts.strategy || 'linear'];
            if (!strategy) {
                strategy = linear;

                console.error('No such retry strategy: `' + attempts.strategy + '`');
                console.error('Using linear strategy');
            }

            if (attempts.delay !== undefined) {
                const wait = strategy(attempts);
            } else {
                const wait = 0;
            }

            job.delay(wait, callback)
        } else {
            job.fail(err, callback);
        }
    };

}

// Strategies

function linear(attempts) {
    return attempts.delay;
}

function exponential(attempts) {
    return attempts.delay * (attempts.count - attempts.remaining);
}

module.exports = Worker;
