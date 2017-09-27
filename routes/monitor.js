var https = require('https');
var express = require('express');
var async = require('async');
var router = express.Router();

var logger = require("../lib/logger");
var config = require('../lib/config');
var destiny = require("../lib/destiny");
var destinyDb = require("../lib/destinyDb");


// init the monitoring

router.get('/', function (request, response, next) {
  if (request.originalUrl.slice(-1) == '/') return response.redirect('..' + request.originalUrl.slice(0, -1));

  if (!request.session.user) {
    response.redirect('monitorstuff/login');
  } else {
    //logger.info(JSON.stringify(request.session.user, null, 2));
    //response.send("Welcome "+request.session.user.bungieNetUser.displayName);
    response.render('monitor', {user: request.session.user});

  }
});

router.get('/api', function (request, response, next) {
  if (!request.session.user) {
    response.send({error: "NotLogged"});
  } else {

    async.waterfall([
      function (callback) {
        // Read the configuration (choice of the user)
        destinyDb.readConf(request.session.user, function (err, conf) {
          if (err) {
            callback(err);
          } else {
            callback(null, conf);
          }

        });
      },
      function (conf, callback) {
        // Check the configuration (did the chosen items exist)
        destiny.checkConf(conf, function (err, messages) {
          if (err) {
            callback(err);
          } else {
            //logger.info(JSON.stringify(messages, null, 2));
            callback(null, messages, conf);
          }
        })
      },
      function (messages, conf, callback) {
        // Read the user destiny stuff
        destiny.getUserStuff(request.session.user, function (err, data) {
          if (err) {
            callback(err);
          } else {
            //logger.info(JSON.stringify(data, null, 2));
            //logger.info(JSON.stringify(data.items, null, 2));

            data.messages = messages;
            async.setImmediate(function () {
              callback(null, data, conf);
            });
          }

        });
      },
      function (data, conf, callback) {
        // Calculate order and what to keep
        //logger.info(JSON.stringify(conf, null, 2));
        //logger.info(JSON.stringify(data.items.length, null, 2));

        async.eachSeries(
          data.items,
          function (itemsByBukets, callback) {
            //logger.info(JSON.stringify(bucket, null, 2));
            async.eachSeries(
              itemsByBukets,
              function (itemsByType, callback) {
                //logger.info(JSON.stringify(itemsByType, null, 2));

                async.waterfall([
                    // First, add attribute if chosen by the user (and lock it if needed)
                    function (callback) {
                      async.eachSeries(
                        itemsByType,
                        function (item, callback) {
                          item.chosen = -1;
                          if (conf.list.indexOf(item.name) > -1) {
                            item.chosen = conf.list.length - conf.list.indexOf(item.name);
                            //logger.info(JSON.stringify(item.name + " " + item.chosen, null, 2));
                            //data.messages.push(item.name+" found in "+item.bucketName);
                            if (item.state != 1) {
                              data.messages.push(item.name + " found and should be locked");
                            }
                          }
                          //logger.info(JSON.stringify(item, null, 2));
                          callback();
                        },
                        function (err) {
                          callback(err);
                        }
                      )

                    },
                    // sort the itemsByType
                    function (callback) {
                      itemsByType.sort(itemComparator);
                      callback();
                    },
                    // find the chosen twice
                    function (callback) {
                      var found = [];
                      async.eachSeries(
                        itemsByType,
                        function (item, callback) {
                          if (item.chosen > -1) {
                            if (found.indexOf(item.name) > -1) {
                              item.chosen = -1;
                            }
                            found.push(item.name);
                          }
                          callback();
                        },
                        function (err) {
                          callback(err);
                        }
                      )
                    },
                    // sort again after chosen that exists twice
                    function (callback) {
                      itemsByType.sort(itemComparator);
                      callback();
                    },
                    // find witch to keep
                    function (callback) {
                      var count = 0;
                      async.eachSeries(
                        itemsByType,
                        function (item, callback) {
                          // chosen exo       -> INVENTORY
                          // chosen legendary -> INVENTORY
                          // first legendary  -> INVENTORY
                          // not chosen 3 legendary more -> VAULT
                          // TODO : wathever usefull for dismantle -> VAULT_TO_DISMANTLE

                          item.keep = KeepOrNot.NO_KEEP;
                          if ((item.chosen > -1) && (item.tierType == 6)) {
                            item.keep = KeepOrNot.KEEP_INVENTORY
                          } else if ((item.chosen > -1) && (item.tierType == 5)) {
                            item.keep = KeepOrNot.KEEP_INVENTORY
                            if (count == 0) {
                              count = 1;
                            }
                          } else if ((item.tierType == 5)) {
                            if (count == 0) {
                              item.keep = KeepOrNot.KEEP_INVENTORY
                            } else if (count <= 3) {
                              item.keep = KeepOrNot.KEEP_VAULT
                            }
                            count++;
                          }
                          callback();
                        },
                        function (err) {
                          callback(err);
                        }
                      );
                    }
                  ],
                  function (err) {
                    //logger.info(JSON.stringify(itemsByType, null, 2));
                    callback(err, data, conf);
                  }
                )
              },
              function (err) {
                callback(err, data, conf);
              }
            )
          },
          function (err) {
            callback(err, data, conf);
          }
        )

      },
      function (data, conf, callback) {
        // Calculate the "best" inventories
        //logger.info(JSON.stringify(conf, null, 2));
        //logger.info(JSON.stringify(data.items.length, null, 2));

        // remove one level (all in target bucket)
        var items = {};
        async.eachSeries(
          data.items,
          function (itemsByBukets, callback) {
            var lastBucketNameTarget;
            async.eachSeries(
              itemsByBukets,
              function (itemsByType, callback) {
                async.eachSeries(
                  itemsByType,
                  function (item, callback) {
                    if (BucketsToManaged.indexOf(item.bucketNameTarget) > -1) {
                      if (!items[item.bucketNameTarget]) {
                        items[item.bucketNameTarget] = [];
                      }
                      items[item.bucketNameTarget].push(item);
                      lastBucketNameTarget = item.bucketNameTarget;
                    }
                    callback(null);
                  },
                  function (err) {
                    callback(err);
                  }
                )
              },
              function (err) {
                if (lastBucketNameTarget) {
                  items[lastBucketNameTarget].sort(itemComparator)
                }
                callback(err);
              }
            )
          },
          function (err) {
            data.items = items;
            //logger.info(JSON.stringify(data, null, 2));
            callback(err, data, conf);
          }
        )
      },
      function (data, conf, callback) {
        // Can we infuse ?
        logger.info("Can we infuse ?")
        //logger.info(JSON.stringify(conf, null, 2));
        //logger.info(JSON.stringify(data.items.length, null, 2));

        // Categories by infusionCategoryName
        var itemsByInfusion = {};
        async.eachSeries(
          data.items,
          function (itemsByBukets, callback) {
            logger.info("Can we infuse ? 2");
            //logger.info(JSON.stringify(itemsByBukets, null, 2));
            async.eachSeries(
              itemsByBukets,
              function (item, callback) {
                if (item.infusionCategoryName) {
                  if (!itemsByInfusion[item.infusionCategoryName]) {
                    itemsByInfusion[item.infusionCategoryName] = [];
                  }
                  itemsByInfusion[item.infusionCategoryName].push(item);
                }
                callback(null);
              },
              function (err) {
                callback(err);
              }
            )
          },
          function (err) {
            // sorts each infusion category
            async.eachSeries(
              itemsByInfusion,
              function (items, callback) {
                items.sort(itemComparator);
                logger.info(JSON.stringify(items, null, 2));

                // let's search in inventory to upgrade
                async.eachSeries(
                  items,
                  function (itemToInfuse, callback) {
                    logger.info(itemToInfuse.name);
                    if (itemToInfuse.keep != KeepOrNot.KEEP_INVENTORY) {
                      return callback(null);
                    }
                    logger.info(JSON.stringify(itemToInfuse.name, null, 2));
                    var itemFound = false;
                    async.eachSeries(
                      items,
                      function (itemToDismantle, callback) {
                        if (itemToInfuse.itemInstanceId == itemToDismantle.itemInstanceId) {
                          //logger.info("found : "+itemToInfuse.name);
                          itemFound = true;
                        } else if (itemFound) {
                          logger.info(JSON.stringify(itemToInfuse.name + " -> " + itemToDismantle.name + " (" + itemToDismantle.itemInstanceId + ")", null, 2));
                          // if not chosen and light greater, propose
                          if ((itemToDismantle.chosen == -1) && (itemToDismantle.lightLevel > itemToInfuse.lightLevel)) {
                            logger.info(data.messages.length);
                            data.messages.push(itemToInfuse.name + ' (' + (itemToInfuse.lightLevel + itemToInfuse.lightLevelBonus) + ") from " + itemToInfuse.bucketName + " can be highlight by infusing " + itemToDismantle.name + ' (' + (itemToDismantle.lightLevel + itemToDismantle.lightLevelBonus) + ") from " + itemToDismantle.bucketName);
                            logger.info(data.messages.length);
                          }
                        }
                        callback(null);
                      },
                      function (err) {
                        callback(err);
                      }
                    )
                  },
                  function (err) {
                    //async.setImmediate(function() {
                    callback();
                    //});
                  }
                )

              }
              , function (err) {

                //logger.info(JSON.stringify(itemsByInfusion, null, 2));
                logger.info(JSON.stringify(data.messages, null, 2));
                callback(err, data, conf);
              }
            )
          }
          )
          }


      ],

        function (err, data) {
          if (err) {
            return response.send(JSON.stringify({messages: err}, null, 2));
          }
          response.send(JSON.stringify(data, null, 2));
        }

      )
        ;
        //logger.info(JSON.stringify(request.session.user, null, 2));
        //response.send("Welcome "+request.session.user.bungieNetUser.displayName);
        //response.send({ user: request.session.user });

      }
  }
);

router.post('/value', function (request, response, next) {
  //logger.info(JSON.stringify(request.body, null, 2));
  if (request.body.conf === "") {
    destinyDb.readConf(request.session.user, function (err, doc) {
      if (err) {
        logger.error(JSON.stringify(err, null, 2));
        return response.send("ERROR");
      } else {
        if (!doc) {
          request.body.conf = "[\n" +
            "  \"Nameless Midnight\",\n" +
            "  \"The Old Fashioned\",\n" +
            "  \"Better Devils\",\n" +
            "  \"Uriel's Gift\"\n" +
            "]";
        } else {
          request.body.conf = JSON.stringify(doc.list, null, 2);
        }
        try {
          value = JSON.parse(request.body.conf);

          destinyDb.insertConf(request.session.user, value, function (err, doc) {
            if (err) {
              logger.error(JSON.stringify(err, null, 2));
              response.send("ERROR");
            } else {
              response.send(JSON.stringify(value, null, 2));
            }
          });

        } catch (e) {
          //console.log(e);
          response.send("ERROR");
        }

      }
    })
  } else {
    try {
      value = JSON.parse(request.body.conf);

      destinyDb.insertConf(request.session.user, value, function (err, doc) {
        if (err) {
          logger.error(JSON.stringify(err, null, 2));
          response.send("ERROR");
        } else {
          response.send(JSON.stringify(value, null, 2));
        }
      });

    } catch (e) {
      //console.log(e);
      response.send("ERROR");
    }

  }

});

router.get('/login', function (request, response, next) {
  //logger.info("GET /login");

  destiny.getAuthentCodeUrl(function (err, url) {
    response.redirect(url);
  });
});

router.get('/login/callback', function (request, response, next) {

  //logger.info("GET /login/callback");
  //logger.info(request.query.code);

  if (!request.query || !request.query.code) {
    return response.redirect('/login');
  }

  var code = request.query.code;

  // We've got the code, get the authent stuff
  destiny.getTokenUrl(function (err, url) {
    var postData = "grant_type=authorization_code&code=" + code + "";
    var options = {
      hostname: 'www.bungie.net',
      port: 443,
      path: url,
      headers: {
        'Authorization': 'Basic ' + new Buffer(config.oAuthClientId + ":" + config.oAuthClientSecret).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': postData.length
      },
      method: 'POST'
    };

    //logger.info(JSON.stringify(options, null, 2));
    //logger.info(JSON.stringify(postData, null, 2));

    var req = https.request(options, function (res) {
      //logger.info("statusCode: ", res.statusCode);
      //logger.info("headers: ", res.headers);
      //logger.info(res);

      var content = '';

      res.on('data', function (d) {
        //logger.info("data");
        //logger.info(d.toString());
        content += d.toString();
      });
      res.on('end', function (d) {
        //logger.info('end');

        var val;

        try {
          //logger.info('end : '+content);
          val = JSON.parse(content);
        } catch (e) {
          logger.error("Error in getting Bungie data : " + e + 'from ' + path);
          return response.send(e);
        }

        if (val.error) {
          logger.warn(JSON.stringify(val, null, 2));
          logger.error("Error in reading Bungie data : " + val.error_description);
          return response.send("Error in reading Bungie data : " + val.error_description);
        }

        // Create the user
        //logger.info(JSON.stringify(val, null, 2));
        var user = {auth: val};

        // fill it
        destiny.getCurrentUser(user, function (err, data) {
          if (err) return response.status(500).send(err);

          user.destinyMemberships = data.destinyMemberships;
          user.bungieNetUser = data.bungieNetUser;

          request.session.user = user;

          response.redirect('..');
          //logger.info(JSON.stringify(user, null, 2));

//          destiny.getUserStuff(user, function(err,data) {
//            //logger.info(JSON.stringify(data, null, 2));
//            //console.log(data);
//            logger.info(JSON.stringify(data.items, null, 2));
//            response.send(JSON.stringify(data, null, 2));
//
//          });
        });


      });
    });
    req.write(postData);
    req.end();

    req.on('error', function (e) {
      logger.info("error");

      return response.send("Error in conecting Bungie : " + e);
    });

  });

});

module.exports = router;


var itemComparator = function (i1, i2) {
  if (i1.keep > i2.keep) {
    return -1;
  } else if (i2.keep > i1.keep) {
    return 1;
  }
  if (i1.chosen > i2.chosen) {
    return -1;
  } else if (i2.chosen > i1.chosen) {
    return 1;
  }
  if ((i1.state == 1) && (i2.state != 1)) {
    return -1;
  } else if ((i2.state == 1) && (i1.state != 1)) {
    return 1;
  }
  if (i1.tierType > i2.tierType) {
    return -1;
  } else if (i2.tierType > i1.tierType) {
    return 1;
  }
  if (i1.lightLevelBonus > i2.lightLevelBonus) {
    return -1;
  } else if (i2.lightLevelBonus > i1.lightLevelBonus) {
    return 1;
  }
  if (i1.lightLevel > i2.lightLevel) {
    return -1;
  } else if (i2.lightLevel > i1.lightLevel) {
    return 1;
  }

  return 0;

}

var KeepOrNot = {
  KEEP_INVENTORY: 10,
  KEEP_VAULT: 9,
  KEEP_VAULT_TO_DISMANTLE: 8,
  NO_KEEP: 0
}

var BucketsToManaged = [
  "Power Weapons", "Energy Weapons", "Kinetic Weapons",
  //"Leg Armor", "Helmet", "Gauntlets", "Chest Armor", "Class Armor",
  //"Ghost", "Vehicle", "Ships"
]