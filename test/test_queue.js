const assert = require('assert');
const helpers = require('./helpers');
const Queue = require('../lib/queue');

const tableName = 'tb_jobs';

describe('Queue', function () {
    let queue;

    beforeEach(function () {
        queue = new Queue({ db: helpers.db });
    });

    afterEach(function (done) {
        queue.db.run(`DELETE FROM ${tableName}`, function (err) {
            if (err) {
                throw err;
            }
        });
        done();
    });

    describe('enqueue', function () {
        var job;

        beforeEach(function (done) {
            queue.enqueue('foo', { bar: 'baz' }, function (err, j) {
                job = j;

                console.log('==job.data===', job.data);
                done(err);
            });
        });

        it('has a name', function () {
            assert.equal(job.data.name, 'foo');
        });

        it('has a queue', function () {
            assert.equal(job.data.queue, 'default');
        });

        it('has params', function () {
            assert.deepEqual(job.data.params, { bar: 'baz' });
        });

        it('has an enqueued date', function () {
            assert.ok(job.data.enqueued);
            assert.ok(job.data.enqueued <= new Date().getTime());
        });

        it('has a delay timestamp', function () {
            assert.ok(job.data.delay);
            assert.ok(job.data.delay <= new Date().getTime());
        });

        it('has `queued` status', function () {
            assert.equal(job.data.status, 'queued');
        });

        // it('can be retrieved', function (done) {
        //     const querySql = `select * from ${tableName} where id = ${job.data.id}`;

        //     console.log('===querySql=', querySql);

        //     queue.db.each(querySql, (err, row) => {
        //         if (err) {
        //             console.log('查询任务错误', err);
        //             return done(err);
        //         }

        //         assert.ok(row);
        //         assert.equal(row.id, job.data.id);
        //         assert.equal(row.data.foo, job.data.foo);
        //         done();
        //     });
        // });
    });

    describe('dequeue', function () {
        var job;

        beforeEach(function (done) {
            queue.enqueue('foo1', { bar: 'baz' }, function (err) {
                if (err) return done(err);

                var delay = new Date();
                delay.setFullYear(delay.getFullYear() + 10);
                delay = delay.getTime();

                queue.enqueue('foo2', { bar: 'baz' }, { delay }, function (err) {
                    if (err) return done(err);

                    queue.dequeue(function (err, j) {
                        if (err) return done(err);

                        job = j;
                        done();
                    });
                });
            });
        });

        it('finds first job for given queue', function () {
            assert.ok(job);
            assert.equal(job.data.name, 'foo1');
            assert.equal(job.data.queue, 'default');
            assert.deepEqual(JSON.parse(job.data.params), { bar: 'baz' });
        });

        it('has a dequeued date', function () {
            assert.ok(job.data.dequeued);
            assert.ok(job.data.dequeued <= new Date().getTime());
        });

        it('has `dequeued` status', function () {
            assert.equal(job.data.status, 'dequeued');
        });

        it('does not dequeue delayed job', function () {
            queue.dequeue(function (err, j) {
                assert.equal(err, undefined);
                assert.equal(j, undefined);
            });
        });
    });
});