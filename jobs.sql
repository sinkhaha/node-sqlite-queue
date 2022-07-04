-- ----------------------------
-- Table structure for jobs
-- ----------------------------
DROP TABLE IF EXISTS "jobs";
CREATE TABLE jobs (
	id INTEGER PRIMARY KEY ASC AUTOINCREMENT,
	name TEXT,
	params TEXT,
	queue TEXT,
	attempts TEXT,
	timeout INT,
	delay DATETIME,
	priority INT,
	status TEXT,
	enqueued DATETIME,
	dequeued DATETIME,
	ended DATETIME,
    result TEXT 
);