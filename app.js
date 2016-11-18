
var fs = require("fs");
var CLIENT_ID = process.env.CLIENT_ID;
var CLIENT_SECRET = process.env.CLIENT_SECRET;
var dbUser = process.env.DB_USER;
var dbPass = process.env.DB_PASSWORD;
var bearer;
var access_url;

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var request = require('request');

var index = require('./routes/index');
var users = require('./routes/users');
var db;
const MongoClient = require('mongodb').MongoClient;
var mongoDbUrl = 'mongodb://' + dbUser + ":" + dbPass +
"@ds151707.mlab.com:51707/energywebapp";
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var endpoints_uri = 'https://graph.api.smartthings.com/api/smartapps/endpoints';

const creds = {
  client: {
    id: CLIENT_ID,
    secret: CLIENT_SECRET
  },
  auth: {
    tokenHost: 'https://graph.api.smartthings.com'
  }
}

var oauth2 = require('simple-oauth2').create(creds);

// Authorization uri definition
var authorization_uri = oauth2.authorizationCode.authorizeURL({
  redirect_uri: 'https://energywebapp.herokuapp.com/callback',
  scope: 'app',
  state: '3(#0/!~'
});


// Initial page redirecting to Github
app.get('/auth', function (req, res) {
  res.redirect(authorization_uri);
});

// Callback service parsing the authorization token and asking for the access token
app.get('/callback', function (req, res) {
  var code = req.query.code;
  // console.log('/callback got code' + code);
  oauth2.authorizationCode.getToken({
    code: code,
    redirect_uri: 'http://localhost:3000/callback'
  }, saveToken);

  function saveToken(error, result) {
    if (error) { console.log('Access Token Error', error.message); }

    // result.access_token is the token, get the endpoint
    bearer = result.access_token
    credentials.bearer = bearer
    var sendreq = { method: "GET", uri: endpoints_uri + "?access_token=" +
     result.access_token };
    request(sendreq, function (err, res1, body) {
      var endpoints = JSON.parse(body);
      // we just show the final access URL and Bearer code
      access_url = endpoints[0].uri
      credentials.access_url = access_url
      //res.send('<pre>' + access_url + '</pre><br><pre>Bearer ' + bearer + '</pre>');

      fs.writeFile('data/credentials2.json', JSON.stringify(credentials),  function(err) {
         if (err) {
            return console.error(err);
         }

         console.log("Data written successfully!");
         console.log("Let's read newly written data");
         fs.readFile('input.txt', function (err, data) {
            if (err) {
               return console.error(err);
            }
            console.log("Asynchronous read: " + data.toString());
         });
      });


      res.redirect('/')

    });
  }
});

app.get('/initialize', function (req, res) {
  res.send('<a href="/auth">Connect with SmartThings</a>');
});

app.get('/', function (req, res){
  var options = {
    method: "GET",
    uri: access_url + "/switches",
    headers: {
      'Authorization': 'Bearer' + bearer
    }
  };


  request(options, function (error, response, body) {
      if (!error && response.statusCode == 200) {
          res.send(body) // Print the google web page.
       }
  })
});

//Example of actually accepting JSON and inserting it into DB
//If you run this and use Postman to send yourself JSON data, it works
app.post('/switchevent', function(req, res){
  console.log(req.body);

  var json = req.body;

  MongoClient.connect(mongoDbUrl, (err, database) => {
    if (err) return console.log(err)
    db = database
    console.log('DB Connected!')
    db.collection('switch_test').insert(json, function(err, doc) {
        console.log(doc);
    if(err) throw err;
    res.send(doc + "\nInserted");
    });
  });
});


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
