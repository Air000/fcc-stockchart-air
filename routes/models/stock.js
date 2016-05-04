var mongoose = require('mongoose');

var stockSchema = mongoose.Schema({
    stockCode:   String
});

module.exports = mongoose.model('Stock', stockSchema);