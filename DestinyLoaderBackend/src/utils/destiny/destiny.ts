import {Config} from "../config/config";
import {Database} from "sqlite3";
import {DestinyDb} from "../destinyDb/destinyDb";
import {ObjectiveTime} from "../../models/objectiveTime";
import {User} from "../../models/user";
import * as _ from "lodash";

const debug = require('debug')('server:debug:Destiny');
const error = require('debug')('server:error:Destiny');
const https = require('https');
const HttpsProxyAgent = require('https-proxy-agent');
const request = require('request');
const async = require('async');
const fs = require('fs');
const path = require('path');
const sqlite = require('sqlite3').verbose();
const streamZip = require('node-stream-zip'); //use this

export class Destiny {

  private static _URL_AUTH_GET_CODE = 'https://www.bungie.net/en/OAuth/Authorize?client_id={client-id}&response_type=code';
  private static _URL_GET_TOKEN_FROM_CODE = '/Platform/App/OAuth/Token/';
// private static _URL_GET_TOKEN_FROM_REFRESH = '/Platform/App/GetAccessTokensFromRefreshToken/?code={refreshToken}';
  private static _URL_GET_CURRENT_USER = '/Platform/User/GetMembershipsForCurrentUser/';
  private static _URL_SEARCH_USER_BY_ID = '/Platform/User/GetBungieNetUserById/{id}/';
  private static _URL_SEARCH_DESTINY_PLAYER = '/Platform/Destiny2/SearchDestinyPlayer/{membershipType}/{displayName}/';
  private static _URL_ACCOUNT_SUMMARY = '/Platform/Destiny2/{membershipType}/Profile/{destinyMembershipId}/?components=200,900';
  private static _URL_ACCOUNT_SUMMARY_SMALL = '/Platform/Destiny2/{membershipType}/Profile/{destinyMembershipId}/?components=100';
// private static _URL_GET_INVENTORY = '/Platform/Destiny/{membershipType}/Account/{destinyMembershipId}/Character/{characterId}/Inventory/?definitions=true';
  private static _URL_GET_GRIMOIRE = '/Platform/Destiny/Vanguard/Grimoire/{membershipType}/{membershipId}/?definitions=true';
//private static _URL_GET_CLAN = '/Platform/Destiny2/Stats/Leaderboards/Clans/{groupId}/';
//private static _URL_GET_CLAN = '/Platform/Destiny2/Clan/{groupId}/WeeklyRewardState/';
//private static _URL_GET_CLAN = '/Platform/GroupV2/{groupId}/?definitions=true';
//private static _URL_GET_CLAN1 = '/Platform/GroupV2/{groupId}/Members/';
  private static _URL_GET_CLAN = '/Platform/GroupV2/{groupId}/Members/?lc=en&fmt=true&currentPage={currentPage}&platformType=2';
//private static _URL_GET_LEADERBOARDS = '/Platform/Destiny2/Stats/Leaderboards/Clans/{groupId}/?maxtop=200&modes=3,4,16,17';
//private static _URL_GET_AGGREGATE_CLAN_BOARD = '/Platform/Destiny2/Stats/AggregateClanStats/{groupId}/?maxtop=200&modes=3,4,16,17';
//private static _URL_GET_ACCOUNT_STAT = '/Platform/Destiny2/{membershipType}/Account/{destinyMembershipId}/Stats/?groups=102';
//private static _URL_GET_ACCOUNT_STAT = '/Platform/Destiny2/{membershipType}/Account/{destinyMembershipId}/Character/{characterId}/Stats/AggregateActivityStats/';
  private static _URL_GET_ACCOUNT_STAT = '/Platform/Destiny2/{membershipType}/Account/{destinyMembershipId}/Character/{characterId}/Stats/?modes=16,17,4,3,5,39,19,46,63,66,69,70&groups=0';
  private static _URL_GET_USER_STUFF = '/Platform/Destiny2/{membershipType}/Profile/{destinyMembershipId}/?components=100,102,104,200,201,202,204,205,300,301,302,304,305,306,307,308,900';
  private static _URL_GET_VENDORS = '/Platform/Destiny2/{membershipType}/Profile/{destinyMembershipId}/Character/{characterId}/Vendors/?components=400,401,402';

  private static _URL_GET_MANIFEST = '/Platform//Destiny2/Manifest/';

  private static _URL_LOCK_ITEM = "/Platform/Destiny2/Actions/Items/SetLockState/";
  private static _URL_MOVE_ITEM = "/Platform/Destiny2/Actions/Items/TransferItem/";
  private static _URL_EQUIP_ITEM = "/Platform/Destiny2/Actions/Items/EquipItem/";

  //private static MANIFEST_ZIP_FILE = 'data/manifest.zip';
  //private static MANIFEST_CONTENT = 'data/manifest.content';
  //private static MANIFEST_CONTENT_NEW = 'data/manifest_new.content';

  private static genderType = {
    0: "Male",
    1: "Female",
    2: "Unknown"
  };

  private static itemType = {
    None: 0,
    Currency: 1,
    Armor: 2,
    Weapon: 3,
    Message: 7,
    Engram: 8,
    Consumable: 9,
    ExchangeMaterial: 10,
    MissionReward: 11,
    QuestStep: 12,
    QuestStepComplete: 13,
    Emblem: 14,
    Quest: 15,
    Subclass: 16,
    ClanBanner: 17,
    Aura: 18,
    Mod: 19,
    Dummy: 20,
    Ship: 21,
    Vehicle: 22,
    Emote: 23,
    Ghost: 24,
    Package: 25,
    Bounty: 26,
  };

  private static tierType = {
    Unknown: 0,
    Currency: 1,
    Basic: 2,
    Common: 3,
    Rare: 4,
    Superior: 5,
    Exotic: 6
  };

  private static catalystState = {
    Unknown: 0,
    Done: 1,
    Dropped: 2,
    ToBeCompleted: 3
  };


  private static pursuitsBucket;

  private static manifestDb: { [id: string]: Database } = {};

  //noinspection JSUnusedGlobalSymbols
  public static getAuthenticationCodeUrl(callback) {
    let url = Destiny._URL_AUTH_GET_CODE;
    url = url.replace(/[{]client-id(})/, Config.oAuthClientId);

    //debug(JSON.stringify(url, null, 2));
    return callback(null, url);

  };

  public static getTokenUrl(callback) {
    return callback(null, Destiny._URL_GET_TOKEN_FROM_CODE);
  };

  public static getCurrentUser(user, callback) {
    //debug("getCurrentUser '" + user.auth.access_token + "'");

    // Get the Destiny player
    Destiny._getFromBungie(Destiny._URL_GET_CURRENT_USER, function (err, data) {
      //debug(JSON.stringify(err, null, 2));
      //debug(JSON.stringify(data, null, 2));
      if (err) {
        return callback(err);
      }
      callback(null, data);
    }, user.auth.access_token);

  };

  public static getUserById(bungieNetUser, callback) {

    // Get the Destiny player
    let url = Destiny._URL_SEARCH_USER_BY_ID;
    url = url.replace(/[{]id(})/, bungieNetUser);
    //debug(JSON.stringify(url, null, 2));

    Destiny._getFromBungie(url, function (err, data) {
      //debug(JSON.stringify(data, null, 2));
      if (err) {
        return callback(err);
      }
      callback(null, data);
    });

  };

  public static getGrimoire(user, callback) {
    //debug("getGrimoire '" + user.id + "'");

    // Get the Destiny player
    let url = Destiny._URL_SEARCH_DESTINY_PLAYER;
    url = url.replace(/[{]membershipType(})/, 'All');
    url = url.replace(/[{]displayName(})/, user.id);
    //debug(JSON.stringify(url, null, 2));

    Destiny._getFromBungie(url, function (err, data) {
      //debug(JSON.stringify(data, null, 2));
      if (err) {
        return callback(err);
      }
      if (data.length == 0) {
        return callback('User "' + user.id + '" not found')
      }

      const membershipType = data[0].membershipType;
      const membershipId = data[0].membershipId;
      //debug(JSON.stringify(membershipType, null, 2));
      //debug(JSON.stringify(membershipId, null, 2));

      // Get characters
      let url = Destiny._URL_GET_GRIMOIRE;
      url = url.replace(/[{]membershipType(})/, membershipType);
      url = url.replace(/[{]membershipId(})/, membershipId);
      //debug(JSON.stringify(url, null, 2));

      Destiny._getFromBungie(url, function (err, data) {
        //debug(JSON.stringify(data.data, null, 2));
        if (err) {
          return callback(err);
        }
        if (data.data.cardCollection.length == 0) {
          return callback('Grimoire cards for "' + user.id + '" not found')
        }

        // Build the result
        const result = {};
        result['TOTAL'] = data.data.score;
        data.data.cardCollection.forEach(
          function (card) {
            result[card.cardId + '_0'] = card.points;
            if (card.statisticCollection && (card.statisticCollection.length != 0)) {

              card.statisticCollection.forEach(
                function (stat) {
                  result[card.cardId + '_' + stat.statNumber] = stat.value;
                }
              )
            }
          }
        );

        return callback(null, result);

      });

    }, null);

  };

  public static getLight(userId: string, isOnLine, callback) {
    //debug("getLight '" + userId + "'");

    // Get the Destiny player

    let url = Destiny._URL_SEARCH_DESTINY_PLAYER;
    url = url.replace(/[{]membershipType(})/, 'All');
    url = url.replace(/[{]displayName(})/, userId.replace(' ', '%20').replace('#', '%23'));
    //debug(JSON.stringify(url, null, 2));

    Destiny._getFromBungie(url, function (err, data) {
      //debug(JSON.stringify(err, null, 2));
      //debug(JSON.stringify(data, null, 2));
      if (err) {
        if (err.error) {
          return callback(err);
        } else {
          return callback(null, []);
        }
      }
      if (!data || data.length == 0) {
        //debug('User "' + userId + '" not found');
        return callback(null, []);
      }

      const membershipType = data[0].membershipType;
      const membershipId = data[0].membershipId;
      //debug('membershipId : ' +JSON.stringify(membershipId, null, 2));

      // Get characters
      let url = Destiny._URL_ACCOUNT_SUMMARY;
      url = url.replace(/[{]membershipType(})/, membershipType);
      url = url.replace(/[{]destinyMembershipId(})/, membershipId);
      //debug(JSON.stringify(url, null, 2));

      Destiny._getFromBungie(url, function (err, data) {
        if (err) {
          if (err.error) {
            return callback(err);
          } else {
            return callback(null, []);
          }
        }
        if (!data) {
          error('Error in getting lights (' + userId + ')');
          return callback(null, []);
        }
        //debug(JSON.stringify(data, null, 2));

        let triumphScore = 0;
        if (data.profileRecords.data) {
          triumphScore = data.profileRecords.data.score;
          //} else {
          //debug(userId);
          //debug(JSON.stringify(data.profileRecords, null, 2));
        }
        if (err) {
          return callback(err);
        }
        const result = [];

        if (!data || data.length == 0) {
          //debug('User "' + userId + '" not found (profile)');
          return callback(null, result);
        }

        //debug(JSON.stringify(data.characters.data, null, 2));


        let cpt = 1;
        //async.eachSeries(data.characters.data,
        async.eachSeries(Object.keys(data.characters.data),
          function (characterId, callback) {
            const character = data.characters.data[characterId];
            //debug(JSON.stringify(character, null, 2));

            const resultChar = {
              date: new Date(),
              name: userId + " / " + cpt,
              userId: userId,
              isOnLine: isOnLine,
              triumphScore: triumphScore,
              id: character.characterId,
              minutesPlayedTotal: character.minutesPlayedTotal,
              light: character.light,
              baseCharacterLevel: character.baseCharacterLevel + (character.percentToNextLevel / 100),
              class: "",
              nightfallEntered: 0,
              nightfallCleared: 0,
              scored_nightfallEntered: 0,
              scored_nightfallCleared: 0,
              heroicNightfallEntered: 0,
              heroicNightfallCleared: 0,
              raidEntered: 0,
              raidCleared: 0,
              strikeEntered: 0,
              strikeCleared: 0,
              blackArmoryRunEntered: 0,
              blackArmoryRunCleared: 0,
              allPvPEntered: 0,
              allPvPWon: 0,
              pvpCompetitiveEntered: 0,
              pvpCompetitiveWon: 0,
              gambitEntered: 0,
              gambitWon: 0,
              trialsOfTheNineEntered: 0,
              trialsOfTheNineWon: 0,
              allPvPAssists: 0,
              allPvPKills: 0,
              allPvPDeaths: 1
            };


            switch (character.classType) {
              case 0:
                resultChar.class = 'T';
                break;
              case 1:
                resultChar.class = 'H';
                break;
              case 2:
                resultChar.class = 'W';
                break;
              default:
                resultChar.class = '?';
            }

            if ((resultChar.baseCharacterLevel < 2) && (resultChar.light == 100)) {
              resultChar.light = 0;
            }

            if (resultChar.minutesPlayedTotal != "0") {
              result.push(resultChar);
              //debug(JSON.stringify(resultChar, null, 2));
            }

            cpt++;

            let url = Destiny._URL_GET_ACCOUNT_STAT;
            url = url.replace(/[{]membershipType(})/, membershipType);
            url = url.replace(/[{]destinyMembershipId(})/, membershipId);
            url = url.replace(/[{]characterId(})/, resultChar.id);
            //debug(JSON.stringify(url, null, 2));

            Destiny._getFromBungie(url, function (err, data) {
              //debug(JSON.stringify(err, null, 2));
              //debug(JSON.stringify(data, null, 2));


              if (err) {
                return callback(err);
              }

              resultChar.nightfallEntered = 0;
              try {
                resultChar.nightfallEntered = data.nightfall.allTime.activitiesEntered.basic.value;
              } catch (e) {
              }
              resultChar.nightfallCleared = 0;
              try {
                resultChar.nightfallCleared = data.nightfall.allTime.activitiesCleared.basic.value;
              } catch (e) {
              }
              resultChar.scored_nightfallEntered = 0;
              try {
                resultChar.scored_nightfallEntered = data.scored_nightfall.allTime.activitiesEntered.basic.value;
              } catch (e) {
              }
              resultChar.scored_nightfallCleared = 0;
              try {
                resultChar.scored_nightfallCleared = data.scored_nightfall.allTime.activitiesCleared.basic.value;
              } catch (e) {
              }
              resultChar.heroicNightfallEntered = 0;
              try {
                resultChar.heroicNightfallEntered = data.heroicNightfall.allTime.activitiesEntered.basic.value;
              } catch (e) {
              }
              resultChar.heroicNightfallCleared = 0;
              try {
                resultChar.heroicNightfallCleared = data.heroicNightfall.allTime.activitiesCleared.basic.value;
              } catch (e) {
              }
              resultChar.raidEntered = 0;
              try {
                resultChar.raidEntered = data.raid.allTime.activitiesEntered.basic.value;
              } catch (e) {
              }
              resultChar.raidCleared = 0;
              try {
                resultChar.raidCleared = data.raid.allTime.activitiesCleared.basic.value;
              } catch (e) {
              }
              resultChar.strikeEntered = 0;
              try {
                resultChar.strikeEntered = data.strike.allTime.activitiesEntered.basic.value;
              } catch (e) {
              }
              resultChar.strikeCleared = 0;
              try {
                resultChar.strikeCleared = data.strike.allTime.activitiesCleared.basic.value;
              } catch (e) {
              }
              resultChar.blackArmoryRunEntered = 0;
              try {
                resultChar.blackArmoryRunEntered = data.blackArmoryRun.allTime.activitiesEntered.basic.value;
              } catch (e) {
              }
              resultChar.blackArmoryRunCleared = 0;
              try {
                resultChar.blackArmoryRunCleared = data.blackArmoryRun.allTime.activitiesCleared.basic.value;
              } catch (e) {
              }
              resultChar.allPvPEntered = 0;
              try {
                resultChar.allPvPEntered = data.allPvP.allTime.activitiesEntered.basic.value;
              } catch (e) {
              }
              resultChar.allPvPWon = 0;
              try {
                resultChar.allPvPWon = data.allPvP.allTime.activitiesWon.basic.value;
              } catch (e) {
              }
              resultChar.pvpCompetitiveEntered = 0;
              try {
                resultChar.pvpCompetitiveEntered = data.pvpCompetitive.allTime.activitiesEntered.basic.value;
              } catch (e) {
              }
              resultChar.pvpCompetitiveWon = 0;
              try {
                resultChar.pvpCompetitiveWon = data.pvpCompetitive.allTime.activitiesWon.basic.value;
              } catch (e) {
              }
              resultChar.gambitEntered = 0;
              try {
                resultChar.gambitEntered = data.pvecomp_gambit.allTime.activitiesEntered.basic.value;
              } catch (e) {
              }
              resultChar.gambitWon = 0;
              try {
                resultChar.gambitWon = data.pvecomp_gambit.allTime.activitiesWon.basic.value;
              } catch (e) {
              }
              resultChar.trialsOfTheNineEntered = 0;
              try {
                resultChar.trialsOfTheNineEntered = data.trialsofthenine.allTime.activitiesEntered.basic.value;
              } catch (e) {
              }
              resultChar.trialsOfTheNineWon = 0;
              try {
                resultChar.trialsOfTheNineWon = data.trialsofthenine.allTime.activitiesWon.basic.value;
              } catch (e) {
              }
              resultChar.allPvPAssists = 0;
              try {
                resultChar.allPvPAssists = data.allPvP.allTime.assists.basic.value;
              } catch (e) {
              }
              resultChar.allPvPKills = 0;
              try {
                resultChar.allPvPKills = data.allPvP.allTime.kills.basic.value;
              } catch (e) {
              }
              resultChar.allPvPDeaths = 1;
              try {
                resultChar.allPvPDeaths = data.allPvP.allTime.deaths.basic.value;
              } catch (e) {
              }
              //debug(JSON.stringify(resultChar, null, 2));
              callback();

            });

          },
          function (err) {
            //debug("==========");
            //debug(JSON.stringify(err, null, 2));
            //debug(JSON.stringify(result, null, 2));

            callback(err, result);
          }
        );

      });
    });

  };

  public static getClan(groupId, callback) {
    //debug("getClan '" + groupId + "'");
    // Get the Destiny player

    let url = Destiny._URL_GET_CLAN;
    const currentPage = 1;
    url = url.replace(/[{]groupId(})/, groupId);
    url = url.replace(/[{]currentPage(})/, "" + currentPage);
    //debug(JSON.stringify(url, null, 2));

    Destiny._getFromBungie(url, function (err, data) {
      //debug(JSON.stringify(err, null, 2));
      //debug(JSON.stringify(data, null, 2));
      if (err) {
        return callback(err);
      }
      if (!data || data.length == 0 || !data.results || data.results.length == 0) {
        return callback('Clan "' + groupId + '" not found')
      }

      // We got results
      const members = [];

      async.eachSeries(
        data.results,
        function (result, callback) {
          //debug(JSON.stringify(result, null, 2));
          const member = {
            isOnLine: result.isOnline,
            displayName: result.destinyUserInfo.displayName,
            characters: []
          };

          //debug(JSON.stringify(member.displayName, null, 2));
          members.push(member);

          const membershipId = result.destinyUserInfo.membershipId;
          const membershipType = result.destinyUserInfo.membershipType;

          // Get characters
          let url = Destiny._URL_ACCOUNT_SUMMARY_SMALL;
          url = url.replace(/[{]membershipType(})/, membershipType);
          url = url.replace(/[{]destinyMembershipId(})/, membershipId);
          //debug(JSON.stringify(url, null, 2));

          Destiny._getFromBungie(url, function (err, data) {
            //debug(JSON.stringify(err, null, 2));
            //debug(JSON.stringify(data, null, 2));
            if (err || !data) {
              return callback(err);
            }

            member.characters = data.profile.data.characterIds;
            //debug(JSON.stringify(data.characters.data, null, 2));


            // async.eachSeries(Object.keys(data.characters.data),
            //   function (characterId, callback) {
            //
            //     var character = data.characters.data[characterId];
            //     //debug(JSON.stringify(character, null, 2));
            //
            //     member.characters.push(character.characterId);
            //
            callback();
            // },
            // function (err) {
            //   callback(err);
            // }
            //);

          });
        },
        function (err) {
          //     var url = _URL_GET_AGGREGATE_CLAN_BOARD;
          //     var currentPage = 1;
          //     url = url.replace(/[{]groupId(})/, groupId);
          //     url = url.replace(/[{]currentPage(})/, currentPage);
          //     //debug(JSON.stringify(url, null, 2));
          //
          //     _getFromBungie(url, function (err, data) {
          //         //debug(JSON.stringify(err, null, 2));
          //         //debug(JSON.stringify(data, null, 2));
          //         if (err) {
          //             return callback(err);
          //         }
          callback(err, members);
          // })
        }
      );

    });
  };

  public static getGroup(userNameList, callback) {
    //debug("getGroup '" + userNameList + "'");

    // Get the Destiny players
    // We got results
    const members = [];

    async.eachSeries(
      userNameList,
      function (userName: string, callback) {

        debug("getting " + userName);
        let url = Destiny._URL_SEARCH_DESTINY_PLAYER;
        url = url.replace(/[{]membershipType(})/, 'All');
        url = url.replace(/[{]displayName(})/, userName.replace(' ', '+'));
        //debug(JSON.stringify(url, null, 2));

        Destiny._getFromBungie(url, function (err, data) {
          //debug(JSON.stringify(err, null, 2));
          //debug(JSON.stringify(data, null, 2));
          if (err) {
            if (err.error) {
              return callback(err);
            } else {
              return callback(null, []);
            }
          }
          if (!data || data.length == 0) {
            //debug('User "' + userId + '" not found');
            return callback(null, []);
          }

          //debug(JSON.stringify(result, null, 2));
          const member = {
            isOnLine: null,
            displayName: data[0].displayName,
            characters: []
          };

          //debug(JSON.stringify(member.displayName, null, 2));
          members.push(member);

          const membershipType = data[0].membershipType;
          const membershipId = data[0].membershipId;

          // Get characters
          let url = Destiny._URL_ACCOUNT_SUMMARY_SMALL;
          url = url.replace(/[{]membershipType(})/, membershipType);
          url = url.replace(/[{]destinyMembershipId(})/, membershipId);
          //debug(JSON.stringify(url, null, 2));

          Destiny._getFromBungie(url, function (err, data) {
            //debug(JSON.stringify(err, null, 2));
            //debug(JSON.stringify(data, null, 2));
            if (err || !data) {
              return callback(err);
            }

            member.characters = data.profile.data.characterIds;
            //debug(JSON.stringify(data.characters.data, null, 2));


            // async.eachSeries(Object.keys(data.characters.data),
            //   function (characterId, callback) {
            //
            //     var character = data.characters.data[characterId];
            //     //debug(JSON.stringify(character, null, 2));
            //
            //     member.characters.push(character.characterId);
            //
            callback();
            // },
            // function (err) {
            //   callback(err);
            // }
            //);

          });
        });
      },
      function (err) {
        //     var url = _URL_GET_AGGREGATE_CLAN_BOARD;
        //     var currentPage = 1;
        //     url = url.replace(/[{]groupId(})/, groupId);
        //     url = url.replace(/[{]currentPage(})/, currentPage);
        //     //debug(JSON.stringify(url, null, 2));
        //
        //     _getFromBungie(url, function (err, data) {
        //         //debug(JSON.stringify(err, null, 2));
        //         //debug(JSON.stringify(data, null, 2));
        //         if (err) {
        //             return callback(err);
        //         }
        callback(err, members);
        // })
      }
    );

  };

  private static MILESTONE_FLASH_POINT = 463010297;

  private static MILESTONE_GUARDIAN_OF_ALL = 536115997;

  private static MILESTONE_IRON_BANNER = 3427325023;

  private static MILESTONE_RECIPE_FOR_SUCCESS = 2188900244;

  private static CHALLENGE_SOURCED_REWARD = 326786556;

  private static POWERFUL_GEAR = 4039143015;

  public static getUserStuff(user, callback, lang: string) {
    //debug("getUserStuff ");

    // Get the Destiny player
    let url = Destiny._URL_GET_USER_STUFF;
    url = url.replace(/[{]membershipType(})/, user.destinyMemberships[0].membershipType);
    url = url.replace(/[{]destinyMembershipId(})/, user.destinyMemberships[0].membershipId);
    //debug(JSON.stringify(url, null, 2));

    Destiny._getFromBungie(url, function (err, data) {
      //debug(JSON.stringify(err, null, 2));
      //debug(JSON.stringify(data, null, 2));
      if (err) {
        return callback(err);
      }
      if (!data) {
        return callback("Error");
      }

      //debug(Object.keys(data));
      //debug(JSON.stringify(data, null, 2));

      //debug(JSON.stringify(data.profileInventory, null, 2));
      //debug(JSON.stringify(data.profile, null, 2));
      //debug(JSON.stringify(data.profilePlugSets, null, 2));
      //debug(JSON.stringify(data.profileProgression, null, 2));
      //debug(JSON.stringify(data.profileRecords, null, 2));
      //debug(Object.keys(data.profileRecords.data.records));
      //debug(data.profileRecords.data.score);
      //debug(data.profileRecords.data.records['11994000']);
      //Object.keys(data.profileRecords.data.records).forEach(hash => {
      //   Destiny.queryRecordById(hash, (err, data) => {
      //     if (data && data.displayProperties) {
      //       debug(hash + ' -> ' + data.displayProperties.name);
      //     }
      //   }, lang);
      //});
      //Destiny.queryRecordById('87609703', (err, data) => {
      //debug(data)
      //}, lang);
      //debug(data.profileRecords.data.records['245212391']);
      //Destiny.queryRecordById('245212391', (err, data) => {
      //debug(data)
      //}, lang);
      //debug(JSON.stringify(data.characters, null, 2));
      //debug(JSON.stringify(data.characterInventories, null, 2));
      //debug(JSON.stringify(data.characterProgressions, null, 2));
      //debug(Object.keys(data.characterProgressions.data));
      //debug(Object.keys(data.characterProgressions.data["2305843009262856643"].progressions['70699614']));
      //debug(JSON.stringify(data.characterProgressions.data["2305843009262856643"].progressions['2772425241'], null, 2));
      // Object.keys(data.characterProgressions.data["2305843009262856643"].progressions).forEach(hash => {
      //   Destiny.queryProgressionById(hash, (err, data) => {
      //     if (data && data.displayProperties) {
      //       debug(hash + ' -> ' + data.displayProperties.name);
      //     }
      //     if (hash === '2772425241') {
      //       debug(data);
      //     }
      //   }, lang);
      // });
      //debug(JSON.stringify(data.characterProgressions.data["2305843009262856643"].uninstancedItemObjectives, null, 2));
      //debug(JSON.stringify(data.characterActivities, null, 2));
      //debug(JSON.stringify(data.characterEquipment, null, 2));
      //debug(JSON.stringify(data.characterPlugSets, null, 2));
      //debug(JSON.stringify(data.characterUninstancedItemComponents, null, 2));
      //debug(JSON.stringify(data.characterRecords, null, 2));
      //debug(JSON.stringify(data.itemComponents, null, 2));

      //console.log(data.characterInventories.data["2305843009262856644"]);
      //console.log(data.characterProgressions.data["2305843009262856644"].items);


      const result = {
        items: {},
        characters: [],
        checklists: [],
        vendors: {},
        objectives: {},
        catalysts: [],
        triumphs: [],
        pursuitsName: {}
      };
      let itemsToLoad;
      const itemInstancesTable = {};
      const itemObjectivesTable = {};
      const itemSocketsTable = {};
      //const triumphTree = {};

      const checklistToLoad = [];
      const milestoneToLoad = [];
      const progressionToLoad = [];


      async.series([
          // Add characters
          function (callback) {
            async.eachSeries(
              Object.keys(data.characters.data),
              function (characterId, callback) {
                result.characters.push(data.characters.data[characterId]);
                callback();
              },
              function (err) {
                result.characters.sort(function (c1, c2) {
                  if (c1.dateLastPlayed > c2.dateLastPlayed) {
                    return -1;
                  } else if (c2.dateLastPlayed > c1.dateLastPlayed) {
                    return 1;
                  }
                  return 0;
                });

                //debug(JSON.stringify(result.characters, null, 2));
                callback(err);
              }
            );
          },

          // complete characters
          function (callback) {
            async.eachSeries(
              result.characters,
              function (character, callback) {
                async.series(
                  [
                    // complete classes
                    (callback) => {
                      Destiny.queryClassById(character.classHash, (err, data) => {
                        if (data) {
                          //debug(JSON.stringify(data, null, 2));
                          character.genderedClassNames = data.genderedClassNames[Destiny.genderType[character.genderType]];
                        }
                        callback(err);
                      }, lang);

                    },
                    // complete race
                    (callback) => {
                      Destiny.queryRaceById(character.raceHash, (err, data) => {
                        if (data) {
                          //debug(JSON.stringify(data, null, 2));
                          character.genderedRaceNames = data.genderedRaceNames[Destiny.genderType[character.genderType]];
                        }
                        callback(err);
                      }, lang);

                    },
                    // add vendors to character
                    (callback) => {
                      Destiny.getVendors(user, character.characterId, function (err, data) {
                        if (data) {
                          result.vendors[character.characterId] = data;
                        }
                        callback(err);
                      }, lang)

                    }
                  ],
                  function (err) {
                    callback(err);
                  }
                );

              },
              function (err) {
                callback(err);
              }
            );

          },

          // read the item instance
          function (callback) {
            async.eachSeries(
              Object.keys(data.itemComponents.instances.data),
              function (instanceId, callback) {
                //if (instanceId == "6917529083233657152") {
                //debug(JSON.stringify(data.itemComponents.instances.data[instanceId], null, 2));
                //}
                itemInstancesTable[instanceId] = data.itemComponents.instances.data[instanceId];
                callback();
              },
              function (err) {
                callback(err);
              }
            );
          },
          // read the item objective
          function (callback) {
            async.eachSeries(
              Object.keys(data.itemComponents.objectives.data),
              function (instanceId, callback) {
                //if (instanceId == "6917529083233657152") {
                //debug(JSON.stringify(data.itemComponents.objectives.data[instanceId], null, 2));
                //}
                itemObjectivesTable[instanceId] = data.itemComponents.objectives.data[instanceId];
                callback();
              },
              function (err) {
                callback(err);
              }
            );
          },
          // read the item socket
          function (callback) {
            async.eachSeries(
              Object.keys(data.itemComponents.sockets.data),
              function (instanceId, callback) {
                itemSocketsTable[instanceId] = data.itemComponents.sockets.data[instanceId];
                callback();
              },
              function (err) {
                callback(err);
              }
            );
          },
          // read catalysts
          function (callback) {
            let src = [].concat(
              Object.keys(data.profileInventory.data.items).map(key => data.profileInventory.data.items[key]),
              [].concat.apply([], Object.keys(data.characterEquipment.data).map(key => data.characterEquipment.data[key].items)),
              [].concat.apply([], Object.keys(data.characterInventories.data).map(key => data.characterInventories.data[key].items)));

            //src.forEach(v => {
            //debug(Array.isArray(v));
            //})
            async.forEachSeries(
              src,
              (inventoryItem, callback) => {
                //debug(inventoryItem);
                Destiny.queryItemById(
                  inventoryItem.itemHash,
                  (err, item) => {
                    //debug(inventoryItem.itemHash);
                    if (item && (item.itemType === Destiny.itemType.Weapon) && (item.inventory.tierType === Destiny.tierType.Exotic)) {
                      //debug('\n\n==========================');
                      //debug(obj.sockets);
                      //debug(data.profileInventory.data.items[key]);
                      //let instanceItem = itemInstancesTable[inventoryItem.itemInstanceId];
                      //debug(inventoryItem);
                      if ((inventoryItem.state & 4) == 4) {
                        //debug(item.displayProperties.name + " : The catalyst is done");
                        //debug(inventoryItem);
                        let catalyst = {
                          inventoryItem: inventoryItem,
                          item: _.pick(item, ['displayProperties']),
                          description: 'The catalyst is done',
                          state: Destiny.catalystState.Done
                        };
                        result.catalysts.push(catalyst);
                        return callback();
                      }

                      let instanceSockets = [];
                      if (itemSocketsTable[inventoryItem.itemInstanceId]) {
                        instanceSockets = itemSocketsTable[inventoryItem.itemInstanceId].sockets;
                      }
                      if (instanceSockets) {
                        async.forEachSeries(
                          instanceSockets,
                          (socket, callback) => {
                            //debug(socket);
                            if (!socket.reusablePlugs) {
                              return callback();
                            }
                            async.forEachSeries(
                              socket.reusablePlugs,
                              (plug, callback) => {
                                //debug('--> '+plug.plugItemHash);
                                Destiny.queryItemById(
                                  plug.plugItemHash,
                                  (err, obj) => {
                                    if (err) {
                                      return callback(err);
                                    }
                                    if (obj.plug.uiPlugLabel === 'masterwork_interactable') {
                                      //debug(obj.displayProperties.name + '\t rules:' + obj.plug.insertionRules.length + ' canInsert:' + plug.canInsert);
                                      //debug(plug);
                                      if (((inventoryItem.state & 4) == 0) && (obj.plug.insertionRules.length == 0) && (plug.canInsert)) {
                                        //debug(item.displayProperties.name + " : The catalyst has dropped, but needs to be inserted to activate.");
                                        //debug(obj);
                                        let catalyst = {
                                          inventoryItem: inventoryItem,
                                          item: _.pick(obj, ['displayProperties']),
                                          description: 'The catalyst has dropped, but needs to be inserted to activate.',
                                          state: Destiny.catalystState.Dropped
                                        };
                                        result.catalysts.push(catalyst);

                                        callback();
                                      } else if (((inventoryItem.state & 4) == 0) && (obj.plug.insertionRules.length == 1) && (!plug.canInsert)) {
                                        //debug(item.displayProperties.name + " : The catalyst must be completed.");

                                        let catalyst = {
                                          inventoryItem: inventoryItem,
                                          item: _.pick(obj, ['displayProperties']),
                                          description: 'The catalyst must be completed.',
                                          state: Destiny.catalystState.ToBeCompleted,
                                          objectives: []
                                        };
                                        result.catalysts.push(catalyst);

                                        //debug(obj.plug);
                                        //debug(obj.displayProperties.description);
                                        //debug(plug);
                                        async.forEachSeries(
                                          plug.plugObjectives,
                                          (objective, callback) => {
                                            Destiny.queryObjectiveById(
                                              objective.objectiveHash,
                                              (err, obj) => {
                                                //debug('\t' + obj.progressDescription + ' (' + objective.progress + '/' + objective.completionValue + ')');
                                                objective.item = obj;
                                                catalyst.objectives.push(objective);

                                                // add objective to list
                                                Object.keys(data.characters.data).forEach(characterId => {
                                                  const key = characterId + catalyst.inventoryItem.itemInstanceId + objective.objectiveHash;
                                                  //debug(key+' => '+objective.progress);
                                                  result.objectives[key] = objective.progress;
                                                });


                                                callback();
                                              },
                                              lang
                                            )
                                          },
                                          (err) => {
                                            callback(err);
                                          }
                                        )
                                      } else {
                                        callback();
                                      }
                                    } else {
                                      callback();
                                    }
                                  },
                                  lang
                                )
                              },
                              (err) => {
                                callback(err);
                              });
                          },
                          (err) => {
                            callback(err);
                          });
                      } else {
                        callback(err);
                      }
                    } else {
                      callback(err);
                    }
                  },
                  lang
                )
              },
              (err) => {
                if (err) {
                  error(err);
                }
                callback(err);
              }
            )
            ;
          },
          // read triumphs
          function (callback) {
            async.forEachSeries(
              Object.keys(data.profileRecords.data.records),
              (triumphHash, callback) => {

                const triumph = data.profileRecords.data.records[triumphHash];
                //debug(triumph);
                triumph.hash = triumphHash;
                // if ((triumph.hash == '64778617') || (triumph.hash == "64778617")) {
                //   debug(triumph);
                // }

                async.waterfall([
                    (callback) => {
                      // read record info
                      Destiny.queryRecordById(
                        triumphHash,
                        (err, item) => {
                          // if not record, don't add
                          if (item.displayProperties.name === '') {
                            //console.log('-----');
                            //console.log(item);
                            return callback(err);
                          }
                          // if (item.displayProperties.name.match(/nuit/i)) {
                          //   debug(triumphHash+' '+item.displayProperties.name);
                          // }
                          //if (triumph.hash === '3758540824') {
                          //if ((triumph.hash == '1842255612') || (triumph.hash == "1082441448")) {
                          //if (item.presentationInfo.parentPresentationNodeHashes.length == 0) {
                          //debug(item);
                          //}


                          triumph.item = _.pick(item, ['displayProperties', 'hash', 'presentationInfo.parentPresentationNodeHashes']);
                          //console.log(triumph.hash);
                          if (item.completionInfo) {
                            triumph.scoreValue = item.completionInfo.ScoreValue;
                          }
                          result.triumphs.push(triumph);
                          callback();
                        },
                        lang);
                    },
                    (callback) => {
                      if (triumph.item && triumph.item.presentationInfo && triumph.item.presentationInfo.parentPresentationNodeHashes.length != 0) {
                        //debug(triumph.item.presentationInfo.parentPresentationNodeHashes[0]);
                        let presentationHash = triumph.item.presentationInfo.parentPresentationNodeHashes[0];
                        Destiny.queryPresentationNodeById(presentationHash, (err, presentationNode) => {
                          if (presentationNode.displayProperties.icon) {
                            triumph.parentIcon = presentationNode.displayProperties.icon;
                            callback(err);
                          } else {
                            presentationHash = presentationNode.parentNodeHashes[0];
                            Destiny.queryPresentationNodeById(presentationHash, (err, presentationNode) => {
                              if (presentationNode.displayProperties.icon) {
                                triumph.parentIcon = presentationNode.displayProperties.icon;
                                callback(err);
                              } else {
                                presentationHash = presentationNode.parentNodeHashes[0];
                                Destiny.queryPresentationNodeById(presentationHash, (err, presentationNode) => {
                                  if (presentationNode.displayProperties.icon) {
                                    triumph.parentIcon = presentationNode.displayProperties.icon;
                                    callback(err);
                                  } else {
                                    presentationHash = presentationNode.parentNodeHashes[0];
                                    Destiny.queryPresentationNodeById(presentationHash, (err, presentationNode) => {
                                      if (presentationNode.displayProperties.icon) {
                                        triumph.parentIcon = presentationNode.displayProperties.icon;
                                        callback(err);
                                      } else {
                                        presentationHash = presentationNode.parentNodeHashes[0];
                                        Destiny.queryPresentationNodeById(presentationHash, (err, presentationNode) => {
                                          if (presentationNode.displayProperties.icon) {
                                            triumph.parentIcon = presentationNode.displayProperties.icon;
                                            callback(err);
                                          } else {
                                            debug("not found !!");
                                            callback(err);
                                          }
                                        }, lang);
                                      }
                                    }, lang);
                                  }
                                }, lang);
                              }
                            }, lang);
                          }
                        }, lang);
                      } else {
                        callback();
                      }
                    },
                    (callback) => {
                      async.forEachSeries(
                        triumph.objectives,
                        (objective, callback) => {
                          Destiny.queryObjectiveById(objective.objectiveHash,
                            (err, item) => {
                              objective.item = _.pick(item, ['progressDescription']);

                              // add objective to list
                              Object.keys(data.characters.data).forEach(characterId => {
                                const key = characterId + triumph.hash + objective.objectiveHash;
                                //debug(key+' => '+objective.progress);
                                result.objectives[key] = objective.progress;
                              });

                              callback(err);
                            },
                            lang)
                        },
                        (err) => {
                          callback(err);
                        }
                      );
                    }
                  ],
                  (err) => {
                    if (err) {
                      error(err);
                    }
                    callback(err);
                  });


              },
              (err) => {
                if (err) {
                  error(err);
                }
                callback(err);
              }
            );
          },
          // read triumphs for characters
          function (callback) {
            async.eachSeries(
              result.characters,
              function (character, callback) {
                character.triumphs = [];
                async.forEachSeries(
                  Object.keys(data.characterRecords.data[character.characterId].records),
                  (triumphHash, callback) => {

                    const triumph = data.characterRecords.data[character.characterId].records[triumphHash];
                    //debug(triumph);
                    triumph.hash = triumphHash;
                    // if ((triumph.hash == '64778617') || (triumph.hash == "64778617")) {
                    //   debug(triumph);
                    // }

                    async.waterfall([
                        (callback) => {
                          // read record info
                          Destiny.queryRecordById(
                            triumphHash,
                            (err, item) => {
                              // if not record, don't add
                              if (item.displayProperties.name === '') {
                                //console.log('-----');
                                //console.log(item);
                                return callback(err);
                              }
                              // if (item.displayProperties.name.match(/nuit/i)) {
                              //   debug(triumphHash + ' ' + item.displayProperties.name);
                              // }
                              //if (triumph.hash === '3758540824') {
                              //if ((triumph.hash == '1842255612') || (triumph.hash == "1082441448")) {
                              //if (item.presentationInfo.parentPresentationNodeHashes.length == 0) {
                              //debug(item);
                              //}


                              triumph.item = _.pick(item, ['displayProperties', 'hash', 'presentationInfo.parentPresentationNodeHashes']);
                              //console.log(triumph.hash);
                              if (item.completionInfo) {
                                triumph.scoreValue = item.completionInfo.ScoreValue;
                              }
                              character.triumphs.push(triumph);
                              callback();
                            },
                            lang);
                        },
                        (callback) => {
                          if (triumph.item && triumph.item.presentationInfo && triumph.item.presentationInfo.parentPresentationNodeHashes.length != 0) {
                            //debug(triumph.item.presentationInfo.parentPresentationNodeHashes[0]);
                            let presentationHash = triumph.item.presentationInfo.parentPresentationNodeHashes[0];
                            Destiny.queryPresentationNodeById(presentationHash, (err, presentationNode) => {
                              if (presentationNode.displayProperties.icon) {
                                triumph.parentIcon = presentationNode.displayProperties.icon;
                                callback(err);
                              } else {
                                presentationHash = presentationNode.parentNodeHashes[0];
                                Destiny.queryPresentationNodeById(presentationHash, (err, presentationNode) => {
                                  if (presentationNode.displayProperties.icon) {
                                    triumph.parentIcon = presentationNode.displayProperties.icon;
                                    callback(err);
                                  } else {
                                    presentationHash = presentationNode.parentNodeHashes[0];
                                    Destiny.queryPresentationNodeById(presentationHash, (err, presentationNode) => {
                                      if (presentationNode.displayProperties.icon) {
                                        triumph.parentIcon = presentationNode.displayProperties.icon;
                                        callback(err);
                                      } else {
                                        presentationHash = presentationNode.parentNodeHashes[0];
                                        Destiny.queryPresentationNodeById(presentationHash, (err, presentationNode) => {
                                          if (presentationNode.displayProperties.icon) {
                                            triumph.parentIcon = presentationNode.displayProperties.icon;
                                            callback(err);
                                          } else {
                                            presentationHash = presentationNode.parentNodeHashes[0];
                                            Destiny.queryPresentationNodeById(presentationHash, (err, presentationNode) => {
                                              if (presentationNode.displayProperties.icon) {
                                                triumph.parentIcon = presentationNode.displayProperties.icon;
                                                callback(err);
                                              } else {
                                                debug("not found !!");
                                                callback(err);
                                              }
                                            }, lang);
                                          }
                                        }, lang);
                                      }
                                    }, lang);
                                  }
                                }, lang);
                              }
                            }, lang);
                          } else {
                            callback();
                          }
                        },
                        (callback) => {
                          async.forEachSeries(
                            triumph.objectives,
                            (objective, callback) => {
                              Destiny.queryObjectiveById(objective.objectiveHash,
                                (err, item) => {
                                  objective.item = _.pick(item, ['progressDescription']);

                                  // add objective to list
                                  const key = character.characterId + triumph.hash + objective.objectiveHash;
                                  //debug(key+' => '+objective.progress);
                                  result.objectives[key] = objective.progress;

                                  callback(err);
                                },
                                lang)
                            },
                            (err) => {
                              callback(err);
                            }
                          );
                        }
                      ],
                      (err) => {
                        if (err) {
                          error(err);
                        }
                        callback(err);
                      });


                  },
                  (err) => {
                    if (err) {
                      error(err);
                    }
                    callback(err);
                  }
                );
              },
              (err) => {
                if (err) {
                  error(err);
                }
                callback(err);
              }
            );
          },

          // read the checklist for profile
          function (callback) {
            async.eachSeries(
              Object.keys(data.profileProgression.data.checklists),
              function (checklistId, callback) {
                const checklist = {
                  data: data.profileProgression.data.checklists[checklistId],
                  instanceId: checklistId,
                  count: 0,
                  done: 0
                };
                async.eachSeries(
                  Object.keys(checklist.data),
                  function (checklistItem, callback) {
                    checklist.count++;
                    if (checklist.data[checklistItem]) {
                      checklist.done++;
                    }
                    callback();
                  },
                  function (err) {
                    result.checklists.push(checklist);
                    checklistToLoad.push(checklist);
                    callback(err);
                  });
              },
              function (err) {
                //console.log(profileProgressionTable);
                callback(err);
              }
            );
          },

          // read the checklist for characters
          function (callback) {
            async.eachSeries(
              result.characters,
              function (character, callback) {
                character.checklists = [];
                async.eachSeries(
                  Object.keys(data.characterProgressions.data[character.characterId].checklists),
                  function (checklistId, callback) {
                    const checklist = {
                      data: data.characterProgressions.data[character.characterId].checklists[checklistId],
                      instanceId: checklistId,
                      count: 0,
                      done: 0
                    };
                    async.eachSeries(
                      Object.keys(checklist.data),
                      function (checklistItem, callback) {
                        checklist.count++;
                        if (checklist.data[checklistItem]) {
                          checklist.done++;
                        }
                        callback();
                      },
                      function (err) {
                        character.checklists.push(checklist);
                        checklistToLoad.push(checklist);
                        callback(err);
                      });

                  },
                  function (err) {
                    callback(err);
                  }
                )
              },
              function (err) {
                //console.log(profileProgressionTable);
                callback(err);
              }
            );
          },

          // read the milestone for characters
          function (callback) {
            async.eachSeries(
              result.characters,
              function (character, callback) {
                character.milestones = [];
                async.eachSeries(
                  Object.keys(data.characterProgressions.data[character.characterId].milestones),
                  function (milestoneId, callback) {
                    const milestone = {
                      data: data.characterProgressions.data[character.characterId].milestones[milestoneId],
                      instanceId: milestoneId,
                      characterId: character.characterId,
                      objectives: [],
                      rewards: []
                    };
                    milestone.data = data.characterProgressions.data[character.characterId].milestones[milestoneId];
                    milestone.instanceId = milestoneId;

                    async.waterfall([
                        function (callback) {
                          // Read the objectives
                          milestone.objectives = [];
                          async.eachSeries(
                            milestone.data.activities,
                            function (activity, callback) {
                              async.eachSeries(
                                activity.challenges,
                                function (challenge, callback) {
                                  let found = false;
                                  milestone.objectives.forEach(obj => {
                                    if (obj.objectiveHash === challenge.objective.objectiveHash) {
                                      found = true;
                                    }
                                  });
                                  if (!found) {
                                    milestone.objectives.push(challenge.objective);

                                    // add objective to list
                                    //debug(challenge);
                                    const key = character.characterId + milestone.instanceId + challenge.objective.objectiveHash;
                                    //debug(key+' => '+challenge.objective.progress);
                                    result.objectives[key] = challenge.objective.progress;
                                  }
                                  callback();
                                },
                                function (err) {
                                  callback(err);
                                });
                            },
                            function (err) {
                              callback(err);
                            });
                        },
                        function (callback) {
                          // Read the objectives (from quests)
                          async.eachSeries(
                            milestone.data.availableQuests,
                            function (quest, callback) {
                              async.eachSeries(
                                quest.status.stepObjectives,
                                function (challenge, callback) {
                                  let found = false;
                                  milestone.objectives.forEach(obj => {
                                    if (obj.objectiveHash === challenge.objectiveHash) {
                                      found = true;
                                    }
                                  });
                                  if (!found) {
                                    milestone.objectives.push(challenge);
                                    // add objective to list
                                    //debug(challenge);
                                    const key = character.characterId + milestone.instanceId + challenge.objectiveHash;
                                    //debug(key+' => '+challenge.progress);
                                    result.objectives[key] = challenge.progress;
                                  }
                                  callback();
                                },
                                function (err) {
                                  callback(err);
                                });
                            },
                            function (err) {
                              callback(err);
                            });
                        },
                        function (callback) {
                          // Read the rewards
                          milestone.rewards = [];
                          async.eachSeries(
                            milestone.data.rewards,
                            function (rewardCategory, callback) {
                              async.eachSeries(
                                rewardCategory.entries,
                                function (reward, callback) {
                                  reward.rewardCategoryHash = rewardCategory.rewardCategoryHash;
                                  reward.itemHash = reward.rewardEntryHash;
                                  milestone.rewards.push(reward);
                                  //debug(JSON.stringify(reward, null, 2));
                                  callback();
                                },
                                function (err) {
                                  callback(err);
                                });
                            },
                            function (err) {
                              callback(err);
                            });
                        },
                        function (callback) {
                          // Add rewards on missing one
                          if ((milestone.data.milestoneHash === Destiny.MILESTONE_FLASH_POINT) ||
                            (milestone.data.milestoneHash === Destiny.MILESTONE_GUARDIAN_OF_ALL) ||
                            (milestone.data.milestoneHash === Destiny.MILESTONE_IRON_BANNER) ||
                            (milestone.data.milestoneHash === Destiny.MILESTONE_RECIPE_FOR_SUCCESS)) {
                            if (milestone.rewards.length == 0) {
                              let reward = {
                                earned: false,
                                itemHash: Destiny.CHALLENGE_SOURCED_REWARD,
                                items: [],
                                redeemed: false,
                                rewardCategoryHash: Destiny.CHALLENGE_SOURCED_REWARD,
                                rewardEntryHash: Destiny.CHALLENGE_SOURCED_REWARD,
                                quantity: 1,
                                displayProperties: {}
                              };
                              milestone.rewards.push(reward);

                              Destiny.queryItemById(Destiny.POWERFUL_GEAR, (err, data) => {
                                reward.displayProperties = data.displayProperties;
                                //debug(JSON.stringify(reward, null, 2));
                                callback();
                              }, lang);

                            } else {
                              callback();
                            }
                          } else {
                            callback();
                          }
                        },
                        function (callback) {
                          //debug(milestone); // "536115997"
                          // Read the rewards from quests
                          if (milestone.data.milestoneHash) {

                            Destiny.queryMilestoneById(milestone.data.milestoneHash, (err, milestoneDef) => {
                              if (milestoneDef.quests) {
                                async.eachSeries(
                                  Object.keys(milestoneDef.quests),
                                  function (questItemHash, callback) {
                                    if (!milestoneDef.quests[questItemHash].questRewards) {
                                      return callback()
                                    }
                                    //debug(milestoneDef.displayProperties.description);
                                    milestone.rewards.push(milestoneDef.quests[questItemHash].questRewards.items[0]);
                                    Destiny.queryItemById(milestoneDef.quests[questItemHash].questRewards.items[0].itemHash, (err, data) => {
                                      //debug(data.displayProperties);
                                      milestoneDef.quests[questItemHash].questRewards.items[0].displayProperties = data.displayProperties;
                                      callback();
                                    }, lang)

                                  },
                                  function (err) {
                                    //debug(JSON.stringify(milestone.rewards, null, 2));
                                    callback(err);
                                  }
                                )
                              } else {
                                callback(err);
                              }
                            }, lang)
                          } else {
                            callback(err);
                          }
                        }
                      ],
                      function (err) {
                        //if (milestoneId === '3603098564') {
                        //debug(milestone);
                        //}
                        character.milestones.push(milestone);
                        milestoneToLoad.push(milestone);
                        callback(err);
                      });


                  },
                  function (err) {
                    callback(err);
                  }
                )
              },
              function (err) {
                //console.log(profileProgressionTable);
                callback(err);
              }
            );
          },

          // read the progressions for characters
          function (callback) {
            async.eachSeries(
              result.characters,
              function (character, callback) {
                character.progressions = [];
                async.eachSeries(
                  Object.keys(data.characterProgressions.data[character.characterId].progressions),
                  function (progressionId, callback) {
                    const progression = {
                      data: data.characterProgressions.data[character.characterId].progressions[progressionId],
                      instanceId: progressionId,
                      characterId: character.characterId,
                      objectives: []
                    };

                    // async.waterfall([
                    //     function (callback) {
                    //       // Read the objectives
                    //       milestone.objectives = [];
                    //       async.eachSeries(
                    //         milestone.data.activities,
                    //         function (activity, callback) {
                    //           async.eachSeries(
                    //             activity.challenges,
                    //             function (challenge, callback) {
                    //               let found = false;
                    //               milestone.objectives.forEach(obj => {
                    //                 if (obj.objectiveHash === challenge.objective.objectiveHash) {
                    //                   found = true;
                    //                 }
                    //               });
                    //               if (!found) {
                    //                 milestone.objectives.push(challenge.objective);
                    //
                    //                 // add objective to list
                    //                 //debug(challenge);
                    //                 const key = character.characterId + milestone.instanceId + challenge.objective.objectiveHash;
                    //                 //debug(key+' => '+challenge.objective.progress);
                    //                 result.objectives[key] = challenge.objective.progress;
                    //               }
                    //               callback();
                    //             },
                    //             function (err) {
                    //               callback(err);
                    //             });
                    //         },
                    //         function (err) {
                    //           callback(err);
                    //         });
                    //     },
                    //     function (callback) {
                    //       // Read the objectives (from quests)
                    //       async.eachSeries(
                    //         milestone.data.availableQuests,
                    //         function (quest, callback) {
                    //           async.eachSeries(
                    //             quest.status.stepObjectives,
                    //             function (challenge, callback) {
                    //               let found = false;
                    //               milestone.objectives.forEach(obj => {
                    //                 if (obj.objectiveHash === challenge.objectiveHash) {
                    //                   found = true;
                    //                 }
                    //               });
                    //               if (!found) {
                    //                 milestone.objectives.push(challenge);
                    //                 // add objective to list
                    //                 //debug(challenge);
                    //                 const key = character.characterId + milestone.instanceId + challenge.objectiveHash;
                    //                 //debug(key+' => '+challenge.progress);
                    //                 result.objectives[key] = challenge.progress;
                    //               }
                    //               callback();
                    //             },
                    //             function (err) {
                    //               callback(err);
                    //             });
                    //         },
                    //         function (err) {
                    //           callback(err);
                    //         });
                    //     },
                    //     function (callback) {
                    //       // Read the rewards
                    //       milestone.rewards = [];
                    //       async.eachSeries(
                    //         milestone.data.rewards,
                    //         function (rewardCategory, callback) {
                    //           async.eachSeries(
                    //             rewardCategory.entries,
                    //             function (reward, callback) {
                    //               reward.rewardCategoryHash = rewardCategory.rewardCategoryHash;
                    //               reward.itemHash = reward.rewardEntryHash;
                    //               milestone.rewards.push(reward);
                    //               //debug(JSON.stringify(reward, null, 2));
                    //               callback();
                    //             },
                    //             function (err) {
                    //               callback(err);
                    //             });
                    //         },
                    //         function (err) {
                    //           callback(err);
                    //         });
                    //     },
                    //     function (callback) {
                    //       // Add rewards on missing one
                    //       if ((milestone.data.milestoneHash === Destiny.MILESTONE_FLASH_POINT) ||
                    //         (milestone.data.milestoneHash === Destiny.MILESTONE_GUARDIAN_OF_ALL) ||
                    //         (milestone.data.milestoneHash === Destiny.MILESTONE_IRON_BANNER) ||
                    //         (milestone.data.milestoneHash === Destiny.MILESTONE_RECIPE_FOR_SUCCESS)) {
                    //         if (milestone.rewards.length == 0) {
                    //           let reward = {
                    //             earned: false,
                    //             itemHash: Destiny.CHALLENGE_SOURCED_REWARD,
                    //             items: [],
                    //             redeemed: false,
                    //             rewardCategoryHash: Destiny.CHALLENGE_SOURCED_REWARD,
                    //             rewardEntryHash: Destiny.CHALLENGE_SOURCED_REWARD,
                    //             quantity: 1,
                    //             displayProperties: {}
                    //           };
                    //           milestone.rewards.push(reward);
                    //
                    //           Destiny.queryItemById(Destiny.POWERFUL_GEAR, (err, data) => {
                    //             reward.displayProperties = data.displayProperties;
                    //             //debug(JSON.stringify(reward, null, 2));
                    //             callback();
                    //           }, lang);
                    //
                    //         } else {
                    //           callback();
                    //         }
                    //       } else {
                    //         callback();
                    //       }
                    //     },
                    //     function (callback) {
                    //       //debug(milestone); // "536115997"
                    //       // Read the rewards from quests
                    //       if (milestone.data.milestoneHash) {
                    //
                    //         Destiny.queryMilestoneById(milestone.data.milestoneHash, (err, milestoneDef) => {
                    //           if (milestoneDef.quests) {
                    //             async.eachSeries(
                    //               Object.keys(milestoneDef.quests),
                    //               function (questItemHash, callback) {
                    //                 if (!milestoneDef.quests[questItemHash].questRewards) {
                    //                   return callback()
                    //                 }
                    //                 //debug(milestoneDef.displayProperties.description);
                    //                 milestone.rewards.push(milestoneDef.quests[questItemHash].questRewards.items[0]);
                    //                 Destiny.queryItemById(milestoneDef.quests[questItemHash].questRewards.items[0].itemHash, (err, data) => {
                    //                   //debug(data.displayProperties);
                    //                   milestoneDef.quests[questItemHash].questRewards.items[0].displayProperties = data.displayProperties;
                    //                   callback();
                    //                 }, lang)
                    //
                    //               },
                    //               function (err) {
                    //                 //debug(JSON.stringify(milestone.rewards, null, 2));
                    //                 callback(err);
                    //               }
                    //             )
                    //           } else {
                    //             callback(err);
                    //           }
                    //         }, lang)
                    //       } else {
                    //         callback(err);
                    //       }
                    //     }
                    //   ],
                    //   function (err) {
                    //if (milestoneId === '3603098564') {
                    //debug(milestone);
                    //}
                    character.progressions.push(progression);
                    //debug(progression);
                    progressionToLoad.push(progression);
                    callback(err);
                    //});


                  },
                  function (err) {
                    callback(err);
                  }
                )
              },
              function (err) {
                //console.log(profileProgressionTable);
                callback(err);
              }
            );
          },

          // Fill the checklist from manifest
          function (callback) {
            async.eachSeries(
              checklistToLoad,
              function (checklist, callback) {
                if (checklist.instanceId) {
                  Destiny.queryChecklistById(checklist.instanceId, function (err, definition) {
                    if (err) return callback(err);
                    checklist.definition = definition;
                    checklist.checklistName = definition.displayProperties.name;
                    if (!checklist.checklistName) {
                      //debug.error("Empty definition name");
                      //debug.warn(JSON.stringify(definition, null, 2));
                      checklist.checklistName = "Unknown name";
                    }
                    callback(null);
                  }, lang)
                } else {
                  error("Empty checklist definition");
                  //error(JSON.stringify(checklist.instanceId, null, 2));
                  callback(null);
                }
              },
              function (err) {
                callback(err);
              }
            );
          },

          // Fill the milestone from manifest
          function (callback) {
            async.eachSeries(
              milestoneToLoad,
              function (milestone, callback) {
                if (milestone.instanceId) {
                  Destiny.queryMilestoneById(milestone.instanceId, function (err, definition) {
                    if (err) return callback(err);
                    milestone.definition = definition;
                    milestone.milestoneName = definition.displayProperties.name;
                    milestone.icon = definition.displayProperties.icon;
                    milestone.description = definition.displayProperties.description;

                    //result.pursuitsName[milestone.instanceId] = 'Milestone : ' + definition.displayProperties.name;

                    // if no name, unknown one
                    if (!milestone.milestoneName) {
                      //debug.error("Empty definition name");
                      //debug.warn(JSON.stringify(definition, null, 2));
                      milestone.milestoneName = "Unknown name";
                    }

                    // if no icon, search elsewhere
                    if (!milestone.icon && definition.quests) {
                      Object.keys(definition.quests).forEach(q => {
                        if (definition.quests[q].displayProperties.icon) {
                          milestone.icon = definition.quests[q].displayProperties.icon;
                        }
                      })
                    }

                    async.waterfall([
                        function (callback) {
                          // filling the rewards with definition
                          if (milestone.definition.rewards) {
                            //(JSON.stringify(milestone.definition.rewards, null, 2));
                            async.eachSeries(
                              milestone.rewards,
                              function (reward, callback) {
                                //debug.warn(JSON.stringify(reward, null, 2));
                                //debug.warn(JSON.stringify(milestone.definition.rewards[reward.rewardCategoryHash].rewardEntries[reward.rewardEntryHash], null, 2));
                                reward.definition = milestone.definition.rewards[reward.rewardCategoryHash].rewardEntries[reward.rewardEntryHash];

                                reward.items = [];
                                async.eachSeries(
                                  reward.definition.items,
                                  function (item, callback) {
                                    Destiny.queryItemById(item.itemHash, function (err, definition) {
                                      if (err) return callback(err);
                                      item.definition = definition;
                                      item.itemName = definition.displayProperties.name;
                                      item.icon = definition.displayProperties.icon;
                                      if (!item.itemName) {
                                        item.itemName = "Unknown name";
                                      }
                                      callback(null);
                                    }, lang);
                                  },
                                  function (err) {
                                    callback(err);
                                  }
                                );
                              },
                              function (err) {
                                callback(err);
                              }
                            );
                          } else {
                            callback();
                          }
                        },
                        function (callback) {
                          // filling the objectives with definition
                          if (milestone.objectives) {
                            //(JSON.stringify(milestone.objectives, null, 2));
                            async.eachSeries(
                              milestone.objectives,
                              function (objective, callback) {
                                const key = milestone.characterId + milestone.instanceId + objective.objectiveHash;
                                //debug(key+' => '+objective.progress);
                                result.objectives[key] = objective.progress;

                                Destiny.queryObjectiveById(objective.objectiveHash, function (err, definition) {
                                  if (err) return callback(err);
                                  objective.definition = definition;
                                  objective.itemName = definition.progressDescription;
                                  objective.icon = definition.displayProperties.icon;
                                  if (!objective.itemName) {
                                    objective.itemName = "Unknown name";
                                  }
                                  callback(null);
                                }, lang);
                              },
                              function (err) {
                                callback(err);
                              }
                            );
                          } else {
                            callback();
                          }

                        }
                      ],
                      (err) => {
                        //if (milestone.data && milestone.data.activities && (milestone.data.activities[0].challenges.length > 1)) {
                        //debug(milestone.milestoneName+" "+milestone.instanceId);
                        //debug(milestone.data.activities);
                        //}

                        //if (milestone.instanceId === '3427325023') {
                        //debug(milestone);
                        //}

                        callback(err);
                      });
                  }, lang)
                } else {
                  error("Empty milestone definition");
                  error(JSON.stringify(milestone.instanceId, null, 2));
                  callback(null);
                }
              },
              function (err) {
                callback(err);
              }
            );
          },

          // Fill the progression from manifest
          function (callback) {
            async.eachSeries(
              progressionToLoad,
              function (progression, callback) {
                if (progression.instanceId) {
                  Destiny.queryProgressionById(progression.instanceId, function (err, definition) {
                    if (err) return callback(err);
                    progression.definition = definition;
                    progression.progressionName = definition.displayProperties.name;
                    progression.icon = definition.displayProperties.icon;
                    progression.description = definition.displayProperties.description;

                    //result.pursuitsName[progression.instanceId] = 'Progression : ' + definition.displayProperties.name;

                    // if no name, unknown one
                    if (!progression.progressionName) {
                      //debug.error("Empty definition name");
                      //debug.warn(JSON.stringify(definition, null, 2));
                      progression.progressionName = "Unknown name";
                    }
                    // weird (double) progressions
                    if (progression.definition.scope === 8) {
                      //debug.error("Empty definition name");
                      //debug.warn(JSON.stringify(definition, null, 2));
                      progression.progressionName = "Unknown name";
                    }

                    // if no icon, search elsewhere
                    if (!progression.icon && definition.quests) {
                      Object.keys(definition.quests).forEach(q => {
                        if (definition.quests[q].displayProperties.icon) {
                          progression.icon = definition.quests[q].displayProperties.icon;
                        }
                      })
                    }

                    // add fake objectives
                    if (definition.steps && (definition.repeatLastStep === false)) {
                      let progressTotal = 0;
                      definition.steps.forEach(step => {
                        progressTotal += step.progressTotal;
                      });
                      if (progressTotal) {
                        progression.objectives.push({
                          objectiveHash: progression.instanceId + "_1",
                          completionValue: progressTotal,
                          complete: (progression.data.currentProgress >= progressTotal),
                          progress: progression.data.currentProgress,
                          itemName: 'Points to reset'
                        });
                        const key = progression.characterId + progression.instanceId + progression.instanceId + "_1";
                        result.objectives[key] = progression.data.currentProgress;

                      }
                    } else {
                      const completionValue = progression.data.currentProgress - progression.data.progressToNextLevel + progression.data.nextLevelAt;
                      progression.objectives.push({
                        objectiveHash: progression.instanceId + "_1",
                        completionValue: completionValue,
                        complete: (progression.data.currentProgress >= completionValue),
                        progress: progression.data.currentProgress,
                        itemName: 'Points to level '+ (progression.data.level + 1)
                      });
                      const key = progression.characterId + progression.instanceId + progression.instanceId + "_1";
                      result.objectives[key] = progression.data.currentProgress;
                    }
                    if (progression.data.seasonResets) {
                      let resets = 0;
                      progression.data.seasonResets.forEach(r => {
                        if (r.resets > resets) {
                          resets = r.resets;
                        }
                      });
                      progression.objectives.push({
                        objectiveHash: progression.instanceId + "_2",
                        completionValue: 3,
                        complete: (resets >= 3),
                        progress: resets,
                        itemName: 'Resets max'
                      });
                      const key = progression.characterId + progression.instanceId + progression.instanceId + "_2";
                      result.objectives[key] = resets;
                    }

                    // if (progression.progressionName !== 'Unknown name') {
                    //   //debug(JSON.stringify(progression,null,2));
                    //   debug(progression.progressionName+' '+progression.definition.scope);
                    // }

                    //if (progression.data && progression.data.activities && (progression.data.activities[0].challenges.length > 1)) {
                    //debug(progression.progressionName+" "+progression.instanceId);
                    //debug(progression.data.activities);
                    //}

                    //if (progression.instanceId === '3427325023') {
                    //debug(progression);
                    //}

                    callback(err);
                  }, lang)
                } else {
                  error("Empty progression definition");
                  error(JSON.stringify(progression.instanceId, null, 2));
                  callback(null);
                }
              },
              function (err) {
                callback(err);
              }
            );
          },

          // build item listStats from the  profile inventories
          function (callback) {
            itemsToLoad = data.profileInventory.data.items;

            // add items from the  characters inventories
            async.eachSeries(
              Object.keys(data.characterInventories.data),
              function (characterId, callback) {
                async.eachSeries(
                  data.characterInventories.data[characterId].items,
                  function (item, callback) {
                    item.characterId = characterId;
                    itemsToLoad.push(item);
                    callback();
                  },
                  function (err) {
                    callback(err);
                  }
                );
              },
              function (err) {
                callback(err);
              }
            )
          },

          // build item listStats from the  profile inventories
          function (callback) {
            async.eachSeries(
              Object.keys(data.characterEquipment.data),
              function (characterId, callback) {
                async.eachSeries(
                  data.characterEquipment.data[characterId].items,
                  function (item, callback) {
                    item.characterId = characterId;
                    itemsToLoad.push(item);
                    callback();
                  }
                );
                callback();
              },
              function (err) {
                callback(err);
              }
            )
          },

          // Fill the items
          function (callback) {
            async.eachSeries(
              itemsToLoad,
              function (item, callback) {
                async.waterfall([
                    // Add item info
                    function (callback) {
                      if (item.itemHash) {
                        Destiny.queryItemById(item.itemHash, function (err, definition) {

                          if (err) return callback(err);

                          item.item = _.pick(definition, ['displayProperties', 'classType', 'inventory', 'value', 'itemType', 'itemTypeDisplayName', 'itemTypeAndTierDisplayName', 'quality', 'objectives.questlineItemHash']);
                          item.itemName = definition.displayProperties.name;
                          if (definition.objectives) {
                            item.questlineItemHash = definition.objectives.questlineItemHash;
                          }
                          if (!item.itemName) {
                            //debug.error("Empty definition name");
                            //debug.warn(JSON.stringify(definition, null, 2));
                            item.itemName = "Unknown name";
                          }
                          //if (item.itemHash === 4014308450) {
                          //debug(JSON.stringify(item, null, 2));
                          //}

                          callback(null, item);
                        }, lang)
                      } else {
                        error("Empty definition");
                        //error(JSON.stringify(item, null, 2));
                        callback(null, item);
                      }
                    },
                    // Remove item of the wrong class
                    function (item, callback) {
                      //debug(JSON.stringify(item.item.itemTypeDisplayName, null, 2));
                      //debug(JSON.stringify(result.characters[0].classType, null, 2));
                      //if (item.bucketHash == Destiny.pursuitsBucket.hash) {
                      //debug(JSON.stringify(item, null, 2));
                      //}
                      // class corresponding to unknown (all)
                      if (item.item.classType == 3) {
                        callback(null, item);
                      } else if (item.item.classType == result.characters[0].classType) {
                        // class corresponding to the character
                        callback(null, item);
                        //} else if (item.bucketHash == pursuitsBucket.hash) {
                        //  // pursuit (bounties, ...)
                        //  callback(null, item);
                      } else {
                        //debug(JSON.stringify(item.item, null, 2));
                        //debug(JSON.stringify(item.item.displayProperties.name+" removed"));
                        callback(null, null);
                      }
                    },
                    // Add item instance info
                    function (item, callback) {
                      if (!item) {
                        return callback(null, null);
                      }
                      //debug(JSON.stringify(item, null, 2));
                      if (item.itemInstanceId) {
                        if (itemInstancesTable[item.itemInstanceId]) {
                          item.instance = itemInstancesTable[item.itemInstanceId];
                        }
                        if (itemObjectivesTable[item.itemInstanceId]) {
                          item.objective = itemObjectivesTable[item.itemInstanceId];
                        }
                      } else {
                        //debug.error("No item instance id");
                        //debug(JSON.stringify(item, null, 2));
                      }
                      callback(null, item);
                    },
                    // Add item socket info
                    function (item, callback) {
                      if (!item) {
                        return callback(null, null);
                      }
                      //debug(JSON.stringify(item, null, 2));
                      item.lightLevelBonus = 0;
                      if (item.itemInstanceId) {
                        if (itemSocketsTable[item.itemInstanceId]) {
                          item.sockets = itemSocketsTable[item.itemInstanceId].sockets;
                          //debug(JSON.stringify(item.sockets, null, 2));
                          // search for mod into sockets
                          async.eachSeries(
                            item.sockets,
                            function (socket, callback) {
                              if (socket.plugHash && socket.isEnabled) {
                                Destiny.queryItemById(socket.plugHash, function (err, plug) {
                                  // is it a mod
                                  if (err) {
                                    return callback(err, item);
                                  }
                                  if (plug.itemType == 19) {
                                    //debug(JSON.stringify(plug, null, 2));
                                    plug.investmentStats.forEach(function (stat) {
                                      if ((stat.statTypeHash == 1480404414) || (stat.statTypeHash == 3897883278)) {
                                        //debug(JSON.stringify(plug, null, 2));
                                        socket.plug = plug;
                                        item.lightLevelBonus += stat.value;
                                      }
                                    })
                                  }
                                  return callback(null, item);

                                }, lang);
                              } else {
                                return callback(null, item);
                              }
                            },
                            function (err) {
                              return callback(err, item);
                            }
                          );

                        } else {
                          //debug.error("Item Socket not found");
                          //debug.warn(JSON.stringify(item, null, 2));
                          callback(null, item);
                        }
                      } else {
                        //debug.error("No item instance id");
                        //debug(JSON.stringify(item, null, 2));
                        callback(null, item);
                      }
                    },
                    // Add current bucket data
                    function (item, callback) {
                      if (!item) {
                        return callback(null, null);
                      }
                      //debug(JSON.stringify(item, null, 2));
                      if (item.bucketHash) {
                        Destiny.queryBucketById(item.bucketHash, function (err, bucket) {
                          if (err) return callback(err, item);
                          item.bucket = bucket;
                          item.bucketName = bucket.displayProperties.name;
                          if (!item.bucketName) {
                            //debug.error("Empty bucket name");
                            //debug.error(JSON.stringify(bucket, null, 2));
                            //debug.error(JSON.stringify(item, null, 2));
                            item.bucketName = item.bucketHash;
                          }
                          callback(null, item);
                        }, lang)
                      } else {
                        error("Empty bucket");
                        //error(JSON.stringify(item, null, 2));
                        callback(null, item);
                      }
                    },
                    // Add target bucket data
                    function (item, callback) {
                      if (!item) {
                        return callback(null, null);
                      }
                      //debug(JSON.stringify(item, null, 2));
                      if (item.item.inventory.bucketTypeHash) {
                        Destiny.queryBucketById(item.item.inventory.bucketTypeHash, function (err, bucket) {
                          if (err) return callback(err, item);
                          item.bucketTarget = bucket;
                          item.bucketNameTarget = bucket.displayProperties.name;
                          if (!item.bucketNameTarget) {
                            //debug.error("Empty bucket name");
                            //debug.error(JSON.stringify(bucket, null, 2));
                            //debug.error(JSON.stringify(item, null, 2));
                            item.bucketNameTarget = item.item.inventory.bucketTypeHash;
                          }
                          callback(null, item);
                        }, lang)
                      } else {
                        error("Empty bucket");
                        //error(JSON.stringify(item, null, 2));
                        callback(null, item);
                      }
                    },
                    // Add value/rewards values
                    function (item, callback) {
                      if (!item) {
                        return callback(null, null);
                      }
                      //debug(JSON.stringify(item, null, 2));
                      if (item.item.value && item.item.value.itemValue) {
                        async.eachSeries(
                          item.item.value.itemValue,
                          function (value, callback) {
                            Destiny.queryItemById(value.itemHash, function (err, itemValue) {
                              value.item = itemValue;
                              callback();
                            }, lang)
                          },
                          function (err) {
                            callback(err, item);
                          }
                        );
                      } else {
                        callback(null, item);
                      }
                    },
                    // Add objectives values
                    function (item, callback) {
                      if (!item) {
                        return callback(null, null);
                      }
                      if (data.characterProgressions.data[item.characterId] && data.characterProgressions.data[item.characterId].uninstancedItemObjectives[item.itemHash]) {
                        item.objective = {
                          objectives: data.characterProgressions.data[item.characterId].uninstancedItemObjectives[item.itemHash]
                        };
                      }
                      if (item.objective && item.objective.objectives) {
                        async.eachSeries(
                          item.objective.objectives,
                          function (objective, callback) {
                            const key = (item.characterId || user.bungieNetUser.membershipId) + (item.itemInstanceId || 'HardCoded') + objective.objectiveHash;
                            //debug(key+' -> '+objective.progress);
                            result.objectives[key] = objective.progress;
                            //debug(item.itemInstanceId+' '+item.itemName+' => '+objective.progress);
                            //if (objective.objectiveHash == 3521931022) {
                            //debug(item);
                            //}
                            //if (item.itemInstanceId === '6917529091906914379') {
                            //  debug(item);
                            //}

                            Destiny.queryObjectiveById(objective.objectiveHash, function (err, itemValue) {
                              objective.item = itemValue;
                              //if ((item.itemHash === 432848324) ||
                              //  (item.itemHash === 2540008660)) {
                              //  debug(item.item.displayProperties.name+" "+item.itemHash+" "+item.bucketHash);
                              //  debug(JSON.stringify(objective.item, null, 2));
                              //  //debug(JSON.stringify(data.characterProgressions.data[item.characterId].uninstancedItemObjectives[item.itemHash]));
                              //}
                              callback();
                            }, lang)
                          },
                          function (err) {
                            callback(err, item);
                          }
                        );
                      } else {
                        callback(null, item);
                      }
                    },
                    // Clean the item (to have only needed data)
                    function (item, callback) {
                      if (!item) {
                        return callback(null, null);
                      }
                      //if (item.bucketHash == pursuitsBucket.hash) {
                      //debug(JSON.stringify(item, null, 2));
                      //}
                      //debug(item.bucketName+" : "+item.itemName);
                      //debug(JSON.stringify(item.instance, null, 2));
                      // ignore items with too high level
                      const itemLevel = (item.instance ? item.instance.equipRequiredLevel : null);
                      //debug(result.characters[0].baseCharacterLevel+" "+itemLevel);
                      if (itemLevel && result.characters[0].baseCharacterLevel + 1 < itemLevel) {
                        //debug(JSON.stringify(item.item.displayProperties.name+" removed"));
                        return callback(null, null);
                      }
                      // ignore items equipped on other characters
                      //if (item.instance && item.instance.isEquipped && (item.characterId != result.characters[0].characterId)) {
                      //  return callback(null, null);
                      //}
                      // ignore items not transferable
                      //if (item.transferStatus == 2) {
                      //  return callback(null, null);
                      //}
                      //if ((item.item.displayProperties.name == "AUriel's Gift") || (item.item.displayProperties.name == "Rat King's Crew")) {
                      //if (item.bucketHash == Destiny.pursuitsBucket.hash) {
                      //debug(JSON.stringify(item, null, 2));
                      //}
                      try {
                        const newItem = {
                          "bucket": item.bucket,
                          "bucketName": item.bucketName,
                          "bucketNameTarget": item.bucketNameTarget,
                          "itemInstanceId": (item.itemInstanceId ? item.itemInstanceId : null),
                          "damageType": (item.instance ? item.instance.damageType : null),
                          "isEquipped": (item.instance ? item.instance.isEquipped : null),
                          "equipRequiredLevel": (item.instance ? item.instance.equipRequiredLevel : null),
                          "lightLevel": (item.instance ? item.instance.itemLevel * 10 + item.instance.quality : null),
                          "lockable": item.lockable,
                          "state": item.state,
                          "transferStatus": item.transferStatus,
                          "itemType": item.item.itemType,
                          "classType": item.classType,
                          "location": item.location,
                          "name": item.item.displayProperties.name,
                          "description": item.item.displayProperties.description,
                          "itemTypeDisplayName": (item.item.itemTypeDisplayName ? item.item.itemTypeDisplayName : (item.bucket.displayProperties.name ? item.bucket.displayProperties.name : "Unknown")),
                          "itemTypeAndTierDisplayName": item.item.itemTypeAndTierDisplayName,
                          "infusionCategoryName": (item.item.quality ? item.item.quality.infusionCategoryName : null),
                          "characterId": item.characterId,
                          "itemHash": item.itemHash,
                          "tierType": item.item.inventory.tierType,
                          "lightLevelBonus": item.lightLevelBonus,
                          "expirationDate": item.expirationDate,
                          "rewards": [],
                          'icon': item.item.displayProperties.icon,
                          'objectives': [],
                          'questlineItemHash': item.questlineItemHash
                        };


                        //if (item.item.displayProperties.name == "Weekly Crucible Challenge") {
                        //debug(JSON.stringify(item, null, 2));
                        //  //newItem['temp'] = item;
                        //}


                        if (item.item.value && item.item.value.itemValue) {
                          //debug(item.bucketName+" : "+item.item.displayProperties.name);
                          //debug(JSON.stringify(item.bucketName, null, 2));
                          item.item.value.itemValue.forEach(function (it) {
                            if (it.itemHash) {
                              const newReward = {
                                itemHash: it.itemHash,
                                quantity: it.quantity,
                                name: it.item.displayProperties.name,
                                icon: it.item.displayProperties.icon
                              };
                              newItem.rewards.push(newReward);
                              //console.log(it);
                            }
                          })
                        }

                        if (item.objective && item.objective.objectives) {
                          newItem.objectives = item.objective.objectives;
                          //debug(item.objective.objectives);
                        }


                        //if (!newItem.itemTypeDisplayName) {
                        //debug(JSON.stringify(item, null, 2));
                        //}

                        callback(null, newItem);
                      } catch (e) {
                        error(e);
                        //error(JSON.stringify(item, null, 2));
                        callback(null);
                      }
                    }

                  ],
                  function (err, item) {
                    if (item) {
                      // We classify by bucketNameTarget and itemTypeDisplayName
                      if (!result.items[item.bucket.hash]) {
                        result.items[item.bucket.hash] = {};
                      }
                      if (!result.items[item.bucket.hash][item.itemTypeDisplayName]) {
                        result.items[item.bucket.hash][item.itemTypeDisplayName] = [];
                      }
                      //debug(item.bucketName+" : "+item.bucketNameTarget+" : "+item.name+" - "+item.itemTypeDisplayName);
                      result.items[item.bucket.hash][item.itemTypeDisplayName].push(item);
                    }

                    async.setImmediate(function () {
                      callback(err, result);
                    });
                  });

              },
              function (err) {
                callback(err, result);
              }
            )
          },

          // fill items names
          function (callback) {
            async.series([
                // Pursuits
                function (callback) {
                  //console.log(result.items['1345459588']);
                  async.eachSeries(Object.keys(result.items['1345459588']),
                    (key, callback) => {
                      async.eachSeries(result.items['1345459588'][key],
                        (item, callback) => {
                          //debug(item);
                          result.pursuitsName[item.itemInstanceId] = 'Pursuit : ' + item.name;
                          callback();
                        },
                        function (err) {
                          callback(err);
                        });
                    },
                    function (err) {
                      callback(err);
                    });
                },
                // Milestone
                function (callback) {
                  async.eachSeries(result.characters,
                    (char, callback) => {
                      async.eachSeries(char.milestones,
                        (milestone, callback) => {
                          //debug(milestone);
                          result.pursuitsName[milestone.instanceId] = 'Milestone : ' + milestone.milestoneName;
                          callback();
                        },
                        function (err) {
                          callback(err);
                        });
                    },
                    function (err) {
                      callback(err);
                    });
                },
                // Progression
                function (callback) {
                  async.eachSeries(result.characters,
                    (char, callback) => {
                      async.eachSeries(char.progressions,
                        (progression, callback) => {
                          //debug(progression);
                          result.pursuitsName[progression.instanceId] = 'Progression : ' + progression.progressionName;
                          callback();
                        },
                        function (err) {
                          callback(err);
                        });
                    },
                    function (err) {
                      callback(err);
                    });
                },
                // Catalysts
                function (callback) {
                  async.eachSeries(result.catalysts,
                    (catalyst, callback) => {
                      //debug(catalyst);
                      result.pursuitsName[catalyst.inventoryItem.itemInstanceId] = 'Catalyst : ' + catalyst.inventoryItem.itemName;
                      callback();
                    },
                    function (err) {
                      callback(err);
                    });
                },
                // Triumphs
                function (callback) {
                  async.eachSeries(result.triumphs,
                    (triumph, callback) => {
                      //debug(triumph);
                      result.pursuitsName[triumph.hash] = 'Triumph : ' + triumph.item.displayProperties.name;
                      callback();
                    },
                    function (err) {
                      callback(err);
                    });
                },
                // Vendors
                function (callback) {
                  async.eachSeries(result.characters,
                    (char, callback) => {
                      async.eachSeries(result.vendors[char.characterId],
                        (vendor, callback) => {
                          async.eachSeries(vendor.sales,
                            (sale, callback) => {
                              //debug(sale);
                              result.pursuitsName[sale.hash] = 'Contract : ' + sale.name;
                              callback();
                            },
                            function (err) {
                              callback(err);
                            });
                        },
                        function (err) {
                          callback(err);
                        });
                    },
                    function (err) {
                      callback(err);
                    });
                }

              ],
              function (err) {
                callback(err);
              });
          }
        ],

        function (err) {
          callback(err, result)
        });


    }, user.auth.access_token);

  };

  public static getVendors(user, characterId, callback, lang: string) {
    //debug("getVendors ");

    // Get the Destiny player
    let url = Destiny._URL_GET_VENDORS;
    url = url.replace(/[{]membershipType(})/, user.destinyMemberships[0].membershipType);
    url = url.replace(/[{]destinyMembershipId(})/, user.destinyMemberships[0].membershipId);
    url = url.replace(/[{]characterId(})/, characterId);
    //debug(JSON.stringify(url, null, 2));

    const result = [];


    Destiny._getFromBungie(url, function (err, data) {
      //debug(JSON.stringify(err, null, 2));
      //debug(JSON.stringify(data, null, 2));
      if (err) {
        return callback(err);
      }
      if (!data) {
        return callback("Error");
      }

      //console.log(data);
      //debug(JSON.stringify(data.sales, null, 2));

      async.eachSeries(
        Object.keys(data.sales.data),
        function (vendorId, callback) {
          //debug(JSON.stringify(vendorId, null, 2));
          const vendor = {
            name: "",
            enabled: false,
            visible: false,
            index: 0,
            sales: []
          };
          result.push(vendor);

          async.waterfall([
              //fill vendor from Database
              function (callback) {
                //debug(JSON.stringify(data.vendors.data[vendorId], null, 2));
                if (data.vendors.data[vendorId]) {
                  Destiny.queryVendorById(data.vendors.data[vendorId].vendorHash, function (err, vendorItem) {

                    vendor.name = vendorItem.displayProperties.name;
                    vendor.enabled = vendorItem.enabled;
                    vendor.visible = vendorItem.visible;
                    vendor.index = vendorItem.index;

                    //debug(JSON.stringify(vendor, null, 2));
                    callback();
                  }, lang)
                } else {
                  vendor.name = "unknown";
                  vendor.enabled = false;
                  vendor.visible = false;
                  vendor.index = 0;

                  //debug(JSON.stringify(vendor, null, 2));
                  callback();
                }
              },
              //get sales items
              function (callback) {
                async.eachSeries(
                  Object.keys(data.sales.data[vendorId].saleItems),
                  function (saleItemId, callback) {
                    const saleItem = data.sales.data[vendorId].saleItems[saleItemId];
                    //debug(JSON.stringify(saleItem, null, 2));
                    const sale = {
                      hash: 0,
                      index: 0,
                      quantity: 0,
                      saleStatus: 0,
                      rewards: [],
                      objectives: [],
                      name: "",
                      itemTypeDisplayName: "",
                      displaySource: "",
                      icon: ""
                    };
                    vendor.sales.push(sale);

                    sale.hash = saleItem.itemHash;
                    sale.index = saleItem.vendorItemIndex;
                    sale.quantity = saleItem.quantity;
                    sale.saleStatus = saleItem.saleStatus;

                    //if (sale.hash == 1438932723) {
                    //debug(JSON.stringify(saleItem, null, 2));
                    //}

                    Destiny.queryItemById(sale.hash, function (err, soldItem) {
                      //if (sale.hash == 1438932723) {
                      //debug(JSON.stringify(soldItem, null, 2));
                      //}

                      sale.name = soldItem.displayProperties.name;
                      sale.icon = soldItem.displayProperties.icon;
                      sale.itemTypeDisplayName = soldItem.itemTypeDisplayName;
                      sale.displaySource = soldItem.displaySource;

                      async.series(
                        [
                          // add rewards
                          (callback) => {
                            if (soldItem.value && soldItem.value.itemValue) {
                              async.eachSeries(
                                soldItem.value.itemValue,
                                function (value, callback) {
                                  if (value.itemHash != 0) {
                                    const reward = {
                                      hash: value.itemHash,
                                      quantity: value.quantity,
                                      name: "",
                                      item: {},
                                      itemHash: value.itemHash
                                    };
                                    sale.rewards.push(reward);
                                    Destiny.queryItemById(value.itemHash, function (err, itemValue) {
                                      reward.name = itemValue.displayProperties.name;
                                      reward.item = itemValue;
                                      callback();
                                    }, lang)
                                  } else {
                                    callback();
                                  }
                                },
                                function (err) {
                                  callback(err);
                                }
                              );
                            } else {
                              callback();
                            }
                          },
                          // add objectives
                          (callback) => {
                            if (soldItem.objectives && soldItem.objectives.objectiveHashes) {
                              async.eachSeries(
                                soldItem.objectives.objectiveHashes,
                                function (objectiveHash, callback) {
                                  const objective = {
                                    complete: false,
                                    completionValue: 0,
                                    item: {},
                                    objectiveHash: objectiveHash,
                                    progress: 0,
                                    timeTillFinished: 0,
                                    visible: true,
                                  };
                                  sale.objectives.push(objective);
                                  //debug(soldItem.displayProperties.name+" "+objectiveHash);
                                  Destiny.queryObjectiveById(objectiveHash, function (err, item) {
                                    objective.completionValue = item.completionValue;
                                    objective.item = item;

                                    //debug(item);
                                    callback();
                                  }, lang)
                                },
                                function (err) {
                                  callback(err);
                                })
                            } else {
                              callback();
                            }
                          }
                        ],
                        (err) => {
                          callback(err);
                        }
                      )
                    }, lang);

                  },
                  function (err) {
                    callback(err);
                  }
                )

              }
            ],
            function (err) {
              callback(err);
            });

          //debug(JSON.stringify(data.sales.data[vendorId], null, 2));


        },
        function (err) {
          callback(err, result);
        }
      )


    }, user.auth.access_token);
  };

  public static addObjectivesTime(user, data, callback) {
    //debug('addObjectivesTime');
    DestinyDb.listTimes((err, times) => {
      if (err) {
        return callback(err);
      }
      data.times = {};

      //debug(data.objectives);

      async.eachSeries(
        times,
        (objectiveTime: ObjectiveTime, callback) => {
          let modified = false;
          const key = objectiveTime.characterId + objectiveTime.pursuitId + objectiveTime.objectiveId;
          //debug(objectiveTime.pursuitId + " " + data.pursuitsName[objectiveTime.pursuitId]+" ("+objectiveTime.pursuitName+")");
          //debug(key+ " -> " + data.objectives[key]);

          if (data.pursuitsName[objectiveTime.pursuitId] && (objectiveTime.pursuitName !== data.pursuitsName[objectiveTime.pursuitId])) {
            objectiveTime.pursuitName = data.pursuitsName[objectiveTime.pursuitId];
            modified = true;
          }

          // if this objective is for this user
          if (objectiveTime.bungieNetUser === user.bungieNetUser.membershipId) {
            if (!objectiveTime.finished && data.objectives[key] && (objectiveTime.countEnd < data.objectives[key])) {
              // if not finished and objective count change
              objectiveTime.countEnd = data.objectives[key];
              objectiveTime.timeEnd = new Date();
              modified = true;
              debug("Objective change " + objectiveTime.objectiveId);
              debug(objectiveTime);
            } else if (!objectiveTime.finished && (data.objectives[key] == null)) {
              // if not finished and not any more objective
              //   if not so old, end count
              if ((new Date().getTime() - objectiveTime.lastVerified.getTime()) < 3 * 60 * 1000) {
                objectiveTime.countEnd = objectiveTime.countFinished;
                objectiveTime.timeEnd = new Date();
                objectiveTime.finished = true;
                modified = true;
                debug("Force countEnd " + objectiveTime.objectiveId);
                debug(objectiveTime);
              }
            }
          }

          // if modified, save it
          if (modified) {
            DestinyDb.insertTime(
              objectiveTime.bungieNetUser,
              objectiveTime,
              (err) => {
                data.times[objectiveTime.objectiveId] = ObjectiveTime.getSum(objectiveTime, data.times[objectiveTime.objectiveId]);
                callback(err);
              });
          } else {
            data.times[objectiveTime.objectiveId] = ObjectiveTime.getSum(objectiveTime, data.times[objectiveTime.objectiveId]);
            callback(null);
          }

        },
        (err) => {
          //debug(data.times);
          callback(err, data, times);
        }
      )

    });
  }

//noinspection JSUnusedGlobalSymbols
  public static lockItem(user, item, characterId, state, callback) {
    //debug("lockItem");

    // Get the Destiny player
    Destiny._postFromBungie(Destiny._URL_LOCK_ITEM,
      {
        state: state,
        itemId: item.itemInstanceId,
        characterId: item.characterId || characterId,
        membershipType: user.destinyMemberships[0].membershipType
      }
      , function (err) {
        //debug(JSON.stringify(err, null, 2));
        //debug(JSON.stringify(data, null, 2));
        if (err) {
          return callback(err);
        }
        callback();

      }, user.auth.access_token);
  };

  public static equipItem(user, item, callback) {
    //debug("equipItem "+item.name+" "+(item.lightLevel+item.lightLevelBonus));

    // Get the Destiny player
    Destiny._postFromBungie(Destiny._URL_EQUIP_ITEM,
      {
        itemId: item.itemInstanceId,
        characterId: item.characterId,
        membershipType: user.destinyMemberships[0].membershipType
      }
      , function (err) {
        //debug(JSON.stringify(err, null, 2));
        //debug(JSON.stringify(data, null, 2));
        if (err) {
          return callback(err);
        }
        callback();

      }, user.auth.access_token);
  };

  /**
   * Move item (or equip it)
   * @param user              the User
   * @param item              the item to move (or equip)
   * @param itemCanBeEquipped item to equip if we need to move to vault the equipped item
   * @param characterId       the character we are working with
   * @param moveToVault       we move to the vault (true) or from the vault (false)
   * @param equip             shall we equip the item
   * @param callback          callback
   */
  public static moveItem(user, item, itemCanBeEquipped, characterId, moveToVault, equip, callback) {
    //debug("moveItem");
    //debug(JSON.stringify(item, null, 2));
    //debug(JSON.stringify(characterId, null, 2));

    // if item is equipped and must be transfer to vault, switch it with itemCanBeEquipped
    if (item.isEquipped && moveToVault && itemCanBeEquipped) {

      Destiny.equipItem(user, itemCanBeEquipped, function (err) {
        if (err) {
          return callback(err);
        }
        item.isEquipped = false;

        Destiny.moveItem(user, item, null, characterId, moveToVault, equip, function (err) {
          return callback(err);
        });
      });
      // if the item must be equipped and is in the vault, move it to the inventory
    } else if (equip && (item.bucketName == "General")) {
      Destiny.moveItem(user, item, null, characterId, false, false, function (err) {
        // then relaunch to equip
        if (err) {
          return callback(err);
        }
        item.bucketName = item.bucketNameTarget;
        item.characterId = characterId;
        Destiny.moveItem(user, item, itemCanBeEquipped, characterId, false, equip, function (err) {
          return callback(err);
        });
      });
      // if the item must be equipped and is in the wrong character, move it to the vault
    } else if (equip && (item.characterId != characterId)) {
      Destiny.moveItem(user, item, null, item.characterId, true, false, function (err) {
        // then relaunch to equip
        if (err) {
          return callback(err);
        }
        item.bucketName = "General";
        item.characterId = null;
        Destiny.moveItem(user, item, itemCanBeEquipped, characterId, false, equip, function (err) {
          return callback(err);
        });
      });
      // If the item must be equipped, do it
    } else if (equip) {
      Destiny.equipItem(user, item, function (err) {
        return callback(err);
      });
      // if the item must be moved from another character move it to the vault first
    } else if (!moveToVault && (item.bucketName != "General")) {
      Destiny.moveItem(user, item, null, item.characterId, true, false, function (err) {
        // then relaunch to move
        if (err) {
          return callback(err);
        }
        item.bucketName = "General";
        item.characterId = null;
        Destiny.moveItem(user, item, itemCanBeEquipped, characterId, false, equip, function (err) {
          return callback(err);
        });
      });
      // Move it
    } else {
      Destiny._postFromBungie(Destiny._URL_MOVE_ITEM,
        {
          itemReferenceHash: item.itemHash,
          stackSize: 1,
          transferToVault: moveToVault,
          itemId: item.itemInstanceId,
          characterId: item.characterId || characterId,
          membershipType: user.destinyMemberships[0].membershipType
        }
        , function (err) {
          //debug(JSON.stringify(err, null, 2));
          //debug(JSON.stringify(data, null, 2));
          if (err) {
            return callback(err);
          }
          callback();

        }, user.auth.access_token);
    }

  };

  public static initManifestDb(callback, lang: string) {

    //debug("initManifestDb");

    if (Destiny.manifestDb[lang]) {
      return callback();
    }

    Destiny.refreshManifestDb((err) => {

      if (err) {
        return callback(err);
      }

      Destiny.queryManifestTables(function (err) {
        if (err) {
          return callback(err);
        }
        return callback();
      }, lang);

    }, lang)

  };

  public static refreshManifestDb(callback, lang: string) {

    lang = Config.getLang(lang);

    //debug("refreshManifestDb");

    Destiny._getFromBungie(Destiny._URL_GET_MANIFEST, function (err, data) {
      //debug(JSON.stringify(err, null, 2));
      //debug(JSON.stringify(data, null, 2));
      if (err) {
        return callback(err)
      }
      const contentPath = data.mobileWorldContentPaths[lang];

      let manifestPath = 'data/' + lang + '_' + path.basename(contentPath);

      if (fs.existsSync(manifestPath)) {
        Destiny.manifestDb[lang] = new sqlite.Database(manifestPath);
        return callback();
      }
      //debug(manifestPath);

      let manifestZipPath = manifestPath + '_' + Math.ceil(Math.random() * 100000000) + '.zip';
      let manifestNewPath = manifestPath + '_' + Math.ceil(Math.random() * 100000000) + '.content';

      // read the file
      const outStream = fs.createWriteStream(manifestZipPath);
      const options = {
        uri: 'https://www.bungie.net' + contentPath,
        port: 443,
        method: 'GET',
        encoding: null,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': Config.destinyAPIKey
        }
      };

      request(options)
        .on('response', function (res) {
          debug("refreshManifestDb status code : " + res.statusCode);
        }).pipe(outStream)
        .on('finish', function () {
          const zip = new streamZip({
            file: manifestZipPath,
            storeEntries: true
          });

          zip.on('ready', function () {
            zip.extract(path.basename(contentPath), manifestNewPath, function (err) {
              if (err) {
                console.log(err);
              } else {
                fs.rename(
                  manifestNewPath,
                  manifestPath,
                  (err) => {

                    if (err) {
                      error(err);
                      process.exit(-1);
                    }

                    // reset all the cache tables
                    Destiny.manifestDb = new sqlite.Database(manifestPath);
                    Destiny.bucketHashCache = {};
                    Destiny.bucketHashCacheByName = {};
                    Destiny.itemHashCacheById = {};
                    Destiny.itemHashCacheByName = {};
                    Destiny.checklistHashCacheById = {};
                    Destiny.milestoneHashCacheById = {};
                    Destiny.objectiveHashCacheById = {};
                    Destiny.vendorHashCacheById = {};
                    Destiny.classHashCacheById = {};
                    Destiny.raceHashCacheById = {};
                    Destiny.progressionHashCacheById = {};

                    async.eachSeries(
                      Config.languages,
                      (lang, callback) => {
                        async.waterfall([
                            function (callback) {
                              if (fs.existsSync(manifestZipPath)) {
                                fs.unlink(manifestZipPath, () => {
                                  callback();
                                })
                              }
                            },
                            function (callback) {
                              // suppress old files
                              fs.readdir('data', (err, files) => {
                                files.forEach(file => {
                                  if (file.match(/world_sql_content/)) {
                                    fs.stat('data/' + file, ((err, stats) => {
                                      if (err) {
                                        return error(err);
                                      } else {
                                        const age = (new Date().getTime()) - stats.atimeMs;

                                        if (age > 2 * 60 * 60 * 1000) {
                                          fs.unlink('data/' + file, () => {
                                          });
                                        }
                                      }
                                    }))
                                  }
                                });
                              });
                              callback();
                            },
                            function (callback) {
                              Destiny.queryBucketById("", callback, lang);
                            },
                            function (foo, callback) {
                              Destiny.queryItemById("", callback, lang);
                            },
                            //function (foo, callback) {
                            //  Destiny.queryItemById(2051771644, function (err, item) {
                            //    console.log(item);
                            //    callback(err, item);
                            //  }, lang);
                            //},
                            function (foo, callback) {
                              Destiny.queryItemByName("", callback, lang);
                            },
                            function (foo, callback) {
                              Destiny.queryBucketByName("Thorn", function (err, item) {
                                //console.log(item);
                                callback(err, item);
                              }, lang);
                            },
                            function (foo, callback) {
                              Destiny.queryBucketByName("Pursuits", function (err, bucket) {
                                //console.log(bucket);
                                Destiny.pursuitsBucket = bucket;
                                callback(err, bucket);
                              }, lang);
                            },
                            function (foo, callback) {
                              Destiny.queryChecklistById("", callback, lang);
                            },
                            function (foo, callback) {
                              Destiny.queryMilestoneById("", callback, lang);
                            },
                            function (foo, callback) {
                              Destiny.queryProgressionById("", callback, lang);
                            },
                            // function (foo, callback) {
                            //   Destiny.queryMilestoneById(Destiny.MILESTONE_GUARDIAN_OF_ALL, function (err, milestone) {
                            //     console.log(milestone);
                            //     callback(err, milestone);
                            //   }, lang);
                            // },
                            function (foo, callback) {
                              Destiny.queryVendorById("", callback, lang);
                            },
                            function (foo, callback) {
                              Destiny.queryClassById("", callback, lang);
                            },
                            function (foo, callback) {
                              Destiny.queryRaceById("", callback, lang);
                            },
                            function (foo, callback) {
                              Destiny.queryObjectiveById("", callback, lang);
                            },
                          ],

                          function (err) {
                            callback(err);

                          }
                        );
                      }, (err) => {
                        if (err) {
                          error(err);
                          process.exit(-1);
                        }
                        callback(err);

                      }
                    )

                  })
              }

            });
          });

        });
    }, null);

  };

// get tables names
  private static queryManifestTables(callback, lang: string) {

    Destiny.initManifestDb((err) => {
      if (err) {
        return callback(err);
      }

      const rows = [];
      try {
        Destiny.manifestDb[Config.getLang(lang)].serialize(function () {

          const query = 'SELECT name FROM sqlite_master WHERE type=\'table\'';
          Destiny.manifestDb[Config.getLang(lang)].each(query, function (err, row) {
            if (err) throw err;

            //console.log(row);
            rows.push(row);
          });
          callback(null, rows);
        });

      } catch (e) {
        callback(e);
      }

    }, Config.getLang(lang))

  };

// get bucket definition
  private static queryBucketById(buckedHash, callback, lang: string) {
    if (!Destiny.bucketHashCache[Config.getLang(lang)]) {
      Destiny.bucketHashCache[Config.getLang(lang)] = {};
      try {
        Destiny.initManifestDb((err) => {
          if (err) {
            return callback(err);
          }
          Destiny.manifestDb[Config.getLang(lang)].serialize(function () {
            const query = "SELECT * FROM DestinyInventoryBucketDefinition";
            Destiny.manifestDb[Config.getLang(lang)].each(query, function (err, row) {
              if (err) throw err;

              //debug(JSON.stringify(row, null, 2));
              const data = JSON.parse(row.json);
              //debug(JSON.stringify(data, null, 2));
              Destiny.bucketHashCache[Config.getLang(lang)][data.hash] = data;
            }, function (err, cpt) {
              debug(cpt + " bucket definitions read");
              //debug(JSON.stringify(bucketHashCache, null, 2));
              callback(null, Destiny.bucketHashCache[Config.getLang(lang)][buckedHash]);
            });
          });
        }, Config.getLang(lang));

      } catch (e) {
        callback(e);
      }

    } else {
      callback(null, Destiny.bucketHashCache[Config.getLang(lang)][buckedHash]);
    }

  };

  private static bucketHashCache: { [lang: string]: object } = {};

// get bucket definition
  private static queryBucketByName = function (bucketName, callback, lang: string) {
    if (!Destiny.bucketHashCacheByName[Config.getLang(lang)]) {
      const bucketHashCacheByNameTmp = {};
      try {
        Destiny.initManifestDb((err) => {
          if (err) {
            return callback(err);
          }
          Destiny.manifestDb[Config.getLang(lang)].serialize(function () {
            const query = "SELECT * FROM DestinyInventoryBucketDefinition";
            Destiny.manifestDb[Config.getLang(lang)].each(query, function (err, row) {
              if (err) throw err;

              //debug(JSON.stringify(row, null, 2));
              const data = JSON.parse(row.json);
              //debug(JSON.stringify(data.displayProperties.name, null, 2));
              bucketHashCacheByNameTmp[data.displayProperties.name] = data;
            }, function (err, cpt) {
              debug(cpt + " bucket definitions read");
              Destiny.bucketHashCacheByName[Config.getLang(lang)] = bucketHashCacheByNameTmp;
              //debug(JSON.stringify(bucketHashCache, null, 2));
              callback(null, Destiny.bucketHashCacheByName[Config.getLang(lang)][bucketName]);
            });
          });
        }, Config.getLang(lang));

      } catch (e) {
        callback(e);
      }

    } else {
      callback(null, Destiny.bucketHashCacheByName[Config.getLang(lang)][bucketName]);
    }

  };
  private static bucketHashCacheByName: { [lang: string]: object } = {};

// get item definition
  private static queryItemById(itemHash, callback, lang: string) {
    if (!Destiny.itemHashCacheById[Config.getLang(lang)]) {
      Destiny.itemHashCacheById[Config.getLang(lang)] = {};
      try {
        Destiny.initManifestDb((err) => {
          if (err) {
            return callback(err);
          }
          Destiny.manifestDb[Config.getLang(lang)].serialize(function () {
            const query = "SELECT * FROM DestinyInventoryItemDefinition";
            Destiny.manifestDb[Config.getLang(lang)].each(query, function (err, row) {
              if (err) throw err;

              //debug(JSON.stringify(row, null, 2));
              const data = JSON.parse(row.json);
              //debug(JSON.stringify(data, null, 2));
              //debug(data.hash+" "+data.displayProperties.name);
              Destiny.itemHashCacheById[Config.getLang(lang)][data.hash] = data;
            }, function (err, cpt) {
              debug(cpt + " item definitions read");
              //debug(JSON.stringify(itemHashCacheById, null, 2));
              callback(null, Destiny.itemHashCacheById[Config.getLang(lang)][itemHash]);
            });
          });
        }, Config.getLang(lang));

      } catch (e) {
        callback(e);
      }

    } else {
      //debug(JSON.stringify(itemHash, null, 2));
      //debug(JSON.stringify(itemHashCacheById[itemHash], null, 2));
      callback(null, Destiny.itemHashCacheById[Config.getLang(lang)][itemHash]);
    }

  };

  private static itemHashCacheById: { [lang: string]: object } = {};

  private static queryItemByName(itemName, callback, lang: string) {
    if (!Destiny.itemHashCacheByName[Config.getLang(lang)]) {
      const itemHashCacheByNameTmp = {};
      try {
        Destiny.initManifestDb((err) => {
          if (err) {
            return callback(err);
          }
          Destiny.manifestDb[Config.getLang(lang)].serialize(function () {
            const query = "SELECT * FROM DestinyInventoryItemDefinition";
            Destiny.manifestDb[Config.getLang(lang)].each(query, function (err, row) {
              if (err) throw err;

              //debug(JSON.stringify(row, null, 2));
              const data = JSON.parse(row.json);
              //debug(JSON.stringify(data.displayProperties.name, null, 2));
              itemHashCacheByNameTmp[data.displayProperties.name] = data;
            }, function (err, cpt) {
              debug(cpt + " item definitions read");
              Destiny.itemHashCacheByName[Config.getLang(lang)] = itemHashCacheByNameTmp;
              //debug(JSON.stringify(itemHashCache, null, 2));
              callback(null, Destiny.itemHashCacheByName[Config.getLang(lang)][itemName]);
            });
          });
        }, Config.getLang(lang));

      } catch (e) {
        callback(e);
      }

    } else {
      callback(null, Destiny.itemHashCacheByName[Config.getLang(lang)][itemName]);
    }

  };

  private static itemHashCacheByName: { [lang: string]: object } = {};

// get checklist definition
  private static queryChecklistById(checklistHash, callback, lang: string) {
    if (!Destiny.checklistHashCacheById[Config.getLang(lang)]) {
      Destiny.checklistHashCacheById[Config.getLang(lang)] = {};
      try {
        Destiny.initManifestDb((err) => {
          if (err) {
            return callback(err);
          }
          Destiny.manifestDb[Config.getLang(lang)].serialize(function () {
            const query = "SELECT * FROM DestinyChecklistDefinition";
            Destiny.manifestDb[Config.getLang(lang)].each(query, function (err, row) {
              if (err) throw err;

              //debug(JSON.stringify(row, null, 2));
              const data = JSON.parse(row.json);
              //debug(JSON.stringify(data, null, 2));
              Destiny.checklistHashCacheById[Config.getLang(lang)][data.hash] = data;
            }, function (err, cpt) {
              debug(cpt + " checklist definitions read");
              //debug(JSON.stringify(checklistHash, null, 2));
              callback(null, Destiny.checklistHashCacheById[Config.getLang(lang)][checklistHash]);
            });
          });
        }, Config.getLang(lang));

      } catch (e) {
        callback(e);
      }

    } else {
      callback(null, Destiny.checklistHashCacheById[Config.getLang(lang)][checklistHash]);
    }

  };

  private static checklistHashCacheById: { [lang: string]: object } = {};

// get milestone definition
  private static queryMilestoneById(milestoneHash, callback, lang: string) {
    if (!Destiny.milestoneHashCacheById[Config.getLang(lang)]) {
      Destiny.milestoneHashCacheById[Config.getLang(lang)] = {};
      try {
        Destiny.initManifestDb((err) => {
          if (err) {
            return callback(err);
          }
          Destiny.manifestDb[Config.getLang(lang)].serialize(function () {
            const query = "SELECT * FROM DestinyMilestoneDefinition";
            Destiny.manifestDb[Config.getLang(lang)].each(query, function (err, row) {
              if (err) throw err;

              //debug(JSON.stringify(row, null, 2));
              const data = JSON.parse(row.json);
              //debug(JSON.stringify(data, null, 2));
              Destiny.milestoneHashCacheById[Config.getLang(lang)][data.hash] = data;
            }, function (err, cpt) {
              debug(cpt + " milestone definitions read");
              //debug(JSON.stringify(milestoneHash, null, 2));
              callback(null, Destiny.milestoneHashCacheById[Config.getLang(lang)][milestoneHash]);
            });
          });
        }, Config.getLang(lang));

      } catch (e) {
        callback(e);
      }

    } else {
      callback(null, Destiny.milestoneHashCacheById[Config.getLang(lang)][milestoneHash]);
    }

  };

  private static milestoneHashCacheById: { [lang: string]: object } = {};

// get objective definition
//noinspection JSUnusedLocalSymbols
  static queryObjectiveById(objectiveHash, callback, lang: string) {
    if (!Destiny.objectiveHashCacheById[Config.getLang(lang)]) {
      Destiny.objectiveHashCacheById[Config.getLang(lang)] = {};
      try {
        Destiny.initManifestDb((err) => {
          if (err) {
            return callback(err);
          }
          Destiny.manifestDb[Config.getLang(lang)].serialize(function () {
            const query = "SELECT * FROM DestinyObjectiveDefinition";
            Destiny.manifestDb[Config.getLang(lang)].each(query, function (err, row) {
              if (err) throw err;

              //debug(JSON.stringify(row, null, 2));
              const data = JSON.parse(row.json);
              //debug(data.hash+' '+data.displayProperties.description);
              Destiny.objectiveHashCacheById[Config.getLang(lang)][data.hash] = data;
            }, function (err, cpt) {
              debug(cpt + " objective definitions read");
              callback(null, Destiny.objectiveHashCacheById[Config.getLang(lang)][objectiveHash]);
            });
          });
        }, Config.getLang(lang));

      } catch (e) {
        callback(e);
      }

    } else {
      callback(null, Destiny.objectiveHashCacheById[Config.getLang(lang)][objectiveHash]);
    }

  };

  private static objectiveHashCacheById: { [lang: string]: object } = {};

// get vendor definition
  private static queryVendorById(vendorHash, callback, lang: string) {
    if (!Destiny.vendorHashCacheById[Config.getLang(lang)]) {
      Destiny.vendorHashCacheById[Config.getLang(lang)] = {};
      try {
        Destiny.initManifestDb((err) => {
          if (err) {
            return callback(err);
          }
          Destiny.manifestDb[Config.getLang(lang)].serialize(function () {
            const query = "SELECT * FROM DestinyVendorDefinition";
            Destiny.manifestDb[Config.getLang(lang)].each(query, function (err, row) {
              if (err) throw err;

              //debug(JSON.stringify(row, null, 2));
              const data = JSON.parse(row.json);
              //debug(JSON.stringify(data, null, 2));
              Destiny.vendorHashCacheById[Config.getLang(lang)][data.hash] = data;
            }, function (err, cpt) {
              debug(cpt + " vendor definitions read");
              //debug(JSON.stringify(vendorHash, null, 2));
              callback(null, Destiny.vendorHashCacheById[Config.getLang(lang)][vendorHash]);
            });
          });
        }, Config.getLang(lang));

      } catch (e) {
        callback(e);
      }

    } else {
      callback(null, Destiny.vendorHashCacheById[Config.getLang(lang)][vendorHash]);
    }

  };

  private static vendorHashCacheById: { [lang: string]: object } = {};

// get class definition
  private static queryClassById(classHash, callback, lang: string) {
    if (!Destiny.classHashCacheById[Config.getLang(lang)]) {
      Destiny.classHashCacheById[Config.getLang(lang)] = {};
      try {
        Destiny.initManifestDb((err) => {
          if (err) {
            return callback(err);
          }
          Destiny.manifestDb[Config.getLang(lang)].serialize(function () {
            const query = "SELECT * FROM DestinyClassDefinition";
            Destiny.manifestDb[Config.getLang(lang)].each(query, function (err, row) {
              if (err) throw err;

              //debug(JSON.stringify(row, null, 2));
              const data = JSON.parse(row.json);
              //debug(JSON.stringify(data, null, 2));
              Destiny.classHashCacheById[Config.getLang(lang)][data.hash] = data;
            }, function (err, cpt) {
              debug(cpt + " class definitions read");
              //debug(JSON.stringify(classHash, null, 2));
              callback(null, Destiny.classHashCacheById[Config.getLang(lang)][classHash]);
            });
          });
        }, Config.getLang(lang));

      } catch (e) {
        callback(e);
      }

    } else {
      callback(null, Destiny.classHashCacheById[Config.getLang(lang)][classHash]);
    }

  };

  private static classHashCacheById: { [lang: string]: object } = {};

// get race definition
  private static queryRaceById(raceHash, callback, lang: string) {
    if (!Destiny.raceHashCacheById[Config.getLang(lang)]) {
      Destiny.raceHashCacheById[Config.getLang(lang)] = {};
      try {
        Destiny.initManifestDb((err) => {
          if (err) {
            return callback(err);
          }
          Destiny.manifestDb[Config.getLang(lang)].serialize(function () {
            const query = "SELECT * FROM DestinyRaceDefinition";
            Destiny.manifestDb[Config.getLang(lang)].each(query, function (err, row) {
              if (err) throw err;

              //debug(JSON.stringify(row, null, 2));
              const data = JSON.parse(row.json);
              //debug(JSON.stringify(data, null, 2));
              Destiny.raceHashCacheById[Config.getLang(lang)][data.hash] = data;
            }, function (err, cpt) {
              debug(cpt + " race definitions read");
              //debug(JSON.stringify(raceHash, null, 2));
              callback(null, Destiny.raceHashCacheById[Config.getLang(lang)][raceHash]);
            });
          });
        }, Config.getLang(lang));

      } catch (e) {
        callback(e);
      }

    } else {
      callback(null, Destiny.raceHashCacheById[Config.getLang(lang)][raceHash]);
    }

  };

  private static raceHashCacheById: { [lang: string]: object } = {};

// get plugSet definition
  //noinspection JSUnusedLocalSymbols
  private static queryPlugSetById(plugSetHash, callback, lang: string) {
    if (!Destiny.plugSetHashCacheById[Config.getLang(lang)]) {
      Destiny.plugSetHashCacheById[Config.getLang(lang)] = {};
      try {
        Destiny.initManifestDb((err) => {
          if (err) {
            return callback(err);
          }
          Destiny.manifestDb[Config.getLang(lang)].serialize(function () {
            const query = "SELECT * FROM DestinyPlugSetDefinition";
            Destiny.manifestDb[Config.getLang(lang)].each(query, function (err, row) {
              if (err) throw err;

              //debug(JSON.stringify(row, null, 2));
              const data = JSON.parse(row.json);
              //debug(JSON.stringify(data, null, 2));
              Destiny.plugSetHashCacheById[Config.getLang(lang)][data.hash] = data;
            }, function (err, cpt) {
              debug(cpt + " PlugSet definitions read");
              //debug(JSON.stringify(PlugSetHash, null, 2));
              callback(null, Destiny.plugSetHashCacheById[Config.getLang(lang)][plugSetHash]);
            });
          });
        }, Config.getLang(lang));

      } catch (e) {
        callback(e);
      }

    } else {
      callback(null, Destiny.plugSetHashCacheById[Config.getLang(lang)][plugSetHash]);
    }

  };

  private static plugSetHashCacheById: { [lang: string]: object } = {};

// get presentationNode definition
  private static queryPresentationNodeById(presentationNodeHash, callback, lang: string) {
    if (!Destiny.presentationNodeHashCacheById[Config.getLang(lang)]) {
      Destiny.presentationNodeHashCacheById[Config.getLang(lang)] = {};
      try {
        Destiny.initManifestDb((err) => {
          if (err) {
            return callback(err);
          }
          Destiny.manifestDb[Config.getLang(lang)].serialize(function () {
            const query = "SELECT * FROM DestinyPresentationNodeDefinition";
            Destiny.manifestDb[Config.getLang(lang)].each(query, function (err, row) {
              if (err) throw err;

              //debug(JSON.stringify(row, null, 2));
              const data = JSON.parse(row.json);
              //debug(JSON.stringify(data, null, 2));
              Destiny.presentationNodeHashCacheById[Config.getLang(lang)][data.hash] = data;
            }, function (err, cpt) {
              debug(cpt + " PresentationNode definitions read");
              //debug(JSON.stringify(PresentationNodeHash, null, 2));
              callback(null, Destiny.presentationNodeHashCacheById[Config.getLang(lang)][presentationNodeHash]);
            });
          });
        }, Config.getLang(lang));

      } catch (e) {
        callback(e);
      }

    } else {
      callback(null, Destiny.presentationNodeHashCacheById[Config.getLang(lang)][presentationNodeHash]);
    }

  };

  private static presentationNodeHashCacheById: { [lang: string]: object } = {};

// get Record definition
  private static queryRecordById(recordHash, callback, lang: string) {
    if (!Destiny.recordHashCacheById[Config.getLang(lang)]) {
      Destiny.recordHashCacheById[Config.getLang(lang)] = {};
      try {
        Destiny.initManifestDb((err) => {
          if (err) {
            return callback(err);
          }
          Destiny.manifestDb[Config.getLang(lang)].serialize(function () {
            const query = "SELECT * FROM DestinyRecordDefinition";
            Destiny.manifestDb[Config.getLang(lang)].each(query, function (err, row) {
              if (err) throw err;

              //debug(JSON.stringify(row, null, 2));
              const data = JSON.parse(row.json);
              //debug(JSON.stringify(data, null, 2));
              Destiny.recordHashCacheById[Config.getLang(lang)][data.hash] = data;
            }, function (err, cpt) {
              debug(cpt + " Record definitions read");
              //debug(JSON.stringify(RecordHash, null, 2));
              callback(null, Destiny.recordHashCacheById[Config.getLang(lang)][recordHash]);
            });
          });
        }, Config.getLang(lang));

      } catch (e) {
        callback(e);
      }

    } else {
      callback(null, Destiny.recordHashCacheById[Config.getLang(lang)][recordHash]);
    }

  };

  private static recordHashCacheById: { [lang: string]: object } = {};

// get Progression definition
  private static queryProgressionById(progressionHash, callback, lang: string) {
    if (!Destiny.progressionHashCacheById[Config.getLang(lang)]) {
      Destiny.progressionHashCacheById[Config.getLang(lang)] = {};
      try {
        Destiny.initManifestDb((err) => {
          if (err) {
            return callback(err);
          }
          Destiny.manifestDb[Config.getLang(lang)].serialize(function () {
            const query = "SELECT * FROM DestinyProgressionDefinition";
            Destiny.manifestDb[Config.getLang(lang)].each(query, function (err, row) {
              if (err) throw err;

              //debug(JSON.stringify(row, null, 2));
              const data = JSON.parse(row.json);
              //debug(JSON.stringify(data, null, 2));
              Destiny.progressionHashCacheById[Config.getLang(lang)][data.hash] = data;
            }, function (err, cpt) {
              debug(cpt + " Progression definitions read");
              //debug(JSON.stringify(ProgressionHash, null, 2));
              callback(null, Destiny.progressionHashCacheById[Config.getLang(lang)][progressionHash]);
            });
          });
        }, Config.getLang(lang));

      } catch (e) {
        callback(e);
      }

    } else {
      callback(null, Destiny.progressionHashCacheById[Config.getLang(lang)][progressionHash]);
    }

  };

  private static progressionHashCacheById: { [lang: string]: object } = {};

//noinspection JSUnusedLocalSymbols
  public static checkConf(conf, callback, lang: string) {
    const messages = [];

    //debug(JSON.stringify(conf, null, 2));

    async.eachSeries(
      conf.listStats,
      function (name, callback) {
        Destiny.queryItemByName(name, function (err, item) {
          if (!item) {
            messages.push("item '" + name + "' not found.");
          }

          callback(err);
        }, lang);
      },
      function (err) {
        callback(err, messages);
      }
    );

  };

  /**
   * Get data from bungie
   * @param path
   * @param callback
   * @param accessToken
   * @private
   */
  static _getFromBungie(path: string, callback: Function, accessToken?: string): void {
    //debug("_getFromBungie(" + path + ")");
    const options = {
      hostname: 'www.bungie.net',
      port: 443,
      path: path,
      headers: {'X-API-Key': Config.destinyAPIKey},
      method: 'GET',
      agent: undefined
    };
    if (accessToken) {
      options.headers['Authorization'] = "Bearer " + accessToken
    }

    if (Config.proxy) {
      let proxy = Config.proxy;
      options.agent = new HttpsProxyAgent(proxy);
      debug(`Using proxy ${Config.proxy}`);
    }

//debug(JSON.stringify(options, null, 2));

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

        let val;

        try {
          //debug('end : '+content);
          val = JSON.parse(content);
        } catch (e) {
          if (res.statusCode == 401) {
            return callback({error: "NotLogged"}, null);
          } else {
            error("statusCode: ", res.statusCode, " : ", res.statusMessage);
            //debug(content);
            //debug.error("Error in getting Bungie data : " + e + ' from ' + path);
            return callback("Error in getting Bungie data : " + e + ' from ' + path, null);
          }
        }

        if ((val.ErrorStatus == "DestinyAccountNotFound") || (val.ErrorStatus == "DestinyLegacyPlatformInaccessible")) {
          return callback(null, null);
        }

        if ((val.ErrorStatus == "DestinyUnexpectedError")) {
          error("Destiny unexpected error (" + path + ")");
          error(val);
          return callback(null, null);
        }

        if (val.ErrorCode !== 1) {
          error(JSON.stringify(val, null, 2));
          error("Error in reading Bungie data : " + val.Message);
          return callback("Error in reading Bungie data : " + val.Message + " (" + path + ")", null);
        }

        //debug(JSON.stringify(val.Response, null, 2));
        return callback(null, val.Response);
      });
    });
    req.end();

    req.on('error', function (e) {
      error("Error in connecting Bungie : "+path);
      //debug(JSON.stringify(e, null, 2));

      return callback(e);
    });
  }

  /**
   * Post action to bungie
   * @param path
   * @param postData
   * @param callback
   * @param accessToken
   * @private
   */
  private static _postFromBungie(path, postData, callback, accessToken) {
    //debug("_postFromBungie(" + path + ")");
    //debug(JSON.stringify(postData, null, 2));

    postData = JSON.stringify(postData);
    const options = {
      hostname: 'www.bungie.net',
      port: 443,
      path: path,
      headers: {
        'X-API-Key': Config.destinyAPIKey,
        'Content-Type': 'application/x-www.ts-form-urlencoded',
        'Content-Length': postData.length
      },
      method: 'POST'
    };
    if (accessToken) {
      options.headers['Authorization'] = "Bearer " + accessToken
    }

    //debug(JSON.stringify(options, null, 2));

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

        let val;

        try {
          //debug('end : '+content);
          val = JSON.parse(content);
        } catch (e) {
          //error("statusCode: ", res.statusCode, " : ", res.statusMessage);
          debug(content);
          error("Error in getting Bungie data : " + e + ' from ' + path);
          return callback("Error in getting Bungie data : " + e + ' from ' + path, null);
        }

        if ((val.ErrorStatus == "DestinyAccountNotFound") || (val.ErrorStatus == "DestinyLegacyPlatformInaccessible")) {
          return callback(null, null);
        }

        if (val.ErrorCode !== 1) {
          if (val.ErrorCode == 1642) {
            return callback("ErrorDestinyNoRoomInDestination");
          } else {
            error(JSON.stringify(val, null, 2));
            error("Error in reading Bungie data : " + val.Message);
            return callback("Error in reading Bungie data : " + val.Message, null);
          }
        }

        //debug(JSON.stringify(val.Response, null, 2));
        return callback(null, val.Response);
      });
    });
    req.write(postData);
    req.end();

    req.on('error', function (e) {
      //error("error");

      return callback("Error in connecting Bungie : " + e);
    });
  }


  /**
   * Manage the off line evaluation of objective running
   *
   */
  static _calculateObjectiveRunning(callback) {
    //debug('_calculateObjectiveRunning');

    DestinyDb.listTimes((err, times: ObjectiveTime[]) => {
      if (err) {
        return callback(err);
      }

      async.eachSeries(
        times,
        (time, callback) => {

          time = Destiny._validateObjectiveRunning(time);
          if (time.finished) {
            return callback(null);
          }
          if (!Destiny.objectiveRunningList[time.bungieNetUser]) {
            //debug('not Found ' + time.bungieNetUser);
            return callback(null);
          }
          const user = Destiny.objectiveRunningList[time.bungieNetUser];
          debug('Watching ' + user.bungieNetUser.displayName);

          //debug(user);
          async.waterfall([
              (callback) => {
                Destiny.getUserStuff(user, callback, Config.defaultLanguage);
              },
              (data, callback) => {
                Destiny.addObjectivesTime(user, data, callback);
              },
              // If no times for the user, remove it
              function (data, times, callback) {
                data.currentTimes = [];
                times.forEach((objectiveTime: ObjectiveTime) => {
                  //debug(objectiveTime);
                  if (!objectiveTime.finished && (objectiveTime.bungieNetUser === user.bungieNetUser.membershipId)) {
                    data.currentTimes.push(objectiveTime);
                  }
                });
                callback(null, data);
              }
            ],
            (err) => {
              callback(err);
            })
        }
        ,
        (err) => {
          callback(err);
        }
      )

    });


  }

  static _userNamesTable: { [id: string]: string; } = {
    'HardCoded': 'HardCoded'
  };
  static _characterNamesTable: { [id: string]: string; } = {
    'HardCoded': 'HardCoded'
  };

  /**
   * Validate the time
   *     to fill legacy times ;-)
   * @param time
   * @private
   */
  static _validateObjectiveRunning(time: ObjectiveTime) {

    // remove the hardcoded ones
    if (time.bungieNetUser === 'HardCoded') {
      debug('Objective time : Found hardcoded');
      DestinyDb.deleteTime(time._id, (err) => {
        if (err) {
          error(err);
        } else {
          debug('Corrected');
          //debug(t);
        }
      });
    }


    if (!time.bungieUserName || (time.bungieUserName === 'HardCoded')) {
      debug('Objective time : No user name (' + time.bungieNetUser + ')');
      if (Destiny._userNamesTable[time.bungieNetUser]) {
        time.bungieUserName = Destiny._userNamesTable[time.bungieNetUser];
        DestinyDb.insertTime(time.bungieNetUser, time, (err) => {
          if (err) {
            error(err);
          } else {
            debug('Corrected');
            //debug(t);
          }
        });
      } else {
        Destiny.getUserById(time.bungieNetUser, (err, data) => {
          if (err) {
            error(err);
          } else {
            if (data.displayName) {
              Destiny._userNamesTable[time.bungieNetUser] = data.displayName;
            }
          }
        });
      }
    } else {
      Destiny._userNamesTable[time.bungieNetUser] = time.bungieUserName;
    }

    if (!time.characterName) {
      debug('Objective time : No character name (' + time.characterId + ')');
      if (Destiny._characterNamesTable[time.characterId]) {
        time.characterName = Destiny._characterNamesTable[time.characterId];
        DestinyDb.insertTime(time.bungieNetUser, time, (err) => {
          if (err) {
            error(err);
          } else {
            debug('Corrected');
            //debug(t);
          }
        });
      } else if (time.bungieUserName === 'HardCoded') {
        Destiny._characterNamesTable[time.characterId] = 'HardCoded';
      } else if (time.bungieUserName) {
        Destiny.getLight(time.bungieUserName, false, (err, data) => {
          if (err) {
            error(err);
          } else {
            //debug(data);
            data.forEach(c => {
              switch (c.class) {
                case 'W':
                  Destiny._characterNamesTable[c.id] = "Warlock";
                  break;
                case 'H':
                  Destiny._characterNamesTable[c.id] = "Hunter";
                  break;
                case 'T':
                  Destiny._characterNamesTable[c.id] = "Titan";
                  break;
              }
            });
          }
        })
      }
    } else {
      Destiny._characterNamesTable[time.characterId] = time.characterName;
    }

    if (!time.objectiveProgressDescription || (time.objectiveProgressDescription === 'Unknown')) {
      debug('Objective time : No objective description (' + time.objectiveId + ')');
      Destiny.queryObjectiveById(time.objectiveId, (err, item) => {
        if (err) {
          error(err);
        }
        if (item && item.progressDescription) {
          //debug(item);
          time.objectiveProgressDescription = item.progressDescription;
        } else if (item && item.displayProperties && item.displayProperties.description) {
          //debug(item);
          time.objectiveProgressDescription = item.displayProperties.description;
        } else {
          time.objectiveProgressDescription = "not found";
        }
        DestinyDb.insertTime(time.bungieNetUser, time, (err) => {
          if (err) {
            error(err);
          } else {
            debug('Corrected');
            //debug(t);
          }
        });
      }, 'en');
    }

    return time;
  }

  public static addUserToObjectiveRunningList(user) {
    Destiny.objectiveRunningList[user.bungieNetUser.membershipId] = user;
  }

  private static objectiveRunningList: { [userId: string]: User } = {};

}


function refreshManifest() {
  async.eachSeries(
    Config.languages,
    (lang, callback) => {
      Destiny.refreshManifestDb(callback, lang);
    },
    (err) => {
      if (err) {
        error(err);
      }
      setTimeout(refreshManifest,
        (60 + Math.random() * 60) * 1000);

    }
  )

}

function refreshObjectiveTime() {
  //debug('refreshObjectiveTime');
  // before whatever, load the objectives
  Destiny.queryObjectiveById('1346084039', (err, item) => {
    if (err) {
      error(err);
      setTimeout(refreshObjectiveTime,
        (20 + Math.random() * 10) * 1000);
    }
    if (item) {
      //debug(item);
      Destiny._calculateObjectiveRunning(
        (err) => {
          if (err) {
            error(err);
          }
          setTimeout(refreshObjectiveTime,
            (20 + Math.random() * 10) * 1000);

        }
      )
    } else {
      error('objective not found');
      setTimeout(refreshObjectiveTime,
        (20 + Math.random() * 10) * 1000);
    }
  }, 'en');


}

setTimeout(refreshManifest,
  Math.random() * 60 * 1000);
setTimeout(refreshObjectiveTime,
  Math.random() * 30 * 1000);

