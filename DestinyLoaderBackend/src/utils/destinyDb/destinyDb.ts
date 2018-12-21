import { Config } from "../config/config";
import { ObjectiveTime } from "../../models/objectiveTime";

const debug = require('debug')('server:debugLogger:destinyDb');
const error = require('debug')('server:error:destinyDb');
const DataStore = require('nedb');
const async = require('async');
const path = require('path');

export class DestinyDb {

  private static DB_NAME = 'destiny';
  private static DB_COLL_NAME_STATS = 'stats1';
  private static DB_COLL_NAME_CONFIGURATIONS = 'confs';
  private static DB_COLL_NAME_TIMES = 'times';

  private static MongoClient = require("mongodb").MongoClient;

  private static _db;
  private static _colStats;
  private static _colConfigurations;
  private static _colTimes;

  constructor () {
    debug("init");
    async.waterfall([
        function (callback) {
          DestinyDb._initDb(callback)
        },
        function (callback) {
          // debugLogger("before the listStats");
          DestinyDb.listStats(callback);

        }
      ],
      function (err) {
        if (err) {
          error("Err : " + err);
        }
      }
    )


  }

  private static _initDb (callback) {
    // debugLogger("_initDb");
    //debugLogger(this._db && this._colStats && this._colConfigurations);

    if (this._db && this._colStats && this._colConfigurations && this._colTimes) {
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
          db.listCollections().toArray(
            //db.listCollections()
            function (err, columnInfo) {
              // debugLogger(err);
              // debug(JSON.stringify(columnInfo, null, 2));

              const jobsToDo = [];

              [
                DestinyDb.DB_COLL_NAME_STATS,
                DestinyDb.DB_COLL_NAME_CONFIGURATIONS,
                DestinyDb.DB_COLL_NAME_TIMES
              ].forEach((collName) => {
                if (!DestinyDb._collectionExist(collName, columnInfo)) {
                  error(`collection ${collName} do not exist`);
                  jobsToDo.push(function (callback) {
                    DestinyDb._createCol(collName, callback);
                  });
                }
              });

              async.waterfall(
                jobsToDo,
                (err) => {
                  if (err) {
                    error(err);
                    callback(err)
                  } else {
                    DestinyDb._colStats = DestinyDb._db.collection(DestinyDb.DB_COLL_NAME_STATS);
                    DestinyDb._colConfigurations = DestinyDb._db.collection(DestinyDb.DB_COLL_NAME_CONFIGURATIONS);
                    DestinyDb._colTimes = DestinyDb._db.collection(DestinyDb.DB_COLL_NAME_TIMES);
                    callback();
                  }
                }
              );
            });
        }
      })
    }
  };

//------------------------------------

  /**
   * insrt or update an objective time
   * @param bungieNetUser
   * @param data
   * @param callback
   */
  public static insertTime (bungieNetUser, data, callback) {
    const doc = new ObjectiveTime({
      bungieNetUser: bungieNetUser,
      characterId: data.characterId,
      objectiveId: data.objectiveId,
      finished: data.finished,
      timeStart: data.timeStart,
      timeEnd: data.timeEnd,
      countStart: data.countStart,
      countEnd: data.countEnd,
    });
    this._initDb(function (err) {
      if (err) {
        return callback(err);
      }
      //debug(doc);
      DestinyDb._colTimes.insertOne(doc)
               .then(function (data) {
                 //debug(data);
                 callback(null, data);
               })
               .catch(function (err) {
                 //console.log(err);
                 if (err.code == 11000) {
                   DestinyDb._colTimes.update({_id: doc._id}, doc)
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

  /**
   * Get all objective times
   * @param user
   * @param callback
   */
  public static listTimes (callback) {
    //debugLogger("listTimes");

    this._initDb(function (err) {
      if (err) {
        return callback(err);
      }
      DestinyDb._colTimes.find()
               .toArray(function (err, docs) {
                 if (err) {
                   return callback(err);
                 }
                 // debug(docs.length + " times");
                 callback(err, docs);
               });
    });
  };

  public static insertConf (user, data, callback) {
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

  public static readConf (user, callback) {
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

  public static insertStats (data, callback) {
    //debugLogger("insertStats");
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

  public static listStats (callback) {
    // debugLogger("listStats");
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


  /**
   * Is this collection existing in the colls info ?
   * @param name
   * @param columnInfo
   * @private
   */
  private static _collectionExist (name: string, columnInfo): boolean {
    let ret = false;

    columnInfo.forEach(info => {
      if (info.name === name) {
        ret = true;
      }
    });
    return ret;
  }

  /**
   * Create the needed collection
   *    and sometime init it (if possible)
   * @param collName
   * @param callback
   * @private
   */
  private static _createCol (collName: string, callback) {
    debug(`_createCol ${collName}`);

    async.waterfall(
      [
        // Really create the collection
        (callback) => {
          DestinyDb._db.createCollection(collName, (err, collection) => {
            callback(err);
          })
        },
        // try to fill it
        (callback) => {
          switch (collName) {
            case DestinyDb.DB_COLL_NAME_STATS:
              DestinyDb._initColStats(callback);
              break;
            case DestinyDb.DB_COLL_NAME_TIMES:
              DestinyDb._initColTimes(callback);
              break;
            default:
              callback();
          }
        }
      ],
      callback
    )

  }

  /**
   * Try to init the stats collection from a nedb file (legacy)
   * @param callback
   * @private
   */
  private static _initColStats (callback: any) {
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

  /**
   * Try ti init times from hardcoded values (legacy)
   * @param callback
   * @private
   */
  private static _initColTimes (callback: any) {

    const TIMES_BY_OBJECTIVE = {
      // Gambit match
      '2083819821': 15 * 60 * 1000,
      '776296945': 15 * 60 * 1000,
      // Crucible
      '2709623572': 12 * 60 * 1000,
      '562619790': 12 * 60 * 1000,
      // Strike
      '2244227422': 13.5 * 60 * 1000,
      '3201963368': 13.5 * 60 * 1000,
      '2225383629': 13.5 * 60 * 1000,
      // WANTED: The Eye in the Dark
      '277282920': 25 * 60 * 1000
    };

    async.forEachSeries(
      Object.keys(TIMES_BY_OBJECTIVE),
      (objectiveKey, callback) => {

        const obvetiveTime = new ObjectiveTime({
          objectiveId: objectiveKey,
          finished: true,
          timeDelta: TIMES_BY_OBJECTIVE[objectiveKey],
          countStart: 0,
          countEnd: 1

        });

        DestinyDb._db.collection(DestinyDb.DB_COLL_NAME_TIMES).insert(obvetiveTime, function (err) {
          return callback(err);
        });
      },
      (err) => {
        callback(err);
      }
    )

  }
}