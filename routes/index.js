var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res){
  MongoClient.connect(mongoDbUrl, (err, database) => {
    if (err) return console.log(err)
    db = database
    console.log('DB Connected!')
    db.collection('switch_test').find().toArray(function(err, docs) {
      console.log("RETRIEVED " + docs);
      if(err) throw err;
      res.send(docs);
      db.close();
    });
  });
});

module.exports = router;
