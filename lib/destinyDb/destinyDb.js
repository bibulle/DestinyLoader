var logger = require('../logger');
var Datastore = require('nedb');
var async = require('async');
var config = require('../config');


var DB_NAME = 'destiny';
var DB_COLL_NAME_STATS = 'stats1';
var DB_COLL_NAME_CONFS = 'confs';

var MongoClient = require("mongodb").MongoClient;

var _db;
var _colStats;
var _colConfs;

var _initDb = function (callback) {
  //logger.info("_initDb");
  if (_db && _colStats && _colConfs) {
    //logger.info("_initDb nothing to do");
    callback()
  } else {
    //logger.info("_initDb try to connect");
    MongoClient.connect("mongodb://192.168.0.128/" + DB_NAME, function (err, db) {
      _db = db;
      if (err) {
        logger.error("Error connecting to '" + DB_NAME + "'");
        logger.error(err);
      } else {
        logger.info("Connect successfully to database '" + DB_NAME + "'");

        // check for collection stats
        db.listCollections({name: DB_COLL_NAME_STATS})
        //db.listCollections()
          .next(function (err, collinfo) {
            // logger.info(err);
            // logger.info(JSON.stringify(collinfo, null, 2));
            if (collinfo) {
              // The collection exists
              _colStats = _db.collection(DB_COLL_NAME_STATS);
              _colConfs = _db.collection(DB_COLL_NAME_CONFS);
              callback();
            } else {
              //callback("collection not found");
              var DB_PATH = __dirname + '/' + config.dbPath;
              logger.info("Transfer database from path : '" + DB_PATH + "'");

              ndb = new Datastore(DB_PATH);
              ndb.loadDatabase(function (err) {
                if (err) {
                  logger.error("Error while loading the data from the NeDB database");
                  callback(err);
                }

                ndb.find({}).exec(function (err, docs) {
                  if (err) {
                    logger.error("Error while loading the data from the NeDB database");
                    logger.error(err);
                    callback(err);
                  }
                  if (docs.length === 0) {
                    logger.error("The NeDB database at " + DB_PATH + " contains no data, no work required");
                    logger.error("You should probably check the NeDB datafile path though!");
                    callback();
                  } else {
                    console.log("Loaded data from the NeDB database at " + DB_PATH + ", " + docs.length + " documents");
                  }

                  console.log("Inserting documents (every dot represents one document) ...");
                  async.each(docs, function (doc, cb) {
                    process.stdout.write('.');

                    delete doc._id;

                    _db.collection(DB_COLL_NAME_STATS).insert(doc, function (err) {
                      return cb(err);
                    });
                  }, function (err) {
                    console.log("");
                    if (err) {
                      logger.error("An error happened while inserting data");
                      callback(err);
                    } else {
                      logger.info("Everything went fine");
                      _colStats = _db.collection(DB_COLL_NAME_STATS);
                      callback();
                    }
                  });
                });

              });

            }
          });
      }
    })
  }
};

//------------------------------------

var insertConf = function (user, data, callback) {
  var doc = {
    _id: user.bungieNetUser.displayName,
    user: user.bungieNetUser.displayName,
    chosen: data.chosen,
    mode: data.mode,
  };
  _initDb(function (err) {
    if (err) {
      return callback(err);
    }
    _colConfs.insertOne(doc)
      .then(function (data) {
        callback(null, data);
      })
      .catch(function (err) {
        //console.log(err);
        if (err.code == 11000) {
          _colConfs.update({_id: doc._id}, doc)
            .then(function (data) {
              callback(null, doc);
            })
            .catch(function (err) {
              console.log(err);
              callback(err);
            });
        } else {
          callback(err);
        }
      });
  });
}

var readConf = function (user, callback) {
  //logger.info("readConf ------ 1");

  var doc = {
    _id: user.bungieNetUser.displayName,
  };
  _initDb(function (err) {
    //logger.info("readConf ------ 2");
    if (err) {
      //logger.info("readConf ------ 2.1");
      return callback(err);
    }
    //logger.info("readConf ------ 3");
    _colConfs.findOne(doc)
      .then(function (data) {
        //logger.info("readConf ------ 4");
        //logger.info(JSON.stringify(data, null, 2))
        return callback(null, data);
      //})
      //.catch(function (err) {
      //  logger.info("readConf ------ 5");
      //  logger.info(JSON.stringify(err, null, 2))
      //  return callback(err);
      });
  });
}

var insert = function (data, callback) {
  //logger.info("insert");
  _initDb(function (err) {
    if (err) {
      return callback(err);
    }
    //console.log(data);
    _colStats.insertOne(data)
      .then(function (data) {
        callback(null, data);
      })
      .catch(function (err) {
        callback(err);
      });
  });
}

var list = function (callback, reload) {
  //logger.info("list");
  _initDb(function (err) {
    if (err) {
      return callback(err);
    }
    //_db.collection("stats").find({}).toArray().sort({date: 1, name: 1}).exec(callback);
    _colStats.find({"date": {$gte : new Date("2018-04-01T00:00:00.000Z")}})
      .sort({date: 1, name: 1})
      .toArray(function (err, docs) {
        if (err) {
          return callback(err);
        }
        logger.info(docs.length + " documents");
        callback(err, docs);
      });
  });
}

//------------------------------------

module.exports = {};

module.exports.insert = insert;
module.exports.list = list;
module.exports.insertConf = insertConf;
module.exports.readConf = readConf;

//------------------------------------

// var init = function () {
//     logger.info("init");
//     async.waterfall([
//             _initDb,
//             function (callback) {
//                 logger.info("before the list");
//                 list(callback);
//
//             }
//         ],
//         function (err) {
//             if (err) {
//                 logger.error("Err : " + err);
//             }
//         }
//     )
//
// }

//init();

