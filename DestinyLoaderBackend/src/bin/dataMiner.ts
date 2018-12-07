import {Destiny} from "../utils/destiny/destiny";
import {DestinyDb} from "../utils/destinyDb/destinyDb";
import {GrimoireGoogle} from "../utils/grimoireGoogle/grimoireGoogle";
import {Config} from "../utils/config/config";

const debug = require('debug')('server:debug:dataMiner');
const error = require('debug')('server:error:dataMiner');
const sprintf = require('sprintf-js').sprintf;
const async = require('async');
const CronJob = require('cron').CronJob;
const fs = require('fs');


const CRON_TAB_MINE_DESTINY = Config.crontab;
// const CRON_TAB_MINE_GRIMOIRE = Config.crontabGrimoire;
debug("CronTab          : '" + CRON_TAB_MINE_DESTINY + "'");
//logger.info("CronTab grimoire : '" + CRON_TAB_MINE_GRIMOIRE + "'");

//========================================================================

let mineDestiny = function () {
    async.waterfall(
        [
            function (callback) {
                if (Config.clanId > 0) {
                  Destiny.getClan(Config.clanId, function(err, data) {
                    //logger.info("retour du clan");
                    //logger.info(JSON.stringify(err, null, 2));
                    //logger.info(JSON.stringify(accounts, null, 2));
                    if (err) {
                      return callback(err);
                    }
                    //debug(path.resolve(__dirname+CLAN_MEMBER_LIST));
                    fs.writeFileSync(Config.CLAN_MEMBER_LIST, JSON.stringify(data, null, 2)); // write it back

                    try {
                      data = fs.readFileSync(Config.CLAN_MEMBER_LIST, 'utf8');
                      Config.clanMembers = JSON.parse(data);
                    } catch(e) {}
                    callback();
                  } )
                } else {
                  Destiny.getGroup(Config.accountsClan, function(err, data) {
                    //logger.info("retour du group");
                    //logger.info(JSON.stringify(err, null, 2));
                    //logger.info(JSON.stringify(data, null, 2));
                    if (err) {
                      return callback(err);
                    }
                    //debug(path.resolve(__dirname+CLAN_MEMBER_LIST));
                    fs.writeFileSync(Config.CLAN_MEMBER_LIST, JSON.stringify(data, null, 2)); // write it back

                    try {
                      data = fs.readFileSync(Config.CLAN_MEMBER_LIST, 'utf8');
                      Config.clanMembers = JSON.parse(data);
                    } catch(e) {}
                    callback();
                  } )
                }
            },
            function(callback) {
                async.eachSeries(
                    Config.clanMembers,
                    function (member, callback) {
                        //logger.info(userId+" "+num);

                      let userId = member.displayName;
                      let isOnLine = member.isOnLine;

                      Destiny.getLight(userId, isOnLine, function (err, data) {
                            if (err) {
                                return callback(err);
                            }

                            async.eachSeries(data,
                                function (character, callback) {
                                  //logger.info(character.userId+" / " + character.class + " light:" + character.light + " level:"+character.baseCharacterLevel+" minutes:"+character.minutesPlayedTotal);
                                  debug(sprintf('%-20s %s -> light:%3d, level:%2d, minutes:%5d, triumph:%6d', character.userId, character.class, character.light, character.baseCharacterLevel, character.minutesPlayedTotal, character.triumphScore));
                                  //logger.info(JSON.stringify(character, null, 2));

                                  DestinyDb.insert(character, function (err) {
                                        //logger.info(JSON.stringify(newDoc, null, 2));
                                        return callback(err);
                                    });

                                },
                                function (err) {
                                    callback(err);
                                }
                            );
                        });
                    },
                    callback
                )

            }
        ],
        function (err) {
            if (err) {
              error(err);
            }
        }
    )



    //setTimeout(test, 1000);
};

//========================================================================

//noinspection JSUnusedLocalSymbols
const mineGrimoire = function () {
    async.each(
        Config.accountsGrimoire,
        function (user, callback) {
            Destiny.getGrimoire(user, function (err, data) {

                if (err) {
                    return callback(err);
                }

                //logger.info(userId + "  " + JSON.stringify(data));

                GrimoireGoogle.insert(user.docKey, data, function (err) {
                    if (err) {
                        return callback(err);
                    }
                });
            });
        },
        function (err) {
            if (err) {
              error(err);
            }
        });

};

//========================================================================
new CronJob(CRON_TAB_MINE_DESTINY, mineDestiny, null, true, "GMT");
//new CronJob(CRON_TAB_MINE_GRIMOIRE, mineGrimoire, null, true, "GMT");
//========================================================================

// launch once on start
mineDestiny();

