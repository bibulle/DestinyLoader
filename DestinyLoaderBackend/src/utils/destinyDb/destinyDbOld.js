var logger = require('../logger/logger');
var Datastore = require('nedb');
var async = require('async');
var config = require('../config/config');


var DB_PATH = __dirname+'/'+config.dbPath;
logger.info("Database path : '"+DB_PATH+"'");

var _db =  new Datastore({filename: DB_PATH, autoload: true});

//------------------------------------

var insert = function(data, callback) {
  _db.insert(data, callback);
}

var list = function(callback, reload) {
  if (reload) {
    _db.loadDatabase(function() {
      logger.info("Database loaded");
      _db.find({}).sort({ date: 1, name: 1 }).exec(callback);
    });
  } else {
    _db.find({}).sort({ date: 1, name: 1 }).exec(callback);
  }
}

//------------------------------------

module.exports = {};

module.exports.insert = insert;
module.exports.list = list;

//------------------------------------

var init = function () {

  async.waterfall([
      function (callback) {

        _db.loadDatabase(callback);

      }
    ],
    function (err) {
      if (err) {
        logger.error("Err : " + err);
      }
    }
  )

}

init();

