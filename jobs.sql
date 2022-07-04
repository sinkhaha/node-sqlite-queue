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
	delay TIMESTAMP,
	priority INT,
	status TEXT,
	enqueued TIMESTAMP,
	dequeued TIMESTAMP,
	ended TIMESTAMP,
    result TEXT,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);