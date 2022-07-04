
// import { Database } from 'sqlite3';
// import { EventEmitter } from 'events';

// interface IQueueOptions {
//     table: string,
//     universal: boolean,
//     index: boolean,
// }

// interface IWorkerOptions {
//     table: string,
//     universal: boolean,
//     interval: number,
//     callbacks: object,
//     strategies: object,
//     minPriority: number
// }

// export class Connection {
//     constructor(filename: string, mode?: string);
//     db: typeof Database;
//     queue(name: string, options: IQueueOptions): Queue;
//     worker(queues: string | string[], options): Worker;
//     close(): void;
// }

// export class Queue {
//     constructor(connection: Connection, name: string, options: IQueueOptions);
//     enqueue(name: string, params: any, options, callback): void;
//     dequeue(options, callback): void;
//     get(id: number, callback): void;
//     job(data): Job;
// }

// export class Worker extends EventEmitter {
//     constructor(queues: string[], options: IWorkerOptions);
//     register(callbacks: { [key: string]: Function }): void;
//     start(): void;
//     stop(callback: Function): void;
//     strategies(strategies: { [key: string]: number }): void;
//     addQueue(queue): void;
//     poll(): void;
//     dequeue(callback: Function): void;
//     work(job: Job): void;
//     process(data, callback: Function): void;
//     error(job: Job, err: Error, callback: Function): void;
// }

// export class Job extends EventEmitter {

//     constructor(db: typeof Database, table: string, data);
//     enqueue(callback: Function): void;
//     cancel(callback: Function): void;
//     complete(result, callback: Function): void;
//     fail(err: Error, callback: Function): void;
//     delay(delay: number, callback: Function): void;
// }
