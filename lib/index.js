const Connection = require('./connection');

module.exports = function (filename, options) {
    return new Connection(filename, options);
};
