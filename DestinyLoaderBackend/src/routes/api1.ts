import { Router, Response, Request, NextFunction } from "express";

const CronJob = require('cron').CronJob;
const fs = require('fs');

const debug = require('debug')('server:debugLogger:routes:api1');
const error = require('debug')('server:error:routes:api1');

import { DestinyDb } from "../utils/destinyDb/destinyDb";
import { Config } from "../utils/config/config";

let resultCache = null;
let dateCache = new Date(2000, 1, 1);

import * as _ from "lodash";

//noinspection JSUnusedLocalSymbols
function api1Router (passport): Router {
  const router: Router = Router();

  router.route('/')
        // ====================================
        // route for getting users listStats
        // ====================================
        .get((request: Request, response: Response) => {
          debug("GET /");

          // Check authentication (only to know if we are authenticate)
          passport.authenticate('jwt-check', {session: false}, (err, user): any => {

            response.setHeader('Last-Modified', (new Date()).toUTCString());

            if ((new Date().getTime() - dateCache.getTime()) > 1000 * 60 * 12) {
              error("Cache not loaded !! " + dateCache);
              calcList(function (err, list) {
                if (err) {
                  response.send(err);
                } else {
                  //noinspection JSIgnoredPromiseFromCall
                  let result = {
                    data: list,
                    refreshedToken: user.refreshedToken
                  };
                  response.send(JSON.stringify(result, null, 2));
                  debug("GET / done");
                }
              });
            } else {
              //noinspection JSIgnoredPromiseFromCall
              let result = {
                data: resultCache,
                refreshedToken: user.refreshedToken
              };
              response.send(JSON.stringify(result, null, 2));
              debug("GET / done");
            }
          })(request, response);
        });

  return router;
}

export { api1Router }

/**
 * Calc listStats of users (with data)
 * only once every 3 minutes to avoid memory overload)
 */
const calcList = _.throttle((callback) => {
    //debug('calcList');

    let userList = [];
    let userCharMap = {};
    let userOnlineMap = {};

    try {
      let userListJson = fs.readFileSync(Config.CLAN_MEMBER_LIST, 'utf8');
      //debugLogger(userListJson);
      userList = JSON.parse(userListJson).map(function (users) {
        userOnlineMap[users.displayName] = users.isOnLine;
        userCharMap[users.displayName] = users.characters;
        return users.displayName;
      });
      //debugLogger(JSON.stringify(userOnlineMap, null, 2));
      //debugLogger(JSON.stringify(userList, null, 2));
    } catch (e) {
      error(e);
      if (callback) {
        callback("Cannot load : " + Config.CLAN_MEMBER_LIST);
      } else {
        error("Cannot load : " + Config.CLAN_MEMBER_LIST);
      }
      return
    }


    // debugLogger("calcList");
    DestinyDb.listStats(function (err, docs) {
      if (err) {
        if (callback) {
          callback(err);
        } else {
          error(err);
        }

      } else {

        let limitDate = new Date(2000, 0, 1);
        try {
          limitDate = new Date(Config.startingDate);
        } catch (e) {
        }
        let previousRatio = [];
        let list = docs
          .reduce(function (result, d) {
            // debugLogger(d);
            let month = d.date.getMonth() + 1; //months from 1-12
            let day = d.date.getDate();
            let year = d.date.getFullYear();
            let hours = 0;
            let minutes = 0;


            let diffDateHours = (new Date().getTime() - d.date.getTime()) / (1000 * 60 * 60);
            if (diffDateHours < 2) {
              //logger.info(""+d.date.getMinutes()+" "+Math.round(d.date.getMinutes()/10)*10);
              minutes = Math.round(d.date.getMinutes() / 10) * 10;
            }
            if (diffDateHours < 6) {
              hours = d.date.getHours();
            }

            const key = d.id + "_" + year + "/" + month + "/" + day + '_' + hours + '_' + minutes;

            let lightMin = 0;
            if (year + "/" + month + "/" + day + '_' + hours + '_' + minutes != "2017/9/6_0_0") {
              lightMin = d.light;
            }

            if (!d.userId) {
              d.userId = d.name.replace(/ \/ [1-3]$/, "");
            }
            //debugLogger(d.userId);
            if ((d.date.getTime() > limitDate.getTime()) && (userList.indexOf(d.userId) >= 0) && (userCharMap[d.userId].indexOf(d.id) >= 0)) {
              if (!result[key]) {
                result[key] = {};
                result[key].lightMax = d.light;
                result[key].lightMin = lightMin;
                result[key].name = d.name;
                result[key].date = new Date(year, month - 1, day, hours, minutes);
                result[key].triumphScore = d.triumphScore;
                result[key].triumphScoreMin = d.triumphScore;
              } else {
                if (d.light > result[key].lightMax) {
                  result[key].lightMax = d.light;
                }
                if (lightMin < result[key].lightMin) {
                  result[key].lightMin = lightMin;
                }
                if (d.triumphScore > (result[key].triumphScore ? result[key].triumphScore : 0)) {
                  result[key].triumphScore = d.triumphScore;
                }
                if (d.triumphScore < (result[key].triumphScoreMin ? result[key].triumphScoreMin : 10000000)) {
                  result[key].triumphScoreMin = d.triumphScore;
                }

              }
              result[key].id = d.id;
              result[key].class = d.class;
              result[key].userId = d.userId;
              result[key].isOnLine = userOnlineMap[d.userId];
              result[key].minutesPlayedTotal = d.minutesPlayedTotal;

              result[key].nightfallEntered = d.nightfallEntered;
              result[key].nightfallCleared = d.nightfallCleared;
              result[key].heroicNightfallEntered = d.heroicNightfallEntered;
              result[key].heroicNightfallCleared = d.heroicNightfallCleared;
              result[key].raidEntered = d.raidEntered;
              result[key].raidCleared = d.raidCleared;
              result[key].strikeEntered = d.strikeEntered;
              result[key].strikeCleared = d.strikeCleared;
              result[key].allPvPEntered = d.allPvPEntered;
              result[key].allPvPWon = d.allPvPWon;
              result[key].trialsofthenineEntered = d.trialsofthenineEntered;
              result[key].trialsofthenineWon = d.trialsofthenineWon;
              result[key].allPvPKillsDeathsAssistsRatio = (d.allPvPKills + d.allPvPAssists / 2) / Math.max(1, d.allPvPDeaths);

              if ((result[key].allPvPKillsDeathsAssistsRatio === 0) && (previousRatio[d.id])) {
                result[key].allPvPKillsDeathsAssistsRatio = previousRatio[d.id];
              }

              previousRatio[d.id] = result[key].allPvPKillsDeathsAssistsRatio;
              //console.log(previousRatio[d.id]+" "+key);
            }
            //debugLogger(result);
            return result;

          }, {});

        list = Object.keys(list).map(function (key) {
          //console.log(listStats[key]);
          return list[key];
        });

        resultCache = list;
        dateCache = new Date();

        if (callback) {
          callback(null, list);
        }
      }
    });
  },
  3 * 60 * 1000);

//noinspection JSUnusedLocalSymbols
calcList(function (err, list) {
  if (err) {
    error(err);
  }
});

new CronJob("0 */10 * * * *", calcList, null, true, "GMT");
//new CronJob("0 * * * * *", calcList, null, true, "GMT");
