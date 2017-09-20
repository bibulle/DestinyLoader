var logger = require('../logger');
var Datastore = require('nedb');
var async = require('async');
var config = require('../config');


var DB_NAME = 'destiny';
var DB_COLL_NAME = 'stats1';

var MongoClient = require("mongodb").MongoClient;

var _db;
var _col;

var _initDb = function (callback) {
    //logger.info("_initDb");
    if (_db && _col) {
        //logger.info("_initDb nothing to do");
        callback()
    } else {
        //logger.info("_initDb try to connect");
        MongoClient.connect("mongodb://localhost/"+DB_NAME, function (err, db) {
            _db = db;
            if (err) {
                logger.error("Error connecting to '"+DB_NAME+"'");
                logger.error(err);
            } else {
                logger.info("Connect successfully to '"+DB_NAME+"'");

                // check for collection stats
                db.listCollections({name: DB_COLL_NAME})
                //db.listCollections()
                    .next(function(err, collinfo) {
                        // logger.info(err);
                        // logger.info(JSON.stringify(collinfo, null, 2));
                        if (collinfo) {
                            // The collection exists
                            _col = _db.collection(DB_COLL_NAME);
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

                                ndb.find({}).exec(function(err, docs) {
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

                                        _db.collection(DB_COLL_NAME).insert(doc, function (err) { return cb(err); });
                                    }, function (err) {
                                        console.log("");
                                        if (err) {
                                            logger.error("An error happened while inserting data");
                                            callback(err);
                                        } else {
                                            logger.info("Everything went fine");
                                            _col = _db.collection(DB_COLL_NAME);
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

var insert = function (data, callback) {
    //logger.info("insert");
    _initDb(function (err) {
        if (err) {
            return callback(err);
        }
        //console.log(data);
        _col.insertOne(data)
            .then(function(data) {
                callback(null, data);
            })
            .catch(function(err) {
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
        _col.find({})
            .sort({date: 1, name: 1})
            .toArray(function(err, docs) {
            if (err) {
                return callback(err);
            }
            logger.info(docs.length+" documents");
            callback(err, docs);
        });
    });
}

//------------------------------------

module.exports = {};

module.exports.insert = insert;
module.exports.list = list;

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

