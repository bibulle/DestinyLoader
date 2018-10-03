var logger = require('../lib/logger');
var config = require('../lib/config');
var destinyDb = require('../lib/destinyDb');
var CronJob = require('cron').CronJob;
var fs = require('fs');

var express = require('express');
var router = express.Router();

var resultCache = null;
var dateCache = new Date(2000, 1, 1);

/* GET users listing. */
router.get('/', function (req, res, next) {

  res.setHeader('Last-Modified', (new Date()).toUTCString());

  if ((new Date() - dateCache) > 1000 * 60 * 12) {
    logger.error("Cache not loaded !! " + dateCache);
    calcList(function (err, list) {
      if (err) {
        res.send(err);
      } else {
        res.json(list);
      }
    });
  } else {
    res.json(resultCache);
  }

});

module.exports = router;

function calcList(callback) {

  var userList = [];
  try {
    userListJson = fs.readFileSync(__dirname + '/../data/clanMembers.js', 'utf8');
    var userCharMap = {};
    var userOnlineMap = {};
    var userList = JSON.parse(userListJson).map(function (users) {
      userOnlineMap[users.displayName] = users.isOnLine;
      userCharMap[users.displayName] = users.characters;
      return users.displayName;
    });
    //ogger.info(JSON.stringify(userOnlineMap, null, 2));
    //logger.info(JSON.stringify(userList, null, 2));
  } catch (e) {
    logger.error(e);
    if (callback) {
      callback("Cannot load : " + __dirname + '/../data/clanMembers.js');
    } else {
      logger.error("Cannot load : " + __dirname + '/../data/clanMembers.js');
    }
    return
  }


  //logger.info("calcList");
  destinyDb.list(function (err, docs) {
    if (err) {
      if (callback) {
        callback(err);
      } else {
        logger.error(err);
      }

    } else {


      var firstDate = new Date(2000, 0, 1);
      var limitDate = new Date(2000, 0, 1);
      try {
        limitDate = new Date(config.startingDate);
      } catch (e) {
      }
      var list = docs
        .reduce(function (result, d) {
          //console.log(d);
          var month = d.date.getMonth() + 1; //months from 1-12
          var day = d.date.getDate();
          var year = d.date.getFullYear();
          var hours = 0;
          var minutes = 0;


          var diffDateHours = (new Date() - d.date) / (1000 * 60 * 60);
          if (diffDateHours < 2) {
            //logger.info(""+d.date.getMinutes()+" "+Math.round(d.date.getMinutes()/10)*10);
            minutes = Math.round(d.date.getMinutes() / 10) * 10;
          }
          if (diffDateHours < 6) {
            hours = d.date.getHours();
          }

          var key = d.id + "_" + year + "/" + month + "/" + day + '_' + hours + '_' + minutes;

          if (year + "/" + month + "/" + day + '_' + hours + '_' + minutes == "2017/9/6_0_0") {
            lightMin = 0;
          } else {
            lightMin = d.light;
          }

          if (!d.userId) {
            d.userId = d.name.replace(/ \/ [1-3]$/, "");
          }
          //logger.info(d.userId);
          //logger.info(userList.includes(d.userId));
          if ((d.date.getTime() > limitDate.getTime()) && (userList.indexOf(d.userId) >= 0) && (userCharMap[d.userId].indexOf(d.id) >= 0)) {
            if (!result[key]) {
              result[key] = {};
              result[key].lightMax = d.light;
              result[key].lightMin = lightMin;
              result[key].name = d.name;
              result[key].date = new Date(year, month - 1, day, hours, minutes);
            } else {
              if (d.light > result[key].lightMax) {
                result[key].lightMax = d.light;
              }
              if (lightMin < result[key].lightMin) {
                result[key].lightMin = lightMin;
              }
            }
            result[key].id = d.id;
            result[key].class = d.class;
            result[key].userId = d.userId;
            result[key].isOnLine = userOnlineMap[d.userId];
            result[key].minutesPlayedTotal = d.minutesPlayedTotal;
            result[key].triumphScore = d.triumphScore;

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
          }

          return result;

        }, {});

      list = Object.keys(list).map(function (key) {
        //console.log(list[key]);
        return list[key];
      })

      resultCache = list;
      dateCache = new Date();

      if (callback) {
        callback(null, list);
      }
    }
  }, true);
}

calcList();

new CronJob("0 5,15,25,35,45,55 * * * *", calcList, null, true, "GMT");
//new CronJob("0 * * * * *", calcList, null, true, "GMT");
