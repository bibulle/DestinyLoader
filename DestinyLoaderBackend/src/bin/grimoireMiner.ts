import {Destiny} from "../utils/destiny/destiny";
import { Config } from "../utils/config/config";
import { GrimoireGoogle } from "../utils/grimoireGoogle/grimoireGoogle";

const debug = require('debug')('server:debugLogger:grimoireMiner');
const error = require('debug')('server:error:grimoireMiner');

const async = require('async');
const CronJob = require('cron').CronJob;


const CRON_TAB_MINE_GRIMOIRE = Config.crontabGrimoire;
debug("CronTab grimoire : '" + CRON_TAB_MINE_GRIMOIRE + "'");

//========================================================================

let mineGrimoire = function () {
  async.each(
    Config.accountsGrimoire,
    function (user, callback) {
      Destiny.getGrimoire(user, function (err, data) {

        if (err) {
          return error("Err : " + err);
        }

        //debugLogger(userId + "  " + JSON.stringify(data));

        GrimoireGoogle.insert(user.docKey, data, function (err) {
          if (err) {
            return callback("Err : " + err);
          }
        });
      });
    },
    function (err) {
      if (err) {
        error("Err : " + err);
      }
    });

};

//========================================================================
new CronJob(CRON_TAB_MINE_GRIMOIRE, mineGrimoire, null, true, "GMT");
//========================================================================


