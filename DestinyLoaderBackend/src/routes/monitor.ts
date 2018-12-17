import { Router, Response, Request, NextFunction } from "express";

const async = require('async');
const https = require('https');

const debug = require('debug')('server:debugLogger:routes:monitor');
const error = require('debug')('server:error:routes:monitor');

import { DestinyDb } from "../utils/destinyDb/destinyDb";
import { Destiny } from "../utils/destiny/destiny";
import { Config } from "../utils/config/config";

//noinspection JSUnusedLocalSymbols
function monitorRouter (passport): Router {
  const router: Router = Router();

  router.route('/')
        // ====================================
        // route for getting monitor page (after authentication)
        // ====================================
        .get((request: Request, response: Response) => {
          debug("GET /");

          if (request.originalUrl.slice(-1) == '/') return response.redirect('..' + request.originalUrl.slice(0, -1));

          //logger.info(JSON.stringify(request.originalUrl, null, 2));
          if (!request.session.user) {
            delete request.session.lastAccess;
            return response.redirect('monitorStuff/login');
          } else {
            const d = new Date();
            if (request.session.lastAccess && (request.session.lastAccess > d.getTime() - 2000)) {
              delete request.session.user;
              response.redirect('monitorStuff/login');
            } else {
              request.session.lastAccess = d.getTime();

              //response.send("Welcome "+request.session.user.bungieNetUser.displayName);
              response.render('monitor', {user: request.session.user});
            }

          }
        });

  router.route('/api')
        // ====================================
        // route for getting monitorStuff data
        // ====================================
        .get((request: Request, response: Response, next: NextFunction) => {
          debug("GET /api");

          passport.authenticate('jwt-check', {session: false}, (err, user): any => {
            if (err) {
              return next(err);
            }

            if (!user) {
              const msg = 'Unauthorized';
              return response.status(401).send({status: 401, message: msg});
            }

            // debugLogger(user);
            async.waterfall([
                // Read the configuration (choice of the user)
                function (callback) {
                  DestinyDb.readConf(user, function (err, conf) {
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
                  Destiny.checkConf(conf, function (err, messages) {
                    if (err) {
                      callback(err);
                    } else {
                      //logger.info(JSON.stringify(messages, null, 2));
                      callback(null, messages, conf);
                    }
                  })
                },
                // Read the user Destiny stuff
                function (messages, conf, callback) {
                  Destiny.getUserStuff(user, function (err, data) {
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
//                  // Calculate order and what to keep
//                  function (data, conf, callback) {
//                    //logger.info(JSON.stringify(conf, null, 2));
//                    //logger.info(JSON.stringify(data.items, null, 2));
//
//                    async.eachSeries(
//                      data.items,
//                      function (itemsByBuckets, callback) {
//                        //logger.info(JSON.stringify(itemsByBuckets, null, 2));
//                        async.eachSeries(
//                          itemsByBuckets,
//                          function (itemsByType, callback) {
//                            //logger.info(JSON.stringify(itemsByType, null, 2));
//
//                            async.waterfall([
//                                // First, add attribute if chosen by the user
//                                function (callback) {
//                                  async.eachSeries(
//                                    itemsByType,
//                                    function (item, callback) {
//                                      item.chosen = -1;
//                                      if (conf.chosen.indexOf(item.name) > -1) {
//                                        item.chosen = conf.chosen.length - conf.chosen.indexOf(item.name);
//                                      }
//                                      //logger.info(JSON.stringify(item, null, 2));
//                                      callback();
//                                    },
//                                    function (err) {
//                                      callback(err);
//                                    }
//                                  )
//
//                                },
//                                // sort the itemsByType
//                                function (callback) {
//                                  itemsByType.sort(itemComparator);
//                                  callback();
//                                },
//                                // find the chosen twice
//                                function (callback) {
//                                  const found = [];
//                                  async.eachSeries(
//                                    itemsByType,
//                                    function (item, callback) {
//                                      if (item.chosen > -1) {
//                                        if (found.indexOf(item.name) > -1) {
//                                          item.chosen = -1;
//                                        }
//                                        found.push(item.name);
//                                      }
//                                      callback();
//                                    },
//                                    function (err) {
//                                      callback(err);
//                                    }
//                                  )
//                                },
//                                // sort again after chosen that exists twice
//                                function (callback) {
//                                  itemsByType.sort(itemComparator);
//                                  callback();
//                                },
//                                // find witch to keep
//                                function (callback) {
//                                  let count = 0;
//                                  let countItemTooHigh = 0;
//                                  const found = [];
//                                  async.eachSeries(
//                                    itemsByType,
//                                    function (item, callback) {
//                                      // chosen exo                    -> INVENTORY
//                                      // chosen legendary              -> INVENTORY
//                                      // NOT ANY MORE : first          -> INVENTORY (3 for not weapon)
//                                      // first level too high          -> INVENTORY
//                                      // not chosen 3           more   -> VAULT
//                                      // first exo                     -> VAULT_EXO
//                                      // whatever useful for dismantle -> VAULT_TO_DISMANTLE (later)
//
//                                      //let countMaxNotChosen = 3;
//                                      //if (item.itemType == 3) {
//                                      //  // Weapon
//                                      //  countMaxNotChosen = 1;
//                                      //}
//                                      //logger.info(JSON.stringify(item.itemType, null, 2));
//
//                                      item.keep = KeepOrNot.NO_KEEP;
//                                      if (item.equipRequiredLevel && (item.equipRequiredLevel > data.characters[0].baseCharacterLevel)) {
//                                        if (countItemTooHigh == 0) {
//                                          item.keep = KeepOrNot.KEEP_INVENTORY
//                                          //logger.info("- 1 "+item.bucketNameTarget+" "+item.bucketName+" "+item.name+" "+item.lightLevel);
//                                        } else {
//                                          item.keep = KeepOrNot.KEEP_VAULT
//                                        }
//                                        countItemTooHigh++;
//                                      } else if ((item.chosen > -1) && (item.tierType == Tier.Exotic)) {
//                                        item.keep = KeepOrNot.KEEP_INVENTORY
//                                      } else if ((item.chosen > -1) && (item.tierType == Tier.Legendary)) {
//                                        item.keep = KeepOrNot.KEEP_INVENTORY;
//                                        count++;
//                                      } else if ((item.tierType <= Tier.Legendary)) {
//                                        //if (count < countMaxNotChosen) {
//                                        //  item.keep = KeepOrNot.KEEP_INVENTORY
//                                        //} else if (count < countMaxNotChosen + 3) {
//                                        //  item.keep = KeepOrNot.KEEP_VAULT
//                                        //}
//                                        //count++;
//                                      } else if (item.tierType == Tier.Exotic) {
//                                        if (found.indexOf(item.name) == -1) {
//                                          item.keep = KeepOrNot.KEEP_VAULT_EXO;
//                                          found.push(item.name);
//                                        }
//                                      }
//                                      callback();
//                                    },
//                                    function (err) {
//                                      callback(err);
//                                    }
//                                  );
//                                }
//                              ],
//                              function (err) {
//                                //logger.info(JSON.stringify(itemsByType, null, 2));
//                                callback(err, data, conf);
//                              }
//                            )
//                          },
//                          function (err) {
//                            callback(err, data, conf);
//                          }
//                        )
//                      },
//                      function (err) {
//                        async.setImmediate(function () {
//                          callback(err, data, conf);
//                        });
//                      }
//                    )
//
//                  },
//                  // Calculate the "best" inventories
//                  function (data, conf, callback) {
//                    //logger.info(JSON.stringify(conf, null, 2));
//                    //logger.info(JSON.stringify(data.items.length, null, 2));
//
//                    // remove one level (all in target bucket)
//                    const items = {};
//                    async.eachSeries(
//                      data.items,
//                      function (itemsByBuckets, callback) {
//                        let lastBucketNameTarget;
//                        async.eachSeries(
//                          itemsByBuckets,
//                          function (itemsByType, callback) {
//                            async.eachSeries(
//                              itemsByType,
//                              function (item, callback) {
//                                if (BucketsToManaged.indexOf(item.bucketNameTarget) > -1) {
//                                  if (!items[item.bucketNameTarget]) {
//                                    items[item.bucketNameTarget] = [];
//                                  }
//                                  items[item.bucketNameTarget].push(item);
//                                  lastBucketNameTarget = item.bucketNameTarget;
//                                  //} else {
//                                  //logger.info(JSON.stringify(item.bucketNameTarget, null, 2));
//                                }
//                                callback(null);
//                              },
//                              function (err) {
//                                callback(err);
//                              }
//                            )
//                          },
//                          function (err) {
//                            if (lastBucketNameTarget) {
//                              items[lastBucketNameTarget].sort(itemComparator)
//                            }
//                            callback(err);
//                          }
//                        )
//                      },
//                      function (err) {
//                        data.items = items;
//                        //logger.info(JSON.stringify(data, null, 2));
//                        async.setImmediate(function () {
//                          callback(err, data, conf);
//                        });
//                      }
//                    )
//                  },
//                  // Max light if needed
//                  function (data, conf, callback) {
//                    //logger.info(JSON.stringify(conf, null, 2));
//                    //logger.info(JSON.stringify(data.items, null, 2));
//
//                    if (CONF_MODE[conf.mode] != CONF_MODE["max-light"]) {
//                      return callback(null, data, conf);
//                    }
//
//                    // create max light lists
//                    const maxLights = {};
//                    async.eachSeries(
//                      data.items,
//                      function (itemsByBuckets, callback) {
//                        let bucketName;
//                        async.eachSeries(
//                          itemsByBuckets,
//                          function (item, callback) {
//                            if (item.bucketNameTarget) {
//                              if (!maxLights[item.bucketNameTarget]) {
//                                maxLights[item.bucketNameTarget] = [];
//                              }
//                              if (item.equipRequiredLevel && (item.equipRequiredLevel <= data.characters[0].baseCharacterLevel)) {
//                                if (item.bucketName != "Lost Items") {
//                                  maxLights[item.bucketNameTarget].push(item);
//                                }
//                                bucketName = item.bucketNameTarget;
//                              }
//                            }
//                            callback(null);
//                          },
//                          function (err) {
//                            maxLights[bucketName].sort(itemComparatorByLight);
//                            callback(err);
//                          }
//                        )
//                      },
//                      function (err) {
//                        if (err) {
//                          return callback(err);
//                        }
//
//                        let itemsToEquip = [];
//                        let lightMax = 0;
//                        let cpt1Legendary = 0;
//                        let cpt2Legendary = 0;
//                        let cpt3Legendary = 0;
//                        maxLights["Kinetic Weapons"].forEach(
//                          function (item1) {
//                            // If not first and first is not an exo, return
//                            let captEcoEquipped = 0;
//                            if (cpt1Legendary > 0) {
//                              return callback;
//                            } else if (item1.tierType < Tier.Exotic) {
//                              cpt1Legendary++;
//                            } else {
//                              captEcoEquipped++;
//                            }
//                            maxLights["Energy Weapons"].forEach(
//                              function (item2) {
//                                // If not first and first is not an exo, return
//                                if (cpt2Legendary > 0) {
//                                  return callback;
//                                } else if (item2.tierType < Tier.Exotic) {
//                                  cpt2Legendary++;
//                                } else {
//                                  captEcoEquipped++;
//                                }
//                                maxLights["Power Weapons"].forEach(
//                                  function (item3) {
//                                    // If not first and first is not an exo, return
//                                    if (cpt3Legendary > 0) {
//                                      return callback;
//                                    } else if (item3.tierType < Tier.Exotic) {
//                                      cpt3Legendary++;
//                                    } else {
//                                      captEcoEquipped++;
//                                    }
//                                    const light =
//                                      item1.lightLevel + item1.lightLevelBonus +
//                                      item2.lightLevel + item2.lightLevelBonus +
//                                      item3.lightLevel + item3.lightLevelBonus;
//                                    if ((captEcoEquipped < 2) && (light > lightMax)) {
//                                      itemsToEquip = [item1, item2, item3];
//                                    }
//                                  }
//                                )
//                              }
//                            )
//                          }
//                        );
//                        itemsToEquip.forEach(function (item) {
//                          item.keep = KeepOrNot.KEEP_EQUIP;
//                        });
//                        itemsToEquip = [];
//                        lightMax = 0;
//                        cpt1Legendary = 0;
//                        cpt2Legendary = 0;
//                        cpt3Legendary = 0;
//                        let cpt4Legendary = 0;
//                        maxLights["Helmet"].forEach(
//                          function (item1) {
//                            // If not first and first is not an exo, return
//                            let captEcoEquipped = 0;
//                            if (cpt1Legendary > 0) {
//                              return callback;
//                            } else if (item1.tierType < Tier.Exotic) {
//                              cpt1Legendary++;
//                            } else {
//                              captEcoEquipped++;
//                            }
//                            maxLights["Gauntlets"].forEach(
//                              function (item2) {
//                                // If not first and first is not an exo, return
//                                if (cpt2Legendary > 0) {
//                                  return callback;
//                                } else if (item2.tierType < Tier.Exotic) {
//                                  cpt2Legendary++;
//                                } else {
//                                  captEcoEquipped++;
//                                }
//                                maxLights["Chest Armor"].forEach(
//                                  function (item3) {
//                                    // If not first and first is not an exo, return
//                                    if (cpt3Legendary > 0) {
//                                      return callback;
//                                    } else if (item3.tierType < Tier.Exotic) {
//                                      cpt3Legendary++;
//                                    } else {
//                                      captEcoEquipped++;
//                                    }
//                                    maxLights["Leg Armor"].forEach(
//                                      function (item4) {
//                                        // If not first and first is not an exo, return
//                                        if (cpt4Legendary > 0) {
//                                          return callback;
//                                        } else if (item4.tierType < Tier.Exotic) {
//                                          cpt4Legendary++;
//                                        } else {
//                                          captEcoEquipped++;
//                                        }
//                                        const light =
//                                          item1.lightLevel + item1.lightLevelBonus +
//                                          item2.lightLevel + item2.lightLevelBonus +
//                                          item3.lightLevel + item3.lightLevelBonus +
//                                          item4.lightLevel + item4.lightLevelBonus;
//                                        if ((captEcoEquipped < 2) && (light > lightMax)) {
//                                          itemsToEquip = [item1, item2, item3, item4];
//                                        }
//                                      }
//                                    )
//                                  }
//                                )
//                              }
//                            )
//                          }
//                        );
//                        itemsToEquip.forEach(function (item) {
//                          item.keep = KeepOrNot.KEEP_EQUIP;
//                        });
//
//                        maxLights["Class Armor"][0].keep = KeepOrNot.KEEP_EQUIP;
//
//                        //logger.info(JSON.stringify(data.items, null, 2));
//
//
//                        callback(null, data, conf);
//                      }
//                    )
//                  },
//                  // Can we infuse ?
//                  function (data, conf, callback) {
//                    //logger.info(JSON.stringify(conf, null, 2));
//                    //logger.info(JSON.stringify(data.items.length, null, 2));
//
//                    // Categories by infusionCategoryName
//                    const itemsByInfusion = {};
//                    async.eachSeries(
//                      data.items,
//                      function (itemsByBuckets, callback1) {
//                        //logger.info(JSON.stringify(itemsByBuckets, null, 2));
//                        async.eachSeries(
//                          itemsByBuckets,
//                          function (item, callback) {
//                            if (item.infusionCategoryName) {
//                              if (!itemsByInfusion[item.infusionCategoryName]) {
//                                itemsByInfusion[item.infusionCategoryName] = [];
//                              }
//                              itemsByInfusion[item.infusionCategoryName].push(item);
//                            }
//                            callback(null);
//                          },
//                          function (err) {
//                            callback1(err);
//                          }
//                        )
//                      },
//                      function (err) {
//                        if (err) {
//                          return callback(err);
//                        }
//                        // sorts each infusion category
//                        async.eachSeries(
//                          itemsByInfusion,
//                          function (items, callback) {
//                            items.sort(itemComparator);
//
//                            const infusions = {};
//                            const itemsToInfuse = {};
//                            //logger.info(JSON.stringify(items, null, 2));
//
//                            // let's search in inventory to upgrade
//                            async.eachSeries(
//                              items,
//                              function (itemToInfuse, callback) {
//                                //logger.info(itemToInfuse.name);
//                                if (itemToInfuse.keep <= KeepOrNot.KEEP_VAULT_EXO) {
//                                  return callback(null);
//                                }
//                                //logger.info(JSON.stringify(itemToInfuse.name, null, 2));
//                                let itemFound = false;
//                                async.eachSeries(
//                                  items,
//                                  function (itemToDismantle, callback) {
//                                    if (itemToInfuse.itemInstanceId == itemToDismantle.itemInstanceId) {
//                                      //logger.info("found : "+itemToInfuse.name);
//                                      itemFound = true;
//                                    } else if (itemFound) {
//                                      // if not chosen and not locked and light greater, propose
//                                      if ((itemToDismantle.chosen == -1) && (itemToDismantle.keep < KeepOrNot.KEEP_VAULT_EXO) && (itemToDismantle.lightLevel > itemToInfuse.lightLevel)) {
//                                        //logger.info(JSON.stringify(itemToDismantle, null, 2));
//                                        if (itemToDismantle.keep < KeepOrNot.KEEP_VAULT_TO_DISMANTLE) {
//                                          itemToDismantle.keep = KeepOrNot.KEEP_VAULT_TO_DISMANTLE;
//
//                                          if (!infusions[itemToInfuse.itemInstanceId]) {
//                                            infusions[itemToInfuse.itemInstanceId] = [];
//                                          }
//                                          infusions[itemToInfuse.itemInstanceId].push(itemToDismantle);
//                                          itemsToInfuse[itemToInfuse.itemInstanceId] = itemToInfuse;
//                                        }
//                                      }
//                                    }
//                                    callback(null);
//                                  },
//                                  function (err) {
//                                    callback(err);
//                                  }
//                                )
//                              },
//                              function (err) {
//                                if (err) {
//                                  return callback(err);
//                                }
//                                // Add the messages for this category
//                                //logger.info(JSON.stringify(infusions,null,2));
//                                Object.keys(infusions).forEach(function (itemInstanceId) {
//                                    //logger.info(JSON.stringify(itemsToInfuse[itemInstanceId],null,2));
//                                  let message = itemsToInfuse[itemInstanceId].name + ' (' + (itemsToInfuse[itemInstanceId].lightLevel + itemsToInfuse[itemInstanceId].lightLevelBonus) + ") from " + itemsToInfuse[itemInstanceId].bucketName + " can be highlight by infusing ";
//                                  let count = 0;
//                                  infusions[itemInstanceId].forEach(function (itemToDismantle) {
//                                      if (count < 3) {
//                                        message += "<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" + itemToDismantle.name + ' (' + (itemToDismantle.lightLevel + itemToDismantle.lightLevelBonus) + ") from " + itemToDismantle.bucketName.replace("General", "Vault");
//                                      } else if (count == 3) {
//                                        message += "<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;...";
//                                      }
//                                      count++;
//                                    });
//                                    data.messages.push(message);
//                                  }
//                                );
//                                async.setImmediate(function () {
//                                  callback();
//                                });
//
//
//                              });
//                          },
//                          function (err) {
//
//                            //logger.info(JSON.stringify(itemsByInfusion, null, 2));
//                            //logger.info(JSON.stringify(data.messages, null, 2));
//                            callback(err, data, conf);
//                          }
//                        )
//                      }
//                    )
//                  },
//                  // Try to Lock
//                  function (data, conf, callback) {
//                    //logger.info(JSON.stringify(conf, null, 2));
//                    //logger.info(JSON.stringify(data.items.length, null, 2));
//
//                    async.eachSeries(
//                      data.items,
//                      function (itemsByBuckets, callback) {
//                        async.eachSeries(
//                          itemsByBuckets,
//                          function (item, callback) {
//                            //if (item.name == "Penumbra GSm") {
//                            //logger.info(JSON.stringify(item,null,2));
//                            //}
//                            let toLock = false;
//                            if ((item.chosen >= 0) && (item.keep == KeepOrNot.KEEP_INVENTORY) && (item.state != 1)) {
//                              toLock = true;
//                            } else if ((item.tierType >= Tier.Exotic) && (item.state != 1)) {
//                              toLock = true;
//                            }
//
//                            if (toLock) {
//                              if (conf.mode && CONF_MODE[conf.mode] && CONF_MODE[conf.mode] >= CONF_MODE["lock-chosen"]) {
//                                Destiny.lockItem(request.session.user, item, data.characters[0].characterId, true, function (err) {
//                                  if (err) {
//                                    error(err);
//                                    data.messages.push("Error while locking " + item.name + " (" + (item.lightLevel + item.lightLevelBonus) + ") : " + err);
//                                  } else {
//                                    data.messages.push("Have locked : " + item.name + " (" + (item.lightLevel + item.lightLevelBonus) + ")");
//                                  }
//                                  callback();
//                                });
//                              } else {
//                                data.messages.push(item.name + " (" + (item.lightLevel + item.lightLevelBonus) + ") found and should be locked");
//                                callback();
//                              }
//                            } else {
//                              callback();
//                            }
//                          },
//                          function (err) {
//                            callback(err);
//                          }
//                        )
//                      },
//                      function (err) {
//                        async.setImmediate(function () {
//                          callback(err, data, conf);
//                        });
//                      }
//                    )
//                  },
//                  // Try move things
//                  function (data, conf, callback) {
//                    //logger.info(JSON.stringify(conf, null, 2));
//                    //logger.info(JSON.stringify(data.items.length, null, 2));
//
//                    async.series([
//                      // First move to Vault
//                      function (callback) {
//                        async.eachSeries(
//                          data.items,
//                          function (itemsByBuckets, callback) {
//                            //logger.info(JSON.stringify(itemsByBuckets, null, 2));
//                            let firstCanBeEquipped;
//                            async.eachSeries(
//                              itemsByBuckets,
//                              function (item, callback) {
//                                // if one need to be equipped, just get the first unequipped to remember
//                                if (!firstCanBeEquipped && item.tierType < Tier.Exotic && item.keep == KeepOrNot.KEEP_INVENTORY && (item.bucketName != "General") && (item.bucketName != "Lost Items")) {
//                                  firstCanBeEquipped = item;
//                                }
//
//                                let transfer = false;
//
//                                if (conf.mode && CONF_MODE[conf.mode]) {
//
//                                  if ((CONF_MODE[conf.mode] == CONF_MODE["optimize-inventory"]) || (CONF_MODE[conf.mode] == CONF_MODE["max-light"])) {
//                                    if (item.keep < KeepOrNot.KEEP_INVENTORY
//                                      && (item.bucketName != "General") && (item.bucketName != "Lost Items") && (item.transferStatus < 2)) {
//                                      transfer = true;
//                                    }
//
//                                  } else if (CONF_MODE[conf.mode] == CONF_MODE["prepare-infuse"]) {
//                                    if (item.keep < KeepOrNot.KEEP_INVENTORY && item.keep != KeepOrNot.KEEP_VAULT_TO_DISMANTLE
//                                      && (item.bucketName != "General") && (item.bucketName != "Lost Items") && (item.transferStatus < 2)) {
//                                      transfer = true;
//                                    }
//                                  } else if (CONF_MODE[conf.mode] == CONF_MODE["prepare-cleanup"]) {
//                                    if (item.keep != KeepOrNot.NO_KEEP && !item.isEquipped
//                                      && (item.bucketName != "General") && (item.bucketName != "Lost Items") && (item.transferStatus < 2)) {
//                                      transfer = true;
//                                    }
//                                  } else {
//                                    if (item.keep < KeepOrNot.KEEP_INVENTORY
//                                      && (item.bucketName != "General") && (item.bucketName != "Lost Items") && (item.transferStatus < 2)) {
//                                      data.messages.push(item.name + " (" + (item.lightLevel + item.lightLevelBonus) + ") should be moved to vault");
//                                    }
//                                  }
//                                }
//
//                                if (transfer) {
//                                  if (item.isEquipped && (!firstCanBeEquipped || (item.itemInstanceId == firstCanBeEquipped.itemInstanceId))) {
//                                    callback();
//                                  } else {
//                                    Destiny.moveItem(request.session.user, item, firstCanBeEquipped, data.characters[0].characterId, true, false, function (err) {
//                                      if (err) {
//                                        //logger.info(JSON.stringify(item, null, 2));
//                                        data.messages.push("Error while moving " + item.name + " (" + (item.lightLevel + item.lightLevelBonus) + ") to vault : " + err);
//                                      } else {
//                                        data.messages.push("Have moved to vault : " + item.name + " (" + (item.lightLevel + item.lightLevelBonus) + ")");
//                                      }
//                                      callback(err);
//                                    });
//                                  }
//                                } else {
//                                  callback();
//                                }
//
//                              },
//                              function (err) {
//                                callback(err);
//                              }
//                            )
//                          },
//                          function (err) {
//                            async.setImmediate(function () {
//                              callback(err);
//                            });
//                          }
//                        )
//                      },
//                      // Then move to inventories
//                      function (callback) {
//                        async.eachSeries(
//                          data.items,
//                          function (itemsByBuckets, callback) {
//                            async.eachSeries(
//                              itemsByBuckets,
//                              function (item, callback) {
//
//                                let transfer = false;
//
//                                if (conf.mode && CONF_MODE[conf.mode]) {
//
//                                  if ((CONF_MODE[conf.mode] == CONF_MODE["optimize-inventory"]) || (CONF_MODE[conf.mode] == CONF_MODE["max-light"])) {
//                                    if (item.keep == KeepOrNot.KEEP_INVENTORY
//                                      && ((item.bucketName == "General") || (item.characterId != data.characters[0].characterId)) && (item.transferStatus < 2)) {
//                                      transfer = true;
//                                    } else if ((item.keep == KeepOrNot.KEEP_EQUIP) && !item.isEquipped) {
//                                      transfer = true;
//                                    }
//
//                                  } else if (CONF_MODE[conf.mode] == CONF_MODE["prepare-infuse"]) {
//                                    //if (item.name == 'Three Graves') {
//                                    //logger.info(JSON.stringify(item, null, 2));
//                                    //}
//                                    if ((item.keep >= KeepOrNot.KEEP_INVENTORY || item.keep == KeepOrNot.KEEP_VAULT_TO_DISMANTLE)
//                                      && (item.bucketName == "General") && (item.transferStatus < 2)) {
//                                      transfer = true;
//                                    }
//                                  } else if (CONF_MODE[conf.mode] == CONF_MODE["prepare-cleanup"]) {
//                                    if (item.keep == KeepOrNot.NO_KEEP
//                                      && (item.bucketName == "General") && (item.transferStatus < 2)) {
//                                      transfer = true;
//                                    }
//                                  } else {
//                                    if (item.keep >= KeepOrNot.KEEP_INVENTORY
//                                      && (item.bucketName == "General") && (item.transferStatus < 2)) {
//                                      data.messages.push(item.name + " (" + (item.lightLevel + item.lightLevelBonus) + ") should be moved from vault");
//                                    }
//                                  }
//                                }
//
//                                if (transfer) {
//                                  Destiny.moveItem(request.session.user, item, null, data.characters[0].characterId, false, (item.keep == KeepOrNot.KEEP_EQUIP), function (err) {
//                                    if (err) {
//                                      if (err == "ErrorDestinyNoRoomInDestination") {
//                                        data.messages.push("No space left for moving " + item.name + " (" + (item.lightLevel + item.lightLevelBonus) + ") from vault");
//                                        return callback();
//                                      } else {
//                                        data.messages.push("Error while moving " + item.name + " (" + (item.lightLevel + item.lightLevelBonus) + ") from vault : " + err);
//                                      }
//                                    } else {
//                                      if (item.keep == KeepOrNot.KEEP_EQUIP) {
//                                        data.messages.push("Equip : " + item.name + " (" + (item.lightLevel + item.lightLevelBonus) + ")");
//                                      } else {
//                                        data.messages.push("Have moved from vault : " + item.name + " (" + (item.lightLevel + item.lightLevelBonus) + ")");
//                                      }
//                                    }
//                                    callback(err);
//                                  });
//                                } else {
//                                  callback();
//                                }
//
//                              },
//                              function (err) {
//                                callback(err);
//                              }
//                            )
//                          },
//                          function (err) {
//                            async.setImmediate(function () {
//                              callback(err);
//                            });
//                          }
//                        )
//                      },
//                    ], function (err) {
//                      async.setImmediate(function () {
//                        callback(err, data, conf);
//                      });
//                    });
//                  }
              ],

              function (err, data) {
                //error(err);
                if (err) {
                  response.status(500).send(err);
                  //data.messages.push("ERROR : "+err);
                  //return response.send(JSON.stringify({messages: err}, null, 2));
                } else {
                  let result = {
                    data: data,
                    refreshedToken: user.refreshedToken
                  };
                  response.send(JSON.stringify(result, null, 2));
                  debug("GET /api done");
                }
              }
            )
            ;
            //logger.info(JSON.stringify(request.session.user, null, 2));
            //response.send("Welcome "+request.session.user.bungieNetUser.displayName);
            //response.send({ user: request.session.user });

          })(request, response, next);
        });

  router.route('/value')
        // ====================================
        // route for setting user values (important stuff, state, ...)
        // ====================================
        .post((request: Request, response: Response) => {
          debug("POST /value");

          //logger.info(JSON.stringify(request.body, null, 2));
          DestinyDb.readConf(request.session.user, function (err, doc) {
              if (err) {
                error(JSON.stringify(err, null, 2));
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

              DestinyDb.insertConf(request.session.user, doc, function (err, doc) {
                if (err) {
                  error(JSON.stringify(err, null, 2));
                  response.send({error: err});
                } else {
                  doc.chosen = JSON.stringify(doc.chosen, null, 2);
                  response.send(JSON.stringify(doc, null, 2));
                }
              });

            }
          )
        });

  router.route('/login')
        // ====================================
        // route for login (redirect to bungie)
        // ====================================
        .get((request: Request, response: Response) => {
          debug("GET /login");

          //logger.info("GET /login");

          Destiny.getAuthenticationCodeUrl(function (err, url) {
            response.redirect(url);
          });
        });

  router.route('/login/callback')
        // ====================================
        // route for callback from bungie (after login)
        // ====================================
        .get((request: Request, response: Response) => {
          debug("GET /login/callback");


          //debugLogger(request.query.code);

          if (!request.query || !request.query.code) {
            return response.redirect('/login');
          }

          const code = request.query.code;

          // We've got the code, get the authentication stuff
          Destiny.getTokenUrl(function (err, url) {
            let postData = "grant_type=authorization_code&code=" + code + "";
            let options = {
              hostname: 'www.bungie.net',
              port: 443,
              path: url,
              headers: {
                'Authorization': 'Basic ' + new Buffer(Config.oAuthClientId + ":" + Config.oAuthClientSecret).toString('base64'),
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': postData.length
              },
              method: 'POST'
            };

            //debugLogger(JSON.stringify(options, null, 2));
            //debugLogger(JSON.stringify(postData, null, 2));

            const req = https.request(options, function (res) {
              //debugLogger("statusCode: ", res.statusCode);
              //debugLogger("headers: ", res.headers);
              //debugLogger(res);

              let content = '';

              res.on('data', function (d) {
                //debugLogger("data");
                //debugLogger(d.toString());
                content += d.toString();
              });
              res.on('end', function () {
                //debugLogger('end');
                //debugLogger(d);

                let val;

                try {
                  //debugLogger('end : '+content);
                  val = JSON.parse(content);
                } catch (e) {
                  error("Error in getting Bungie data : " + e + 'from ' + url);
                  return response.send(e);
                }

                if (val.error) {
                  error(JSON.stringify(val, null, 2));
                  error("Error in reading Bungie data : " + val.error_description);
                  return response.send("Error in reading Bungie data : " + val.error_description);
                }

                // Create the user
                //logger.info(JSON.stringify(val, null, 2));
                let user = {auth: val};

                // fill it
                Destiny.getCurrentUser(user, function (err, data) {
                  if (err) return response.status(500).send(err);

                  user['destinyMemberships'] = data.destinyMemberships;
                  user['bungieNetUser'] = data.bungieNetUser;

                  request.session.user = user;

                  response.redirect('..');

                });


              });
            });
            req.write(postData);
            req.end();

            req.on('error', function (e) {
              error("Error in connecting Bungie : " + e);
              error(e);

              return response.send("Error in connecting Bungie : " + e);
            });

          });

        });


  return router;
}

export { monitorRouter };

//noinspection JSUnusedLocalSymbols
const itemComparator = function (i1, i2) {
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
  if ((i1.tierType >= Tier.Rare) && (i1.tierType > i2.tierType)) {
    return -1;
  } else if ((i2.tierType >= Tier.Rare) && (i2.tierType > i1.tierType)) {
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
};

//noinspection JSUnusedLocalSymbols
const itemComparatorByLight = function (i1, i2) {
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
};

//noinspection JSUnusedLocalSymbols
const KeepOrNot = {
  KEEP_EQUIP: 15,
  KEEP_INVENTORY: 10,
  KEEP_VAULT_EXO: 6,
  KEEP_VAULT_TO_DISMANTLE: 5,
  KEEP_VAULT: 4,
  NO_KEEP: 0
};

//noinspection JSUnusedLocalSymbols
const CONF_MODE = {
  "do-nothing": 0,
  "lock-chosen": 5,
  "optimize-inventory": 10,
  "max-light": 12,
  "prepare-infuse": 15,
  "prepare-cleanup": 20
};

//noinspection JSUnusedLocalSymbols
const BucketsToManaged = [
  "Power Weapons", "Energy Weapons", "Kinetic Weapons",
  "Leg Armor", "Helmet", "Gauntlets", "Chest Armor", "Class Armor",
  "Pursuits"
  //"Ghost", "Vehicle", "Ships"
];

const Tier = {
  Unknown: 0,
  Currency: 1,
  Basic: 2,
  Common: 3,
  Rare: 4,
  Legendary: 5,
  Exotic: 6
};