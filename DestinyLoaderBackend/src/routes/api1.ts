import { Router, Response, Request, NextFunction } from "express";

const CronJob = require('cron').CronJob;
const fs = require('fs');
const async = require('async');

const debug = require('debug')('server:debug:routes:api1');
const error = require('debug')('server:error:routes:api1');

import { DestinyDb } from "../utils/destinyDb/destinyDb";
import { Config } from "../utils/config/config";

let resultCache: StatSummed[] = null;
let dateCache = new Date(2000, 1, 1);

import * as _ from "lodash";
import { Stat, StatSummed } from "../models/stat";

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
              response.status(500).send("Error : Cache not loaded !! " + dateCache);
              debug("GET / done");
            } else {
              //noinspection JSIgnoredPromiseFromCall
              let result = {
                data: resultCache,
                refreshedToken: (user ? user.refreshedToken : null)
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
      //debug(userListJson);
      userList = JSON.parse(userListJson).map(function (users) {
        userOnlineMap[users.displayName] = users.isOnLine;
        userCharMap[users.displayName] = users.characters;
        return users.displayName;
      });
      //debug(JSON.stringify(userOnlineMap, null, 2));
      //debug(JSON.stringify(userList, null, 2));
    } catch (e) {
      error(e);
      if (callback) {
        callback("Cannot load : " + Config.CLAN_MEMBER_LIST);
      } else {
        error("Cannot load : " + Config.CLAN_MEMBER_LIST);
      }
      return
    }


    // debug("calcList");
    DestinyDb.listStats(function (err, docs:Stat[]) {
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
        let listByKey = {};
        let list: { [id: string]: StatSummed } = docs
          .reduce(function (result: { [id: string]: StatSummed } , d:Stat) {

            // debug(d);
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
            //debug(d.userId);
            if ((d.date.getTime() > limitDate.getTime()) && (userList.indexOf(d.userId) >= 0) && (userCharMap[d.userId].indexOf(d.id) >= 0)) {

              if (!listByKey[key]) {
                listByKey[key] = [];
              }
              listByKey[key].push(d);

              if (!result[key]) {
                result[key] = new StatSummed();
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
              result[key].scored_nightfallEntered = d.scored_nightfallEntered;
              result[key].scored_nightfallCleared = d.scored_nightfallCleared;
              result[key].heroicNightfallEntered = d.heroicNightfallEntered;
              result[key].heroicNightfallCleared = d.heroicNightfallCleared;
              result[key].raidEntered = d.raidEntered;
              result[key].raidCleared = d.raidCleared;
              result[key].strikeEntered = d.strikeEntered;
              result[key].strikeCleared = d.strikeCleared;
              result[key].blackArmoryRunEntered = d.blackArmoryRunEntered;
              result[key].blackArmoryRunCleared = d.blackArmoryRunCleared;
              result[key].allPvPEntered = d.allPvPEntered;
              result[key].allPvPWon = d.allPvPWon;
              result[key].pvpCompetitiveEntered = d.pvpCompetitiveEntered;
              result[key].pvpCompetitiveWon = d.pvpCompetitiveWon;
              result[key].gambitEntered = d.gambitEntered;
              result[key].gambitWon = d.gambitWon;
              result[key].trialsOfTheNineEntered = d.trialsOfTheNineEntered;
              result[key].trialsOfTheNineWon = d.trialsOfTheNineWon;
              result[key].allPvPKillsDeathsAssistsRatio = (d.allPvPKills + d.allPvPAssists / 2) / Math.max(1, d.allPvPDeaths);

              if ((result[key].allPvPKillsDeathsAssistsRatio === 0) && (previousRatio[d.id])) {
                result[key].allPvPKillsDeathsAssistsRatio = previousRatio[d.id];
              }

              previousRatio[d.id] = result[key].allPvPKillsDeathsAssistsRatio;
              //console.log(previousRatio[d.id]+" "+key);
            }
            //debug(result);

            return result;

          }, {});

        // Work on the cleanup
        let toBeUpdate = [];
        let toBeRemoved = [];
        Object.keys((listByKey)).forEach(key => {
          if (listByKey[key].length > 2) {
            //debug(key+" -> "+listByKey[key][0].date);
            listByKey[key].sort((d1, d2) => {
              return d1.date.getTime() - d2.date.getTime();
            });

            listByKey[key].forEach((d, index) => {
              if (index == 0) {
                d.light = list[key].lightMin;
                d.triumphScore = list[key].triumphScoreMin;

                toBeUpdate.push(d);
              } else if (index == listByKey[key].length - 1) {
                d.light = list[key].lightMax;
                d.triumphScore = list[key].triumphScore;

                toBeUpdate.push(d);
              } else {
                toBeRemoved.push(d);
              }
            });
          }
        });
        async.eachSeries(
          toBeUpdate,
          (d, callback) => {
            //debug(d);
            DestinyDb.insertStats(d, callback);
          },
          (err) => {
            if (err) {
              error(err);
            }
          }
        );
        async.eachSeries(
          toBeRemoved,
          (d, callback) => {
            debug('delete stats : ' + d.name + ' ' + d.date.toISOString().replace(/T/, ' ').replace(/\..+/, ''));
            DestinyDb.deleteStats(d._id, callback);
          },
          (err) => {
            if (err) {
              error(err);
            }
          }
        );


        let listOutput: StatSummed[] = Object.keys(list).map(function (key) {
          //console.log(listStats[key]);
          return list[key];
        });

        resultCache = listOutput;
        dateCache = new Date();

        if (callback) {
          callback(null, listOutput);
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
