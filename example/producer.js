const sqliteQ = require('../lib/index');
const client = sqliteQ('./db_job.db');

const queueSign = 'foo'; // 队列唯一标识
const queue = client.queue(queueSign);

const queueHandleMethodName = 'testMethod'; // 队列消息消费逻辑方法名
const msg = { text: '测试入队' };

// count为错误执行次数，strategy重试策略，默认线性的linear  exponential指数型  delay为毫秒
const msgOptions = { attempts: { count: 3, delay: 3000, strategy: 'exponential' }, timeout: 5000, priority: 3 }; // timeout执行超时时间
queue.enqueue(queueHandleMethodName, msg, msgOptions, function (err, job) {
    if (err) {
        console.log('错误', err);
    } else {
        console.log('入队成功:', job.data);
        process.exit();
    }
});
