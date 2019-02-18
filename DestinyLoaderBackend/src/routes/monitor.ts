import { Router, Response, Request, NextFunction } from "express";
import * as _ from "lodash";

const async = require('async');
const https = require('https');

const debug = require('debug')('server:debug:routes:monitor');
const error = require('debug')('server:error:routes:monitor');

import { DestinyDb } from "../utils/destinyDb/destinyDb";
import { Destiny } from "../utils/destiny/destiny";
import { Config } from "../utils/config/config";
import { ObjectiveTime } from "../models/objectiveTime";

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
          debug("GET /api " + request.query.lang);

          //debug(request.query.lang);
          let lang = request.query.lang;

          passport.authenticate('jwt-check', {session: false}, (err, user): any => {
            if (err) {
              return next(err);
            }

            if (!user) {
              const msg = 'Unauthorized';
              return response.status(401).send({status: 401, message: msg});
            }

            // debug(user);
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
                  }, lang)
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

                  }, lang);
                },
                // Add the times summed
                function (data, conf, callback) {
                  Destiny.addObjectivesTime(user, data, callback);
                },
                // Add current times for the user
                function (data, times, callback) {
                  data.currentTimes = [];
                  times.forEach((objectiveTime: ObjectiveTime) => {
                    //debug(objectiveTime);
                    if (!objectiveTime.finished && (objectiveTime.bungieNetUser === user.bungieNetUser.membershipId)) {
                      data.currentTimes.push(objectiveTime);
                      Destiny.addUserToObjectiveRunningList(user);
                    }
                  });
                  //debug(data.currentTimes);
                  callback(null, data);
                }
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
        // route for getting user choices (important stuff, state, ...)
        // ====================================
        .get((request: Request, response: Response, next: NextFunction) => {
          debug("GET /value ");

          passport.authenticate('jwt-check', {session: false}, (err, user): any => {
            if (err) {
              return next(err);
            }

            if (!user) {
              const msg = 'Unauthorized';
              return response.status(401).send({status: 401, message: msg});
            }

            // Read the configuration (choice of the user)
            DestinyDb.readConf(user, function (err, conf) {
              if (err) {
                response.status(500).send(err);
                //data.messages.push("ERROR : "+err);
                //return response.send(JSON.stringify({messages: err}, null, 2));
              } else {
                let result = {
                  data: _.pick(conf, ['showOnlyPowerfulGear', 'language', 'selectedPursuits', 'user']),
                  refreshedToken: user.refreshedToken
                };
                response.send(JSON.stringify(result, null, 2));
                debug("GET /value done");
              }
            });

          })(request, response, next);
        });

  router.route('/value')
        // ====================================
        // route for setting user choices (important stuff, state, ...)
        // ====================================
        .post((request: Request, response: Response, next: NextFunction) => {
          debug("POST /value");

          passport.authenticate('jwt-check', {session: false}, (err, user): any => {
            if (err) {
              return next(err);
            }

            if (!user) {
              const msg = 'Unauthorized';
              return response.status(401).send({status: 401, message: msg});
            }

            let conf = request.body.data;
            //debug(conf);


            DestinyDb.insertConf(user, conf, function (err, doc) {
              if (err) {
                error(JSON.stringify(err, null, 2));
                response.send({error: err});
              } else {
                response.send(JSON.stringify(doc, null, 2));
              }
            });

          })(request, response, next);
        });

  router.route('/running')
        // ====================================
        // route for setting user running objective
        // ====================================
        .post((request: Request, response: Response, next: NextFunction) => {
          debug("POST /running");

          passport.authenticate('jwt-check', {session: false}, (err, user): any => {
            if (err) {
              return next(err);
            }

            if (!user) {
              const msg = 'Unauthorized';
              return response.status(401).send({status: 401, message: msg});
            }

            //debug(request.body);
            if (request.body.action && request.body.action === 'start') {

              const objective = request.body.objective;

              //debug(request.body.objective.timeTillFinished);
              const objTime: ObjectiveTime = new ObjectiveTime({
                bungieNetUser: user.bungieNetUser.membershipId,
                characterId: request.body.characterId,
                pursuitId: request.body.pursuitId,
                objectiveId: objective.objectiveHash,
                finished: false,
                timeStart: new Date(),
                countStart: objective.progress,
                countEnd: objective.progress,
                countFinished: objective.completionValue
              });
              //debug(objTime);

              //noinspection JSUnusedLocalSymbols
              DestinyDb.insertTime(user.bungieNetUser.membershipId, objTime, (err, result) => {
                if (err) {
                  error(JSON.stringify(err, null, 2));
                  response.status(500).send({error: err});
                } else {
                  //debug(request.body.objective.timeTillFinished);
                  objective.runningTimeObjective = objTime;
                  response.send(JSON.stringify(objective, null, 2));
                }
              })
            } else {
              const objective = request.body.objective;

              const objTime: ObjectiveTime = objective.runningTimeObjective;
              objTime.finished = true;
              objTime.timeEnd = new Date();
              objTime.countEnd = objective.progress;


              //debug(objTime);

              //noinspection JSUnusedLocalSymbols
              DestinyDb.insertTime(user.bungieNetUser.membershipId, objTime, (err, objTime) => {
                if (err) {
                  error(JSON.stringify(err, null, 2));
                  response.status(500).send({error: err});
                } else {
                  //debug(objTime);
                  //objective.runningTimeObjective = objTime.ops[0];
                  response.send(JSON.stringify(objective, null, 2));
                }
              })

            }

          })(request, response, next);
//          //logger.info(JSON.stringify(request.body, null, 2));
//          DestinyDb.readConf(request.session.user, function (err, doc) {
//              if (err) {
//                error(JSON.stringify(err, null, 2));
//                return response.send({error: err});
//              }
//
//              if (!doc) {
//                doc = {};
//              }
//              if (doc) {
//                if (request.body.conf && request.body.conf.chosen) {
//                  try {
//                    doc.chosen = JSON.parse(request.body.conf.chosen);
//                  } catch (e) {
//                    return response.send({error: "Not json format"});
//                  }
//                }
//                if (request.body.conf && request.body.conf.mode) {
//                  doc.mode = request.body.conf.mode;
//                }
//              }
//              if (!doc.chosen) {
//                doc.chosen = ["Nameless Midnight", "The Old Fashioned", "Better Devils", "Uriel's Gift"];
//              }
//              if (!doc.mode) {
//                doc.mode = "do-nothing";
//              }
//
//              DestinyDb.insertConf(request.session.user, doc, function (err, doc) {
//                if (err) {
//                  error(JSON.stringify(err, null, 2));
//                  response.send({error: err});
//                } else {
//                  doc.chosen = JSON.stringify(doc.chosen, null, 2);
//                  response.send(JSON.stringify(doc, null, 2));
//                }
//              });
//
//            }
//          )
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


          //debug(request.query.code);

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
                'Authorization': 'Basic ' + Buffer.from(Config.oAuthClientId + ":" + Config.oAuthClientSecret).toString('base64'),
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': postData.length
              },
              method: 'POST'
            };

            //debug(JSON.stringify(options, null, 2));
            //debug(JSON.stringify(postData, null, 2));

            const req = https.request(options, function (res) {
              //debug("statusCode: ", res.statusCode);
              //debug("headers: ", res.headers);
              //debug(res);

              let content = '';

              res.on('data', function (d) {
                //debug("data");
                //debug(d.toString());
                content += d.toString();
              });
              res.on('end', function () {
                //debug('end');
                //debug(d);

                let val;

                try {
                  //debug('end : '+content);
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
/*const BucketsToManaged = [
  "Power Weapons", "Energy Weapons", "Kinetic Weapons",
  "Leg Armor", "Helmet", "Gauntlets", "Chest Armor", "Class Armor",
  "Pursuits"
  //"Ghost", "Vehicle", "Ships"
];*/

const Tier = {
  Unknown: 0,
  Currency: 1,
  Basic: 2,
  Common: 3,
  Rare: 4,
  Legendary: 5,
  Exotic: 6
};