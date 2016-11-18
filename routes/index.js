var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res){
  var db = req.db;
  db.collection('switch_test').find().toArray(function(err, docs) {
    console.log("RETRIEVED " + docs);
    if(err) throw err;
    res.send(docs);
    db.close();
  });
});

module.exports = router;
