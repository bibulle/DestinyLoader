import * as express from "express";
import bodyParser = require("body-parser");
import cookieParser = require("cookie-parser");
const compression = require('compression');
import favicon = require("serve-favicon");

const cors = require('cors');
import * as path from "path";
const passport = require('passport');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const flash = require('connect-flash');

// const debug = require('debug')('server:debug:app');
// const error = require('debug')('server:error:app');

import { defaultRouter } from "./routes";
import { apiRouter } from "./routes/api";
import { api1Router } from "./routes/api1";
import { monitorRouter } from "./routes/monitor";
import { authenticationRouter } from "./routes/authent";

import { Config } from "./utils/config/config";
import { DestinyDb } from "./utils/destinyDb/destinyDb";

// Init session data store
let store = new MongoDBStore({
  uri: Config.mongoUrl + "/" + DestinyDb.DB_NAME,
  collection: 'mySessions'
});
// Catch errors
store.on('error', function(error) {
  error("Err : " + error);
});

//--------------
// init webApp
//--------------
const app: express.Application = express();
app.disable("x-powered-by");
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(compression());
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'myownsecret',
  cookie: { maxAge: 6000000 },
  store: store,
  resave: false,
  saveUninitialized: false
}));

// view engine setup
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'jade');


//--------------
// cors stuff
//--------------
let originsWhiteList = ['http://localhost:4200', 'http://r2d2', 'http://192.168.0.127'];
if (process.env['frontend']) {
  originsWhiteList = JSON.parse(process.env['frontend']);
}
//noinspection JSUnusedGlobalSymbols
const corsOptions = {
  origin: function (origin, callback) {
    const isWhiteListed = originsWhiteList.indexOf(origin) !== -1;
    callback(null, isWhiteListed);
  },
  credentials: true
};
//noinspection TypeScriptValidateTypes
app.use(cors(corsOptions));


//--------------
// passport routes (authentication)
//--------------
require('./config_passport')(passport); // pass passport for configuration

app.use(session({
  secret: 'myownsecret',
  cookie: { maxAge: 6000000 },
  store: store,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
//noinspection TypeScriptValidateJSTypes
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session


app.use('/', defaultRouter(passport));
app.use('/api',  apiRouter(passport));
app.use('/api1',  api1Router(passport));
app.use("/monitorStuff", monitorRouter(passport));
app.use("/authent", authenticationRouter(passport));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  let err = new Error('Not Found : ' + req.url);
  err['status'] = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktrace leaked to user
app.use(function(err, req, res) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
