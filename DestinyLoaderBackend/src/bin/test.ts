#!/usr/bin/env node

/**
 * Module dependencies.
 */
const debug = require('debug')('SeedMeHome2:server');
const async = require('async');
const fs = require('fs');
const logger = require('../lib/logger/logger');
const destiny = require('../lib/destiny/destiny');
const destinyDb = require('../lib/destinyDb/destinyDb');
const grimoireGoogle = require('../lib/grimoireGoogle/grimoireGoogle');
const config = require('../lib/config/config');

//noinspection JSUnusedGlobalSymbols
function testGrimoire() {
  async.each(
    config.accountsGrimoire,
    function (user, callback) {
      destiny.getGrimoire(user, function (err, data) {

        if (err) {
          return callback(err);
        }

        logger.info(user.id + "  " + JSON.stringify(data));

        grimoireGoogle.insert(user.docKey, data, function (err, newDoc) {
          logger.info(JSON.stringify(newDoc, null, 2));
          callback(err);
        });
      });
    },
    function (err) {
      if (err) {
        logger.error("Err : " + err);
      }
    }
  )
}


function testLight() {
  async.eachSeries(
    //config.clanMembers,
    // [{
    //     "isOnLine": false,
    //     "displayName": "laterreur01"
    // }],
    [
      {
        "isOnLine": false,
        "displayName": "tarrade"
      },
      {
        "isOnLine": false,
        "displayName": "bibullus"
      }
    ],
    function (user, callback) {
      logger.info("2");

      destiny.getLight(user.displayName, user.isOnLine, function (err, data) {

        if (err) {
          logger.info("3");
          return callback(err);
        }

        logger.info("4");
        console.log(data);
        async.eachSeries(data,
          function (character, callback) {
            logger.info("5");
            logger.info(character.userId + " / " + character.class + " light:" + character.light + " level:" + character.baseCharacterLevel + " minutes:" + character.minutesPlayedTotal);
            //logger.info(JSON.stringify(character, null, 2));

            destinyDb.insert(character, function (err) {
              //logger.info(JSON.stringify(newDoc, null, 2));
              logger.info("6");
              return callback(err);
            });

          },
          function (err) {
            logger.info("10");
            callback(err);
          }
        );

        // logger.info(data.name + " " + data.light);
        //
        // destinyDb.insertStats(data, function (err, newDoc) {
        //     //logger.info(JSON.stringify(newDoc, null, 2));
        //     callback(err);
        // });
      });
    },
    function (err) {
      logger.info("12");
      if (err) {
        logger.error("Err : " + err);
        process.exit(1);
      }
      process.exit(0);
    }
  )

}

//noinspection JSUnusedGlobalSymbols
function testClan() {
  destiny.getClan(config.clanId, function (err, data) {
    logger.info("retour du clan");
    //logger.info(JSON.stringify(err, null, 2));
    //logger.info(JSON.stringify(data, null, 2));
    if (err) {
      return logger.error("Err : " + err);

    }
    const json = JSON.stringify(data);
    //logger.info(JSON.stringify(__dirname+'/../data/accountsLight1.js', null, 2));
    fs.writeFileSync(__dirname + '/../data/clanMembers1.js', json); // write it back

    try {
      data = fs.readFileSync(__dirname + '/../data/clanMembers.js', 'utf8');
      config.clanMembers = JSON.parse(data);
      logger.info(config.clanMembers.length);
    } catch (e) {
    }

  })


}

//testGrimoire();
testLight();
//testClan();