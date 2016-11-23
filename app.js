
var fs = require("fs");
var CLIENT_ID = process.env.CLIENT_ID;
var CLIENT_SECRET = process.env.CLIENT_SECRET;
var dbUser = process.env.DB_USER;
var dbPass = process.env.DB_PASSWORD;
var bearer = process.env.BEARER;
var access_url = process.env.ACCESS_URL;
var callback_url = process.env.CALLBACK_URL;

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var request = require('request');
var cron = require('node-cron');

var index = require('./routes/index');
var currentstatus = require('./routes/currentstatus');
var db;
const MongoClient = require('mongodb').MongoClient;
var mongoDbUrl = 'mongodb://' + dbUser + ":" + dbPass +
"@ds151707.mlab.com:51707/energywebapp";
var app = express();

var devices = [ 'Chandelier',
                'Home Theater Front Lights',
                'Second Basement Dimmer',
                'Bedroom Overhead',
                'Buffet Lights'
              ]


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
  redirect_uri: callback_url + '/callback',
  scope: 'app',
  state: '3(#0/!~'
});

//Exposes DB instance to other modules
app.use(function(req,res,next){
    req.db = db;
    next();
});

//Exposes bearer to modules
app.use(function(req,res,next){
    req.bearer = bearer;
    next();
});

app.use(function(req,res,next){
    req.access_url = access_url;
    next();
});


app.get('/auth', function (req, res) {
  res.redirect(authorization_uri);
});

// Callback service parsing the authorization token and asking for the access token
app.get('/callback', function (req, res) {
  var code = req.query.code;
  // console.log('/callback got code' + code);
  oauth2.authorizationCode.getToken({
    code: code,
    redirect_uri: callback_url + '/callback'
  }, saveToken);

  function saveToken(error, result) {
    if (error) { console.log('Access Token Error', error.message); }

    // result.access_token is the token, get the endpoint
    bearer = result.access_token;
    process.env['BEARER'] = bearer;
    var sendreq = { method: "GET", uri: endpoints_uri + "?access_token=" +
     result.access_token };
    request(sendreq, function (err, res1, body) {
      var endpoints = JSON.parse(body);
      // we just show the final access URL and Bearer code
      access_url = endpoints[0].uri
      process.env['ACCESS_URL'] = access_url
      //res.send('<pre>' + access_url + '</pre><br><pre>Bearer ' + bearer + '</pre>');

      res.redirect('/currentstatus')

    });
  }
});

app.get('/initialize', function (req, res) {
  res.send('<a href="/auth">Connect with SmartThings</a>');
});


//use index.js for this route
app.use('/', index);

//use currentstatus.js for this route
app.use('/currentstatus', currentstatus);

app.post('/switchon', function(req, res){
  console.log(req.body);

  var json = req.body;
  var dName = json.deviceName;
  var dTimeOn = json.timeOn;

  console.log("DeviceName: " + json.deviceName);
  console.log("TimeOn: " + json.dTimeOn);

  db.collection('durations').findAndModify(
    {deviceName: dName}, // query
    [['_id','asc']],  // sort order
    {$set: {
      lastOnTime: dTimeOn,
      status: "on"
    }},
    {}, // options
    function(err, object) {
        if (err){
            console.warn(err.message);  // returns error if no matching object found
        }else{
            console.dir(object);
            res.send(dName + " timeOn Updated");
        }
    });
});


//Example of actually accepting JSON and inserting it into DB
//If you run this and use Postman to send yourself JSON data, it works
app.post('/switchoff', function(req, res){
  console.log(req.body);

  var json = req.body;
  var dTimeOff = json.timeOff;
  var dDuration = parseInt(json.duration);
  var dName = json.deviceName;

  //Retreive current record to get Durations to add to
  db.collection('durations').findOne(
    {deviceName: dName}, // query
    function(err, object) {
        if (err){
            console.warn(err.message);  // returns error if no matching object found
        }else{
            console.dir(object);
            //Retrieve the durations from the object
            //Add new duration
            var dayDuration = parseInt(object.dailyDuration) + dDuration;
            var wDuration = parseInt(object.weeklyDuration) + dDuration;
            var mDuration = parseInt(object.monthlyDuration) + dDuration;

            //Time to update the record
            db.collection('durations').findAndModify(
              {deviceName: dName}, // query
              [['_id','asc']],  // sort order
              {$set: {
                lastOffTime: dTimeOff,
                dailyDuration: dayDuration,
                weeklyDuration: wDuration,
                monthlyDuration: mDuration,
                status: "off"
              }},
              {}, // options
              function(err, object) {
                  if (err){
                      console.warn(err.message);  // returns error if no matching object found
                  }else{
                      console.dir(object);
                  }
              });
        }
    });

  console.log("DeviceName: " + json.deviceName);
  console.log("Duration: " + json.duration);

  db.collection('switch_test').insert(json, function(err, doc) {
      console.log(doc);
  if(err) throw err;
  res.send(doc + "\nInserted");
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

//Initialize the DB connection, and then launch the app
MongoClient.connect(mongoDbUrl, function(err, database) {
  if(err) throw err;

  db = database;
  console.log('DB Initilized');
});

//Daily clearing of dailyDuration
cron.schedule('0 0 * * *', function(){
  for(var i = 0; i < devices.length; i++) {
  db.collection('durations').findAndModify(
    {deviceName: devices[i]}, // query
    [['_id','asc']],  // sort order
    {$set: {
      dailyDuration: 0
    }},
    {}, // options
    function(err, object) {
        if (err){
            console.warn(err.message);  // returns error if no matching object found
        }else{
            console.dir(object);
        }
    });
  }
});

//Weekly clearing of weeklyDuration
cron.schedule('0 0 * * 0', function(){
  for(var i = 0; i < devices.length; i++) {
  db.collection('durations').findAndModify(
    {deviceName: devices[i]}, // query
    [['_id','asc']],  // sort order
    {$set: {
      weeklyDuration: 0
    }},
    {}, // options
    function(err, object) {
        if (err){
            console.warn(err.message);  // returns error if no matching object found
        }else{
            console.dir(object);
        }
    });
  }
});

//Monthly clearing of monthlyDuration
cron.schedule('0 0 1 * *', function(){
  for(var i = 0; i < devices.length; i++) {
  db.collection('durations').findAndModify(
    {deviceName: devices[i]}, // query
    [['_id','asc']],  // sort order
    {$set: {
      monthlyDuration: 0
    }},
    {}, // options
    function(err, object) {
        if (err){
            console.warn(err.message);  // returns error if no matching object found
        }else{
            console.dir(object);
        }
    });
  }
});


module.exports = app;
app.locals.moment = require('moment');
