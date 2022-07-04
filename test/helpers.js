const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const filename = path.join(process.cwd(), 'db_test_job.db');
const db = new sqlite3.Database(filename);

module.exports = {
    db,
}