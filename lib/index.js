const Connection = require('./connection');

module.exports = function (filename, mode) {
    return new Connection(filename, mode);
};
