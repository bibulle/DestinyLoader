import {Config} from "../config/config";

const debug = require('debug')('server:debugLogger:destinyDb');
const error = require('debug')('server:error:destinyDb');
const DataStore = require('nedb');
const async = require('async');
const path = require('path');

export class DestinyDb {

  private static DB_NAME = 'destiny';
  private static DB_COLL_NAME_STATS = 'stats1';
  private static DB_COLL_NAME_CONFIGURATIONS = 'confs';

  private static MongoClient = require("mongodb").MongoClient;

  private static _db;
  private static _colStats;
  private static _colConfigurations;

  constructor() {
    debug("init");
    async.waterfall([
        function(callback) {
          DestinyDb._initDb(callback)
        },
        function (callback) {
          // debugLogger("before the list");
          DestinyDb.list(callback);

        }
      ],
      function (err) {
        if (err) {
          error("Err : " + err);
        }
      }
    )


  }

  private static _initDb(callback) {
    // debugLogger("_initDb");
    //debugLogger(this._db && this._colStats && this._colConfigurations);

    if (this._db && this._colStats && this._colConfigurations) {
      // debugLogger("_initDb nothing to do");
      callback()
    } else {
      //debugLogger("_initDb try to connect");
      this.MongoClient.connect(Config.mongoUrl + "/" + DestinyDb.DB_NAME, function (err, db) {
        DestinyDb._db = db;
        if (err) {
          error("Error connecting to '" + DestinyDb.DB_NAME + "'");
          error(err);
        } else {
          debug("Connect successfully to database '" + DestinyDb.DB_NAME + "'");

          // check for collection stats
          db.listCollections({name: DestinyDb.DB_COLL_NAME_STATS})
            //db.listCollections()
            .next(function (err, columnInfo) {
              // debugLogger(err);
              // debugLogger(JSON.stringify(columnInfo, null, 2));
              if (columnInfo) {
                // The collection exists
                DestinyDb._colStats = DestinyDb._db.collection(DestinyDb.DB_COLL_NAME_STATS);
                DestinyDb._colConfigurations = DestinyDb._db.collection(DestinyDb.DB_COLL_NAME_CONFIGURATIONS);
                callback();
              } else {
                error("collection not found");
                const DB_PATH = path.resolve(__dirname + '/../' + Config.dbPath);
                debug("Transfer database from path : '" + DB_PATH + "'");

                const ndb = new DataStore(DB_PATH);
                ndb.loadDatabase(function (err) {
                  if (err) {
                    error("Error while loading the data from the NeDB database");
                    return callback(err);
                  }

                  ndb.find({}).exec(function (err, docs) {
                    if (err) {
                      error("Error while loading the data from the NeDB database");
                      error(err);
                      return callback(err);
                    }
                    if (docs.length === 0) {
                      error("The NeDB database at " + DB_PATH + " contains no data, no work required");
                      error("You should probably check the NeDB datafile path though!");
                      return callback();
                    } else {
                      console.log("Loaded data from the NeDB database at " + DB_PATH + ", " + docs.length + " documents");
                    }

                    console.log("Inserting documents (every dot represents one document) ...");
                    async.each(docs, function (doc, cb) {
                      process.stdout.write('.');

                      delete doc._id;

                      DestinyDb._db.collection(DestinyDb.DB_COLL_NAME_STATS).insert(doc, function (err) {
                        return cb(err);
                      });
                    }, function (err) {
                      console.log("");
                      if (err) {
                        error("An error happened while inserting data");
                        callback(err);
                      } else {
                        debug("Everything went fine");
                        DestinyDb._colStats = DestinyDb._db.collection(DestinyDb.DB_COLL_NAME_STATS);
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

  public static insertConf(user, data, callback) {
    const doc = {
      _id: user.bungieNetUser.displayName,
      user: user.bungieNetUser.displayName,
      chosen: data.chosen,
      mode: data.mode,
    };
    this._initDb(function (err) {
      if (err) {
        return callback(err);
      }
      DestinyDb._colConfigurations.insertOne(doc)
                        .then(function (data) {
                          callback(null, data);
                        })
                        .catch(function (err) {
                          //console.log(err);
                          if (err.code == 11000) {
                            DestinyDb._colConfigurations.update({_id: doc._id}, doc)
                                              .then(function () {
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
  };

  public static readConf(user, callback) {
    //debugLogger("readConf ------ 1");

    const doc = {
      _id: user.bungieNetUser.displayName,
    };
    this._initDb(function (err) {
      //debugLogger("readConf ------ 2");
      if (err) {
        //debugLogger("readConf ------ 2.1");
        return callback(err);
      }
      //debugLogger("readConf ------ 3");
      DestinyDb._colConfigurations.findOne(doc)
                        .then(function (data) {
                          //debugLogger("readConf ------ 4");
                          //debugLogger(JSON.stringify(data, null, 2))

                          if (!data) {
                            data = {};
                          }

                          return callback(null, data);
                          //})
                          //.catch(function (err) {
                          //  debugLogger("readConf ------ 5");
                          //  debugLogger(JSON.stringify(err, null, 2))
                          //  return callback(err);
                        });
    });
  };

  public static insert(data, callback) {
    //debugLogger("insert");
    this._initDb(function (err) {
      if (err) {
        return callback(err);
      }
      //console.log(data);
      DestinyDb._colStats.insertOne(data)
               .then(function (data) {
                 callback(null, data);
               })
               .catch(function (err) {
                 callback(err);
               });
    });
  };

  public static list(callback) {
    // debugLogger("list");
    this._initDb(function (err) {
      if (err) {
        return callback(err);
      }
      //_db.collection("stats").find({}).toArray().sort({date: 1, name: 1}).exec(callback);
      DestinyDb._colStats.find({"date": {$gte: new Date("2018-04-01T00:00:00.000Z")}})
               .sort({date: 1, name: 1})
               .toArray(function (err, docs) {
                 if (err) {
                   return callback(err);
                 }
                 debug(docs.length + " documents");
                 callback(err, docs);
               });
    });
  };


// var init = function () {
//     debugLogger("init");
//     async.waterfall([
//             this._initDb,
//             function (callback) {
//                 debugLogger("before the list");
//                 list(callback);
//
//             }
//         ],
//         function (err) {
//             if (err) {
//                 error("Err : " + err);
//             }
//         }
//     )
//
// }

//init();

}