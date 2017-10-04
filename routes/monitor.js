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

  //logger.info(JSON.stringify(request.originalUrl, null, 2));
  if (!request.session.user) {
    delete request.session.lastAccess;
    return response.redirect('monitorstuff/login');
  } else {
    var d = new Date();
    if (request.session.lastAccess && (request.session.lastAccess > d.getTime()-2000)) {
      delete request.session.user;
      response.redirect('monitorstuff/login');
    } else {
      request.session.lastAccess = d.getTime();

      //response.send("Welcome "+request.session.user.bungieNetUser.displayName);
      response.render('monitor', {user: request.session.user});
    }

  }
});

router.get('/api', function (request, response, next) {
    if (!request.session.user) {
      response.send({error: "NotLogged"});
    } else {
      async.waterfall([
          // Read the configuration (choice of the user)
          function (callback) {
            destinyDb.readConf(request.session.user, function (err, conf) {
              if (err) {
                callback(err);
              } else {
                //logger.info(JSON.stringify(conf, null, 2));
                callback(null, conf);
              }

            });
          },
          // Check the configuration (did the chosen items exist)
          function (conf, callback) {
            destiny.checkConf(conf, function (err, messages) {
              if (err) {
                callback(err);
              } else {
                //logger.info(JSON.stringify(messages, null, 2));
                callback(null, messages, conf);
              }
            })
          },
          // Read the user destiny stuff
          function (messages, conf, callback) {
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
          // Calculate order and what to keep
          function (data, conf, callback) {
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
                        // First, add attribute if chosen by the user
                        function (callback) {
                          async.eachSeries(
                            itemsByType,
                            function (item, callback) {
                              item.chosen = -1;
                              if (conf.chosen.indexOf(item.name) > -1) {
                                item.chosen = conf.chosen.length - conf.chosen.indexOf(item.name);
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
                          var found = [];
                          async.eachSeries(
                            itemsByType,
                            function (item, callback) {
                              // chosen exo                    -> INVENTORY
                              // chosen legendary              -> INVENTORY
                              // first                         -> INVENTORY (3 for not weapon)
                              // not chosen 3           more   -> VAULT
                              // first exo                     -> VAULT_EXO
                              // whatever useful for dismantle -> VAULT_TO_DISMANTLE (later)

                              var countMax = 3;
                              if (item.itemType == 3) {
                                // Weapon
                                countMax = 1;
                              }
                              //logger.info(JSON.stringify(item.itemType, null, 2));

                              item.keep = KeepOrNot.NO_KEEP;
                              if ((item.chosen > -1) && (item.tierType == Tier.Exotic)) {
                                item.keep = KeepOrNot.KEEP_INVENTORY
                              } else if ((item.chosen > -1) && (item.tierType == Tier.Legendary)) {
                                item.keep = KeepOrNot.KEEP_INVENTORY
                                count++;
                              } else if ((item.tierType <= Tier.Legendary)) {
                                if (count < countMax) {
                                  item.keep = KeepOrNot.KEEP_INVENTORY
                                } else if (count < countMax + 3) {
                                  item.keep = KeepOrNot.KEEP_VAULT
                                }
                                count++;
                              } else if (item.tierType == Tier.Exotic) {
                                if (found.indexOf(item.name) == -1) {
                                  item.keep = KeepOrNot.KEEP_VAULT_EXO;
                                  found.push(item.name);
                                }
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
                async.setImmediate(function () {
                  callback(err, data, conf);
                });
              }
            )

          },
          // Calculate the "best" inventories
          function (data, conf, callback) {
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
                async.setImmediate(function () {
                  callback(err, data, conf);
                });
              }
            )
          },
          // Max light if needed
          function (data, conf, callback) {
            //logger.info(JSON.stringify(conf, null, 2));
            //logger.info(JSON.stringify(data.items, null, 2));

            if (CONF_MODE[conf.mode] != CONF_MODE["max-light"]) {
              return callback(null, data, conf);
            }

            // create max light lists
            var maxLights = {};
            async.eachSeries(
              data.items,
              function (itemsByBuckets, callback) {
                var bucketName;
                async.eachSeries(
                  itemsByBuckets,
                  function (item, callback) {
                    if (item.bucketNameTarget) {
                      if (!maxLights[item.bucketNameTarget]) {
                        maxLights[item.bucketNameTarget] = [];
                      }
                      maxLights[item.bucketNameTarget].push(item);
                      bucketName = item.bucketNameTarget;
                    }
                    callback(null);
                  },
                  function (err) {
                    maxLights[bucketName].sort(itemComparatorByLight);
                    callback(err);
                  }
                )
              },
              function (err) {

                var itemsToEquip = [];
                var lightMax = 0;
                var cpt1Legendary = 0;
                var cpt2Legendary = 0;
                var cpt3Legendary = 0;
                maxLights["Kinetic Weapons"].forEach(
                  function(item1) {
                    // If not first and first is not an exo, return
                    cptExoEquiped = 0;
                    if (cpt1Legendary > 0) {
                      return callback;
                    } else if (item1.tierType < Tier.Exotic) {
                      cpt1Legendary++;
                    } else {
                      cptExoEquiped++;
                    }
                    maxLights["Energy Weapons"].forEach(
                      function(item2) {
                        // If not first and first is not an exo, return
                        if (cpt2Legendary > 0) {
                          return callback;
                        } else if (item2.tierType < Tier.Exotic) {
                          cpt2Legendary++;
                        } else {
                          cptExoEquiped++;
                        }
                        maxLights["Power Weapons"].forEach(
                          function(item3) {
                            // If not first and first is not an exo, return
                            if (cpt3Legendary > 0) {
                              return callback;
                            } else if (item3.tierType < Tier.Exotic) {
                              cpt3Legendary++;
                            } else {
                              cptExoEquiped++;
                            }
                            var light =
                              item1.lightLevel+item1.lightLevelBonus+
                              item2.lightLevel+item2.lightLevelBonus+
                              item3.lightLevel+item3.lightLevelBonus;
                            if ((cptExoEquiped < 2) && (light > lightMax)) {
                              itemsToEquip = [item1, item2, item3];
                            }
                          }
                        )
                      }
                    )
                  }
                );
                itemsToEquip.forEach(function(item) {
                  item.keep = KeepOrNot.KEEP_EQUIP;
                });
                var itemsToEquip = [];
                var lightMax = 0;
                var cpt1Legendary = 0;
                var cpt2Legendary = 0;
                var cpt3Legendary = 0;
                var cpt4Legendary = 0;
                maxLights["Helmet"].forEach(
                  function(item1) {
                    // If not first and first is not an exo, return
                    cptExoEquiped = 0;
                    if (cpt1Legendary > 0) {
                      return callback;
                    } else if (item1.tierType < Tier.Exotic) {
                      cpt1Legendary++;
                    } else {
                      cptExoEquiped++;
                    }
                    maxLights["Gauntlets"].forEach(
                      function(item2) {
                        // If not first and first is not an exo, return
                        if (cpt2Legendary > 0) {
                          return callback;
                        } else if (item2.tierType < Tier.Exotic) {
                          cpt2Legendary++;
                        } else {
                          cptExoEquiped++;
                        }
                        maxLights["Chest Armor"].forEach(
                          function(item3) {
                            // If not first and first is not an exo, return
                            if (cpt3Legendary > 0) {
                              return callback;
                            } else if (item3.tierType < Tier.Exotic) {
                              cpt3Legendary++;
                            } else {
                              cptExoEquiped++;
                            }
                            maxLights["Leg Armor"].forEach(
                              function(item4) {
                                // If not first and first is not an exo, return
                                if (cpt4Legendary > 0) {
                                  return callback;
                                } else if (item4.tierType < Tier.Exotic) {
                                  cpt4Legendary++;
                                } else {
                                  cptExoEquiped++;
                                }
                                var light =
                                  item1.lightLevel+item1.lightLevelBonus+
                                  item2.lightLevel+item2.lightLevelBonus+
                                  item3.lightLevel+item3.lightLevelBonus+
                                  item4.lightLevel+item4.lightLevelBonus;
                                if ((cptExoEquiped < 2) && (light > lightMax)) {
                                  itemsToEquip = [item1, item2, item3, item4];
                                }
                              }
                            )
                          }
                        )
                      }
                    )
                  }
                );
                itemsToEquip.forEach(function(item) {
                  item.keep = KeepOrNot.KEEP_EQUIP;
                });

                maxLights["Class Armor"][0].keep = KeepOrNot.KEEP_EQUIP;

                //logger.info(JSON.stringify(data.items, null, 2));



                callback(null, data, conf);
              }
            )
          },
          // Can we infuse ?
          function (data, conf, callback) {
            //logger.info(JSON.stringify(conf, null, 2));
            //logger.info(JSON.stringify(data.items.length, null, 2));

            // Categories by infusionCategoryName
            var itemsByInfusion = {};
            async.eachSeries(
              data.items,
              function (itemsByBukets, callback1) {
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
                    callback1(err);
                  }
                )
              },
              function (err) {
                // sorts each infusion category
                async.eachSeries(
                  itemsByInfusion,
                  function (items, callback) {
                    items.sort(itemComparator);

                    var infusions = {};
                    var itemsToInfuse = {};
                    //logger.info(JSON.stringify(items, null, 2));

                    // let's search in inventory to upgrade
                    async.eachSeries(
                      items,
                      function (itemToInfuse, callback) {
                        //logger.info(itemToInfuse.name);
                        if (itemToInfuse.keep <= KeepOrNot.KEEP_VAULT_EXO) {
                          return callback(null);
                        }
                        //logger.info(JSON.stringify(itemToInfuse.name, null, 2));
                        var itemFound = false;
                        async.eachSeries(
                          items,
                          function (itemToDismantle, callback) {
                            if (itemToInfuse.itemInstanceId == itemToDismantle.itemInstanceId) {
                              //logger.info("found : "+itemToInfuse.name);
                              itemFound = true;
                            } else if (itemFound) {
                              // if not chosen and not locked and light greater, propose
                              if ((itemToDismantle.chosen == -1) && (itemToDismantle.keep < KeepOrNot.KEEP_VAULT_EXO) && (itemToDismantle.lightLevel > itemToInfuse.lightLevel)) {
                                //logger.info(JSON.stringify(itemToDismantle, null, 2));
                                if (itemToDismantle.keep < KeepOrNot.KEEP_VAULT_TO_DISMANTLE) {
                                  itemToDismantle.keep = KeepOrNot.KEEP_VAULT_TO_DISMANTLE;

                                  if (!infusions[itemToInfuse.itemInstanceId]) {
                                    infusions[itemToInfuse.itemInstanceId] = [];
                                  }
                                  infusions[itemToInfuse.itemInstanceId].push(itemToDismantle);
                                  itemsToInfuse[itemToInfuse.itemInstanceId] = itemToInfuse;
                                }
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
                        // Add the messages for this category
                        //logger.info(JSON.stringify(infusions,null,2));
                        Object.keys(infusions).forEach(function (itemInstanceId) {
                            //logger.info(JSON.stringify(itemsToInfuse[itemInstanceId],null,2));
                            var message = itemsToInfuse[itemInstanceId].name + ' (' + (itemsToInfuse[itemInstanceId].lightLevel + itemsToInfuse[itemInstanceId].lightLevelBonus) + ") from " + itemsToInfuse[itemInstanceId].bucketName + " can be highlight by infusing ";
                            var count = 0;
                            infusions[itemInstanceId].forEach(function (itemToDismantle) {
                              if (count < 3) {
                                message += "<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" + itemToDismantle.name + ' (' + (itemToDismantle.lightLevel + itemToDismantle.lightLevelBonus) + ") from " + itemToDismantle.bucketName.replace("General", "Vault");
                              } else if (count == 3) {
                                message += "<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;...";
                              }
                              count++;
                            });
                            data.messages.push(message);
                          }
                        );
                        async.setImmediate(function () {
                          callback();
                        });


                      });
                  },
                  function (err) {

                    //logger.info(JSON.stringify(itemsByInfusion, null, 2));
                    //logger.info(JSON.stringify(data.messages, null, 2));
                    callback(err, data, conf);
                  }
                )
              }
            )
          },
          // Try to Lock
          function (data, conf, callback) {
            //logger.info(JSON.stringify(conf, null, 2));
            //logger.info(JSON.stringify(data.items.length, null, 2));

            async.eachSeries(
              data.items,
              function (itemsByBukets, callback) {
                async.eachSeries(
                  itemsByBukets,
                  function (item, callback) {
                    //if (item.name == "A Single Clap") {
                    //logger.info(JSON.stringify(item,null,2));
                    //}
                    var toLock = false;
                    if ((item.chosen >= 0) && (item.keep == KeepOrNot.KEEP_INVENTORY) && (item.state != 1)) {
                      toLock = true;
                    } else if ((item.tierType >= Tier.Exotic) && (item.state != 1)) {
                      toLock = true;
                    }

                    if (toLock) {
                      if (conf.mode && CONF_MODE[conf.mode] && CONF_MODE[conf.mode] >= CONF_MODE["lock-chosen"]) {
                        destiny.lockItem(request.session.user, item, data.characters[0].characterId, true, function (err) {
                          if (err) {
                            logger.error(err);
                            data.messages.push("Error while locking " + item.name + " (" + (item.lightLevel + item.lightLevelBonus) + ") : " + err);
                          } else {
                            data.messages.push("Have locked : " + item.name + " (" + (item.lightLevel + item.lightLevelBonus) + ")");
                          }
                          callback();
                        });
                      } else {
                        data.messages.push(item.name + " (" + (item.lightLevel + item.lightLevelBonus) + ") found and should be locked")
                        callback();
                      }
                    } else {
                      callback();
                    }
                  },
                  function (err) {
                    callback(err);
                  }
                )
              },
              function (err) {
                async.setImmediate(function () {
                  callback(err, data, conf);
                });
              }
            )
          },
          // Try move things
          function (data, conf, callback) {
            //logger.info(JSON.stringify(conf, null, 2));
            //logger.info(JSON.stringify(data.items.length, null, 2));

            async.series([
              // First move to Vault
              function (callback) {
                async.eachSeries(
                  data.items,
                  function (itemsByBukets, callback) {
                    //logger.info(JSON.stringify(itemsByBukets, null, 2));
                    var firstCanBeEqquipped;
                    async.eachSeries(
                      itemsByBukets,
                      function (item, callback) {
                        // if one need to be equipped, just get the first unequipped to remember
                        if (!firstCanBeEqquipped && item.tierType < Tier.Exotic && item.keep == KeepOrNot.KEEP_INVENTORY && (item.bucketName != "General") && (item.bucketName != "Lost Items")) {
                          firstCanBeEqquipped = item;
                        }

                        var transfert = false;

                        if (conf.mode && CONF_MODE[conf.mode]) {

                          if ((CONF_MODE[conf.mode] == CONF_MODE["optimize-inventory"]) || (CONF_MODE[conf.mode] == CONF_MODE["max-light"])) {
                            if (item.keep < KeepOrNot.KEEP_INVENTORY
                              && (item.bucketName != "General") && (item.bucketName != "Lost Items") && (item.transferStatus < 2 )) {
                              transfert = true;
                            }

                          } else if (CONF_MODE[conf.mode] == CONF_MODE["prepare-infuse"]) {
                            if (item.keep < KeepOrNot.KEEP_INVENTORY && item.keep != KeepOrNot.KEEP_VAULT_TO_DISMANTLE
                              && (item.bucketName != "General") && (item.bucketName != "Lost Items") && (item.transferStatus < 2 )) {
                              transfert = true;
                            }
                          } else if (CONF_MODE[conf.mode] == CONF_MODE["prepare-cleanup"]) {
                            if (item.keep != KeepOrNot.NO_KEEP && !item.isEquipped
                              && (item.bucketName != "General") && (item.bucketName != "Lost Items") && (item.transferStatus < 2 )) {
                              transfert = true;
                            }
                          } else {
                            if (item.keep < KeepOrNot.KEEP_INVENTORY
                              && (item.bucketName != "General") && (item.bucketName != "Lost Items") && (item.transferStatus < 2 )) {
                              data.messages.push(item.name + " (" + (item.lightLevel + item.lightLevelBonus) + ") should be moved to vault");
                            }
                          }
                        }

                        if (transfert) {
                          if (item.isEquipped && (!firstCanBeEqquipped || (item.itemInstanceId == firstCanBeEqquipped.itemInstanceId))) {
                            callback();
                          } else {
                            destiny.moveItem(request.session.user, item, firstCanBeEqquipped, data.characters[0].characterId, true, false, function (err) {
                              if (err) {
                                //logger.info(JSON.stringify(item, null, 2));
                                data.messages.push("Error while moving " + item.name + " (" + (item.lightLevel + item.lightLevelBonus) + ") to vault : " + err);
                              } else {
                                data.messages.push("Have moved to vault : " + item.name + " (" + (item.lightLevel + item.lightLevelBonus) + ")");
                              }
                              callback(err);
                            });
                          }
                        } else {
                          callback();
                        }

                      },
                      function (err) {
                        callback(err);
                      }
                    )
                  },
                  function (err) {
                    async.setImmediate(function () {
                      callback(err);
                    });
                  }
                )
              },
              // Then move to inventories
              function (callback) {
                async.eachSeries(
                  data.items,
                  function (itemsByBukets, callback) {
                    async.eachSeries(
                      itemsByBukets,
                      function (item, callback) {

                        var transfert = false;

                        if (conf.mode && CONF_MODE[conf.mode]) {

                          if ((CONF_MODE[conf.mode] == CONF_MODE["optimize-inventory"]) || (CONF_MODE[conf.mode] == CONF_MODE["max-light"])) {
                            if (item.keep == KeepOrNot.KEEP_INVENTORY
                              && (item.bucketName == "General") && (item.transferStatus < 2 )) {
                              transfert = true;
                            } else if ((item.keep == KeepOrNot.KEEP_EQUIP) && !item.isEquipped) {
                              transfert = true;
                            }

                          } else if (CONF_MODE[conf.mode] == CONF_MODE["prepare-infuse"]) {
                            //if (item.name == 'Three Graves') {
                            //logger.info(JSON.stringify(item, null, 2));
                            //}
                            if ((item.keep >= KeepOrNot.KEEP_INVENTORY || item.keep == KeepOrNot.KEEP_VAULT_TO_DISMANTLE)
                              && (item.bucketName == "General") && (item.transferStatus < 2 )) {
                              transfert = true;
                            }
                          } else if (CONF_MODE[conf.mode] == CONF_MODE["prepare-cleanup"]) {
                            if (item.keep == KeepOrNot.NO_KEEP
                              && (item.bucketName == "General") && (item.transferStatus < 2 )) {
                              transfert = true;
                            }
                          } else {
                            if (item.keep >= KeepOrNot.KEEP_INVENTORY
                              && (item.bucketName == "General") && (item.transferStatus < 2 )) {
                              data.messages.push(item.name + " (" + (item.lightLevel + item.lightLevelBonus) + ") should be moved from vault");
                            }
                          }
                        }

                        if (transfert) {
                          destiny.moveItem(request.session.user, item, null, data.characters[0].characterId, false, (item.keep == KeepOrNot.KEEP_EQUIP), function (err) {
                            if (err) {
                              if (err == "ErrorDestinyNoRoomInDestination") {
                                data.messages.push("No space left for moving " + item.name + " (" + (item.lightLevel + item.lightLevelBonus) + ") from vault");
                                return callback();
                              } else {
                                data.messages.push("Error while moving " + item.name + " (" + (item.lightLevel + item.lightLevelBonus) + ") from vault : " + err);
                              }
                            } else {
                              if (item.keep == KeepOrNot.KEEP_EQUIP) {
                                data.messages.push("Equip : " + item.name + " (" + (item.lightLevel + item.lightLevelBonus) + ")");
                              } else {
                                data.messages.push("Have moved from vault : " + item.name + " (" + (item.lightLevel + item.lightLevelBonus) + ")");
                              }
                            }
                            callback(err);
                          });
                        } else {
                          callback();
                        }

                      },
                      function (err) {
                        callback(err);
                      }
                    )
                  },
                  function (err) {
                    async.setImmediate(function () {
                      callback(err);
                    });
                  }
                )
              },
            ], function (err) {
              async.setImmediate(function () {
                callback(err, data, conf);
              });
            });
          }


        ],

        function (err, data) {
          if (err && err.error) {
            response.send(err);
            //data.messages.push("ERROR : "+err);
            //return response.send(JSON.stringify({messages: err}, null, 2));
          } else {
            response.send(JSON.stringify(data, null, 2));
          }
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
  destinyDb.readConf(request.session.user, function (err, doc) {
      if (err) {
        logger.error(JSON.stringify(err, null, 2));
        return response.send({error: err});
      }

      if (!doc) {
        doc = {};
      }
      if (doc) {
        if (request.body.conf && request.body.conf.chosen) {
          try {
            doc.chosen = JSON.parse(request.body.conf.chosen);
          } catch (e) {
            return response.send({error: "Not json format"});
          }
        }
        if (request.body.conf && request.body.conf.mode) {
          doc.mode = request.body.conf.mode;
        }
      }
      if (!doc.chosen) {
        doc.chosen = ["Nameless Midnight", "The Old Fashioned", "Better Devils", "Uriel's Gift"];
      }
      if (!doc.mode) {
        doc.mode = "do-nothing";
      }

      destinyDb.insertConf(request.session.user, doc, function (err, doc) {
        if (err) {
          logger.error(JSON.stringify(err, null, 2));
          response.send({error: err});
        } else {
          doc.chosen = JSON.stringify(doc.chosen, null, 2);
          response.send(JSON.stringify(doc, null, 2));
        }
      });

    }
  )
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

        });


      });
    });
    req.write(postData);
    req.end();

    req.on('error', function (e) {
      logger.error("Error in connecting Bungie : " + e);
      logger.error(e);

      return response.send("Error in connecting Bungie : " + e);
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
  if ((i1.chosen == -1) && (i1.state == 1) && (i2.state != 1)) {
    return -1;
  } else if ((i1.chosen == -1) && (i2.state == 1) && (i1.state != 1)) {
    return 1;
  }
  if ((i1.tierType > Tier.Rare) && (i1.tierType > i2.tierType)) {
    return -1;
  } else if ((i2.tierType > Tier.Rare) && (i2.tierType > i1.tierType)) {
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
  if (i1.tierType > i2.tierType) {
    return -1;
  } else if (i2.tierType > i1.tierType) {
    return 1;
  }
  if (i1.itemInstanceId > i2.itemInstanceId) {
    return -1;
  } else if (i2.itemInstanceId > i1.itemInstanceId) {
    return 1;
  }
  return 0;
}

var itemComparatorByLight = function (i1, i2) {
  if (i1.lightLevel + i1.lightLevelBonus > i2.lightLevel + i2.lightLevelBonus) {
    return -1;
  } else if (i2.lightLevel + i2.lightLevelBonus > i1.lightLevel + i1.lightLevelBonus) {
    return 1;
  }
  if (i1.tierType > i2.tierType) {
    return -1;
  } else if (i2.tierType > i1.tierType) {
    return 1;
  }
  if (i1.itemInstanceId > i2.itemInstanceId) {
    return -1;
  } else if (i2.itemInstanceId > i1.itemInstanceId) {
    return 1;
  }
  return 0;
}

var KeepOrNot = {
  KEEP_EQUIP: 15,
  KEEP_INVENTORY: 10,
  KEEP_VAULT_EXO: 6,
  KEEP_VAULT_TO_DISMANTLE: 5,
  KEEP_VAULT: 4,
  NO_KEEP: 0
};

var CONF_MODE = {
  "do-nothing": 0,
  "lock-chosen": 5,
  "optimize-inventory": 10,
  "max-light": 12,
  "prepare-infuse": 15,
  "prepare-cleanup": 20
};

var BucketsToManaged = [
  "Power Weapons", "Energy Weapons", "Kinetic Weapons",
  "Leg Armor", "Helmet", "Gauntlets", "Chest Armor", "Class Armor",
  //"Ghost", "Vehicle", "Ships"
]

var Tier = {
  Unknown: 0,
  Currency: 1,
  Basic: 2,
  Common: 3,
  Rare: 4,
  Legendary: 5,
  Exotic: 6
}