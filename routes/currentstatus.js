var express = require('express');
var router = express.Router();

router.get('/currentstatus', function (req, res){
  var options = {
    method: "GET",
    uri: access_url + "/switches",
    headers: {
      'Authorization': 'Bearer' + bearer
    }
  };

  request(options, function (error, response, body) {
      if (!error && response.statusCode == 200) {
          res.send(body)
       }
  })
});

module.exports = router;
