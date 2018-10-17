var express = require('express');
var cors = require('cors');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');

var routes = require('./routes/index');
var api = require('./routes/api');
var api1 = require('./routes/api1');
var monitor = require("./routes/monitor");

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'myownsecret',
  cookie: { maxAge: 6000000 },
  resave: false,
  saveUninitialized: false
}));

//--------------
// cors stuff
//--------------
originsWhiteList = ['http://localhost:4200', 'http://r2d2', 'http://192.168.0.127'];
if (process.env['frontend']) {
  originsWhiteList = JSON.parse(process.env['frontend']);
}
var corsOptions = {
  origin: function (origin, callback) {
    isWhiteListed = originsWhiteList.indexOf(origin) !== -1;
    callback(null, isWhiteListed);
  },
  credentials: true
};
//noinspection TypeScriptValidateTypes
app.use(cors(corsOptions));



app.use('/', routes);
app.use('/api',  api);
app.use('/api1', api1);
app.use("/monitorstuff", monitor);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
