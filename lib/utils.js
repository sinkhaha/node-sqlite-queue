'use strict';

function parseTimeout(timeout) {
    return timeout === undefined
        ? undefined
        : parseInt(timeout, 10);
}

function parseAttempts(attempts) {
    if (attempts === undefined) {
        return undefined;
    }

    if (typeof attempts !== 'object') {
        throw new Error('attempts must be an object');
    }

    const result = {
        count: parseInt(attempts.count, 10)
    };

    if (attempts.delay !== undefined) {
        Object.assign(result, {
            delay: parseInt(attempts.delay, 10),
            strategy: attempts.strategy,
        });
    }

    return result;
}

module.exports = {
    parseTimeout,
    parseAttempts,
}
