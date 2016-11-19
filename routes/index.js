var express = require('express');
var request = require('request');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res){
  var db = req.db;
  db.collection('switch_test').find().toArray(function(err, docs) {
    console.log("RETRIEVED " + docs);
    if(err) throw err;
    res.send(docs);
  });
});

router.get('/currentstatus', function (req, res){
  var access_url = req.access_url;
  var bearer = req.bearer;
  var options = {
    method: "GET",
    uri: access_url + "/switches",
    headers: {
      'Authorization': 'Bearer' + bearer
    }
  };

  request(options, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        console.log(body + "\nType: " + typeof body)
        res.render('currentstatus', {
          "itemlist" : body
      });
       }
  })
});

module.exports = router;
