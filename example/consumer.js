const sqliteQ = require('../lib/index');
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
            console.log('处理消息', params, typeof params);
            // callback第1个参数是err，第2个参数是结果，会把result更新到数据库的消息中
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

