# node-sqlite-queue
* SQLite-backed job queue for Node.js.
> SQLite version of [monq](https://github.com/scttnlsn/monq), Reference monq

## Install
```bash
npm i node-sqlite-queue --save
```
## Usage
### producer
```js
const sqliteQ = require('node-sqlite-queue');
const client = sqliteQ('./db_job.db');

const queueSign = 'foo'; // 队列唯一标识
const queue = client.queue(queueSign);

const queueHandleMethodName = 'testMethod'; // 队列消息消费逻辑方法名
const msg = { text: 'test enqueue' };

const msgOptions = { 
    attempts: { count: 3, delay: 3000, strategy: 'exponential' }, 
    timeout: 5000, 
    priority: 3 
};

queue.enqueue(queueHandleMethodName, msg, msgOptions, function (err, job) {
    if (err) {
        console.log('error:', err);
    } else {
        console.log('success:', job.data);
        process.exit();
    }
});

```
### consumer
```js
const sqliteQ = require('node-sqlite-queue');
const client = sqliteQ('./db_job.db');

const queueSign = 'foo'; // 队列唯一标识
const worker = client.worker([queueSign]);

worker.register({
    /**
     * 
     * @param {*} params 消息对象
     * @param {*} callback 
     */
    testMethod: function (params, callback) {
        try {
            console.log('处理消息', params);
            callback(null, params);
        } catch (err) {
            callback(err); // 触发失败
        }
    }
});

worker.on('dequeued', function (data) {
    console.log('消费', data);
});
worker.on('failed', function (data) {
    console.log('消费失败', data);
});
worker.on('complete', function (data) {
    console.log('消费完成', data);
});
worker.on('error', function (err) {
    console.log('消费出错', err);
    worker.stop();
});

worker.start();
```
