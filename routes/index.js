var express = require('express');
var Promise = require('bluebird');
var request = Promise.promisifyAll(require('request'));
var router = express.Router();
var Stock = require("../routes/models/stock");
var server = require('http').createServer();
var io = require('socket.io')(server);

io.on('connection', function(socket){
    console.log("connection");
  
  socket.emit('news', { hello: 'world' });
  socket.on('my other event', function (data) {
    console.log(data);
  });
  
  socket.on('disconnect', function(){
      console.log("disconnect");
  });
});

server.listen(8081);

router.get('/test', function(req, res, next) {
    // var stocks = ["AAPL"] //, "GOOG", "TSLA"];
    // var urls = [];
    // stocks.forEach(function(stock) {
    //   urls.push("https://www.quandl.com/api/v3/datasets/WIKI/"+stock+".json?api_key=54xxcEe2PXpMpYTmXP7a&start_date=2016-04-18&end_date=2016-04-22&column_index=4"); 
    // });
    // // console.log(urls);
    // processAllUrls(urls, function(data) {
    //     res.render('test', { data: data });
    //     console.log(JSON.stringify(data));
    // });
    io.sockets.emit('news', {msg: 'an event sent to all connected clients'});
    res.send("<h>OK</h>");
})
/* GET home page. */
router.get('/', function(req, res, next) {
    Stock.find({}, function(err, allStocks) {
        if(err) console.log(err);
        
        console.log(JSON.stringify(allStocks));
        //TODO process stocks in database
        var urls = [];
        allStocks.forEach(function(stock) {
            var start = new Date();
            start.setFullYear(start.getFullYear()-4);
            var start_date = [
              start.getFullYear(),
              ('0' + (start.getMonth() + 1)).slice(-2),
              ('0' + start.getDate()).slice(-2)
            ].join('-');
           urls.push("https://www.quandl.com/api/v3/datasets/WIKI/"+stock.stockCode+".json?api_key=54xxcEe2PXpMpYTmXP7a&start_date="+start_date+"&column_index=4"); 
        });
        // console.log(urls);
        processAllUrls(urls, function(data) {
            res.render('index', { data: data });
            
        });
    });
    // var stocks = ["AAPL", "GOOG", "TSLA"];
    // var urls = [];
    // stocks.forEach(function(stock) {
    //     var start = new Date();
    //     start.setFullYear(start.getFullYear()-4);
    //     var start_date = [
    //       start.getFullYear(),
    //       ('0' + (start.getMonth() + 1)).slice(-2),
    //       ('0' + start.getDate()).slice(-2)
    //     ].join('-');
    //   urls.push("https://www.quandl.com/api/v3/datasets/WIKI/"+stock+".json?api_key=54xxcEe2PXpMpYTmXP7a&start_date="+start_date+"&column_index=4"); 
    // });
    // // console.log(urls);
    // processAllUrls(urls, function(data) {
    //     res.render('index', { data: data });
        
    // });
    
    
});

router.post('/addStock', function(req, res) {
    // console.log(req.body);
    var start = new Date();
        start.setFullYear(start.getFullYear()-4);
        var start_date = [
          start.getFullYear(),
          ('0' + (start.getMonth() + 1)).slice(-2),
          ('0' + start.getDate()).slice(-2)
        ].join('-');
    
    var url = "https://www.quandl.com/api/v3/datasets/WIKI/"+req.body.code+".json?api_key=54xxcEe2PXpMpYTmXP7a&start_date="+start_date+"&column_index=4";
    request({
        url: url,
        json: true
    }, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        body.dataset.data.reverse();
        var stock = {key: body.dataset.dataset_code, values: body.dataset.data.map(function(v) {
            return {x: v[0], y: v[1]};
        })};
        Stock.find({stockCode: stock.key}, function(err, item) {
            if(err) console.log(err);
            if(item.length == 0) {
                //////////////save new stock to database////////////////////
                var newStock = new Stock({stockCode: stock.key});
                newStock.save(function(err){
                    if(err) console.log();
                });
                
                //////////////boardcast to clients////////////////////////////
                
                io.sockets.emit('addStock', {stock: stock, discript: body.dataset.name});
                res.send();
            }else{
                res.status(400);
                res.send(stock.key+" already exist!");
            }
        });
      }else {
          res.status(404);
          res.send(response.body);
          console.log(response.body);
          
      }
      
    });
});

router.post('/deleteStock', function(req, res) {
     console.log(req.body);
     Stock.remove({stockCode: req.body.key}, function(err) {
        if(err){
            console.log(err);
            res.status(400);
            res.send(err);
        }else {
            res.send();
        }
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
            })});
            
        });
        callback(stocks);
        
    })
    .catch(function(e){
        console.log("error:", e);
    })
}

function processUrl(url) {
    return request.getAsync({url: url, json: true});
}
module.exports = router;
