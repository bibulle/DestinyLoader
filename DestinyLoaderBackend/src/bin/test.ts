import {Destiny} from "../utils/destiny/destiny";
import {DestinyDb} from "../utils/destinyDb/destinyDb";
import {GrimoireGoogle} from "../utils/grimoireGoogle/grimoireGoogle";
import {Config} from "../utils/config/config";

/**
 * Module dependencies.
 */
const debug = require('debug')('server:debug:test');
const error = require('debug')('server:error:test');
const async = require('async');
const fs = require('fs');

//noinspection JSUnusedGlobalSymbols
function testGrimoire() {
  async.each(
    Config.accountsGrimoire,
    function (user, callback) {
      Destiny.getGrimoire(user, function (err, data) {

        if (err) {
          return callback(err);
        }

        debug(user.id + "  " + JSON.stringify(data));

        GrimoireGoogle.insert(user.docKey, data, function (err, newDoc) {
          debug(JSON.stringify(newDoc, null, 2));
          callback(err);
        });
      });
    },
    function (err) {
      if (err) {
        error("Err : " + err);
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
      debug("2");

      Destiny.getLight(user.displayName, user.isOnLine, function (err, data) {

        if (err) {
          debug("3");
          return callback(err);
        }

        debug("4");
        console.log(data);
        async.eachSeries(data,
          function (character, callback) {
            debug("5");
            debug(character.userId + " / " + character.class + " light:" + character.light + " level:" + character.baseCharacterLevel + " minutes:" + character.minutesPlayedTotal);
            //debug(JSON.stringify(character, null, 2));

            //DestinyDb.insertStats(character, function (err) {
            //  //debug(JSON.stringify(newDoc, null, 2));
            //  debug("6");
            //  return callback(err);
            //});
            callback();
          },
          function (err) {
            debug("10");
            callback(err);
          }
        );

        // debug(data.name + " " + data.light);
        //
        // destinyDb.insertStats(data, function (err, newDoc) {
        //     //debug(JSON.stringify(newDoc, null, 2));
        //     callback(err);
        // });
      });
    },
    function (err) {
      debug("12");
      if (err) {
        error("Err : " + err);
        process.exit(1);
      }
      process.exit(0);
    }
  )

}

//noinspection JSUnusedGlobalSymbols
function testClan() {
  Destiny.getClan(Config.clanId, function (err, data) {
    debug("retour du clan");
    //debug(JSON.stringify(err, null, 2));
    //debug(JSON.stringify(data, null, 2));
    if (err) {
      return error("Err : " + err);

    }
    const json = JSON.stringify(data);
    //debug(JSON.stringify(__dirname+'/../data/accountsLight1.js', null, 2));
    fs.writeFileSync(__dirname + '/../data/clanMembers1.js', json); // write it back

    try {
      data = fs.readFileSync(__dirname + '/../data/clanMembers.js', 'utf8');
      Config.clanMembers = JSON.parse(data);
      debug(Config.clanMembers.length);
    } catch (e) {
    }

  })


}

//testGrimoire();
testLight();
//testClan();