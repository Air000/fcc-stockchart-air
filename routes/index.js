var express = require('express');
var Promise = require('bluebird');
var request = Promise.promisifyAll(require('request'));
// var request = require("request");
var router = express.Router();

router.get('/test', function(req, res, next) {
    var stocks = ["AAPL"] //, "GOOG", "TSLA"];
    var urls = [];
    stocks.forEach(function(stock) {
       urls.push("https://www.quandl.com/api/v3/datasets/WIKI/"+stock+".json?api_key=54xxcEe2PXpMpYTmXP7a&start_date=2016-04-18&end_date=2016-04-22&column_index=4"); 
    });
    // console.log(urls);
    processAllUrls(urls, function(data) {
        res.render('test', { data: data });
        console.log(JSON.stringify(data));
    });
})
/* GET home page. */
router.get('/', function(req, res, next) {
    var stocks = ["AAPL", "GOOG", "TSLA"];
    var urls = [];
    stocks.forEach(function(stock) {
       urls.push("https://www.quandl.com/api/v3/datasets/WIKI/"+stock+".json?api_key=54xxcEe2PXpMpYTmXP7a&start_date=2012-01-01&column_index=4"); 
    });
    // console.log(urls);
    processAllUrls(urls, function(data) {
        res.render('index', { data: data });
        
    });
    
    
});

function processAllUrls(Urls, callback) {    
    return Promise.map(Urls, function(url){ 
        return processUrl(url); 
    })
    .then(function(data){
        var stocks = [];
        data.forEach(function(item) {
            item.body.dataset.data.reverse(); //NVD3 requires your x axis data to be sorted from earliest to latest, not the other way 
            stocks.push({key: item.body.dataset.dataset_code, values: item.body.dataset.data.map(function (v) {
                
                return {x: v[0], y: v[1]};
                // return [Date.parse(v[0]), v[1]]
            })});
            
        });
        callback(stocks);
        // console.log(JSON.stringify(stocks));
        
    })
    .catch(function(e){
        // feed server was down, etc
        console.log("error:", e);
    })
}

function processUrl(url) {
    return request.getAsync({url: url, json: true});
}
module.exports = router;
