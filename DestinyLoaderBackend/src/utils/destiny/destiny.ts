import { Config } from "../config/config";

const debug = require('debug')('server:debug:Destiny');
const error = require('debug')('server:error:Destiny');
const https = require('https');
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
//private static _URL_GET_LEADERBOARD = '/Platform/Destiny2/Stats/Leaderboards/Clans/{groupId}/?maxtop=200&modes=3,4,16,17';
//private static _URL_GET_AGGREGATE_CLAN_BOARD = '/Platform/Destiny2/Stats/AggregateClanStats/{groupId}/?maxtop=200&modes=3,4,16,17';
//private static _URL_GET_ACCOUNT_STAT = '/Platform/Destiny2/{membershipType}/Account/{destinyMembershipId}/Stats/?groups=102';
//private static _URL_GET_ACCOUNT_STAT = '/Platform/Destiny2/{membershipType}/Account/{destinyMembershipId}/Character/{characterId}/Stats/AggregateActivityStats/';
  private static _URL_GET_ACCOUNT_STAT = '/Platform/Destiny2/{membershipType}/Account/{destinyMembershipId}/Character/{characterId}/Stats/?modes=16,17,4,3,5,39&groups=0';
  private static _URL_GET_USER_STUFF = '/Platform/Destiny2/{membershipType}/Profile/{destinyMembershipId}/?components=100,102,104,200,201,202,204,205,300,301,302,304,305,306,307,308,900';
  private static _URL_GET_VENDORS = '/Platform/Destiny2/{membershipType}/Profile/{destinyMembershipId}/Character/{characterId}/Vendors/?components=400,401,402';

  private static _URL_GET_MANIFEST = '/Platform//Destiny2/Manifest/';

  private static _URL_LOCK_ITEM = "/Platform/Destiny2/Actions/Items/SetLockState/";
  private static _URL_MOVE_ITEM = "/Platform/Destiny2/Actions/Items/TransferItem/";
  private static _URL_EQUIP_ITEM = "/Platform/Destiny2/Actions/Items/EquipItem/";

  private static MANIFEST_ZIP_FILE = 'data/manifest.zip';
  private static MANIFEST_CONTENT = 'data/manifest.content';


  private static pursuitsBucket;


  public static initialize () {

    //// init
    async.waterfall([
        function (callback) {
          Destiny.getManifest(callback);
        },
        function (callback) {
          Destiny.queryBucketById("", callback);
        },
        function (foo, callback) {
          Destiny.queryItemById("", callback);
        },
//    function (foo, callback) {
//      Destiny.queryItemById("802464007", function(err, item) {
//        console.log(item);
//        callback(err, item);
//      });
//    },
//    function (foo, callback) {
//      Destiny.queryBucket("2401704334", function(err, item) {
//        console.log(item);
//        callback(err, item);
//      });
//    },
        function (foo, callback) {
          Destiny.queryItemByName("", callback);
        },
        function (foo, callback) {
          Destiny.queryBucketByName("Pursuits", function (err, bucket) {
            //console.log(bucket);
            Destiny.pursuitsBucket = bucket;
            callback(err, bucket);
          });
        },
        function (foo, callback) {
          Destiny.queryChecklistById("", callback);
        },
        function (foo, callback) {
          Destiny.queryMilestoneById("", callback);
        },
        function (foo, callback) {
          Destiny.queryVendorById("", callback);
        },
      ],

      function (err) {
        if (err) {
          error(err);
          process.exit(-1);
        }
      }
    );

  }

  //noinspection JSUnusedGlobalSymbols
  public static getAuthenticationCodeUrl (callback) {
    let url = Destiny._URL_AUTH_GET_CODE;
    url = url.replace(/[{]client-id(})/, Config.oAuthClientId);

    //debug(JSON.stringify(url, null, 2));
    return callback(null, url);

  };

  public static getTokenUrl (callback) {
    return callback(null, Destiny._URL_GET_TOKEN_FROM_CODE);
  };

  public static getCurrentUser (user, callback) {
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

  public static getGrimoire (user, callback) {
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

  public static getLight (userId, isOnLine, callback) {
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
      //debug(JSON.stringify(membershipId, null, 2));

      // Get characters
      let url = Destiny._URL_ACCOUNT_SUMMARY;
      url = url.replace(/[{]membershipType(})/, membershipType);
      url = url.replace(/[{]destinyMembershipId(})/, membershipId);
      //debug(JSON.stringify(url, null, 2));

      Destiny._getFromBungie(url, function (err, data) {
        //debug(JSON.stringify(err, null, 2));
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
              heroicNightfallEntered: 0,
              heroicNightfallCleared: 0,
              raidEntered: 0,
              raidCleared: 0,
              strikeEntered: 0,
              strikeCleared: 0,
              allPvPEntered: 0,
              allPvPWon: 0,
              trialsofthenineEntered: 0,
              trialsofthenineWon: 0,
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
              resultChar.trialsofthenineEntered = 0;
              try {
                resultChar.trialsofthenineEntered = data.trialsofthenine.allTime.activitiesEntered.basic.value;
              } catch (e) {
              }
              resultChar.trialsofthenineWon = 0;
              try {
                resultChar.trialsofthenineWon = data.trialsofthenine.allTime.activitiesWon.basic.value;
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

  public static getClan (groupId, callback) {
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
          //     debug(JSON.stringify(url, null, 2));
          //
          //     _getFromBungie(url, function (err, data) {
          //         debug(JSON.stringify(err, null, 2));
          //         debug(JSON.stringify(data, null, 2));
          //         if (err) {
          //             return callback(err);
          //         }
          callback(err, members);
          // })
        }
      );

    });
  };

  public static getGroup (userNameList, callback) {
    //debug("getGroup '" + userNameList + "'");

    // Get the Destiny players
    // We got results
    const members = [];

    async.eachSeries(
      userNameList,
      function (userName, callback) {

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
        //     debug(JSON.stringify(url, null, 2));
        //
        //     _getFromBungie(url, function (err, data) {
        //         debug(JSON.stringify(err, null, 2));
        //         debug(JSON.stringify(data, null, 2));
        //         if (err) {
        //             return callback(err);
        //         }
        callback(err, members);
        // })
      }
    );

  };

  public static getUserStuff (user, callback) {
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

      //console.log(data);
      //debug(JSON.stringify(data, null, 2));
      //console.log(data.characterInventories.data["2305843009262856644"]);
      //console.log(data.characterProgressions.data["2305843009262856644"].items);
      //console.log(data.itemComponents.instances.data);
      //debug(JSON.stringify(data.profileProgression, null, 2));
      //debug(JSON.stringify(data.characterProgressions.checklists, null, 2));

      const result = {
        items: {},
        characters: [],
        checklists: [],
        vendors: {}
      };
      let itemsToLoad;
      const itemInstancesTable = {};
      const itemObjectivesTable = {};
      const itemSocketsTable = {};

      const checklistToLoad = [];
      const milestoneToLoad = [];


      async.series([
          // Add characters
          function (callback) {
            async.eachSeries(
              Object.keys(data.characters.data),
              function (characterId, callback) {
                result.characters.push(data.characters.data[characterId]);
                // add vendors to character
                Destiny.getVendors(user, characterId, function (err, data) {
                  if (data) {
                    result.vendors[characterId] = data;
                  }
                  callback(err);
                })
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

          // read the item instance
          function (callback) {
            async.eachSeries(
              Object.keys(data.itemComponents.instances.data),
              function (instanceId, callback) {
//              if (instanceId == "6917529083233657152") {
//                debug(JSON.stringify(data.itemComponents.instances.data[instanceId], null, 2));
//              }
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
//              if (instanceId == "6917529083233657152") {
//                debug(JSON.stringify(data.itemComponents.objectives.data[instanceId], null, 2));
//              }
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
                                  milestone.rewards.push(reward);
                                  //debug.warn(JSON.stringify(reward, null, 2));
                                  callback();
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
                        //if (milestoneId === '157823523') {
                        //  debug(milestone);
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
                  })
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
                                    });
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
                                Destiny.queryObjectiveById(objective.objectiveHash, function (err, definition) {
                                  if (err) return callback(err);
                                  objective.definition = definition;
                                  objective.itemName = definition.progressDescription;
                                  objective.icon = definition.displayProperties.icon;
                                  if (!objective.itemName) {
                                    objective.itemName = "Unknown name";
                                  }
                                  callback(null);
                                });
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
                        //if (milestone.instanceId === '157823523') {
                        //debug(milestone);
                        //}

                        callback(err);
                      });
                  })
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
                          item.item = definition;
                          item.itemName = definition.displayProperties.name;
                          if (!item.itemName) {
                            //debug.error("Empty definition name");
                            //debug.warn(JSON.stringify(definition, null, 2));
                            item.itemName = "Unknown name";
                          }
                          callback(null, item);
                        })
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

                                });
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
                        })
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
                        })
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
                            })
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
                      //debug(JSON.stringify(item, null, 2));
                      if (item.objective && item.objective.objectives) {
                        async.eachSeries(
                          item.objective.objectives,
                          function (objective, callback) {
                            Destiny.queryObjectiveById(objective.objectiveHash, function (err, itemValue) {
                              objective.item = itemValue;
                              callback();
                            })
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
                          'objectives': []
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
                      if (!result.items[item.bucketNameTarget]) {
                        result.items[item.bucketNameTarget] = {};
                      }
                      if (!result.items[item.bucketNameTarget][item.itemTypeDisplayName]) {
                        result.items[item.bucketNameTarget][item.itemTypeDisplayName] = [];
                      }
                      //debug(item.bucketName+" : "+item.bucketNameTarget+" : "+item.name+" - "+item.itemTypeDisplayName);
                      result.items[item.bucketNameTarget][item.itemTypeDisplayName].push(item);
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
          }
        ],
        function (err) {
          callback(err, result)
        });


    }, user.auth.access_token);

  };

  public static getVendors (user, characterId, callback) {
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
      //debug(JSON.stringify(data, null, 2));

      async.eachSeries(
        Object.keys(data.sales.data),
        function (vendorId, callback) {

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
                Destiny.queryVendorById(data.vendors.data[vendorId].vendorHash, function (err, vendorItem) {

                  vendor.name = vendorItem.displayProperties.name;
                  vendor.enabled = vendorItem.enabled;
                  vendor.visible = vendorItem.visible;
                  vendor.index = vendorItem.index;

                  //debug(JSON.stringify(vendor, null, 2));
                  callback();
                })
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
                      name: "",
                      itemTypeDisplayName: "",
                      displaySource: ""
                    };
                    vendor.sales.push(sale);

                    sale.hash = saleItem.itemHash;
                    sale.index = saleItem.vendorItemIndex;
                    sale.quantity = saleItem.quantity;
                    sale.saleStatus = saleItem.saleStatus;

                    //if (sale.hash == '1781061075') {
                    //debug(JSON.stringify(saleItem, null, 2));
                    //}

                    Destiny.queryItemById(sale.hash, function (err, soldItem) {
                      //if (sale.hash == '1781061075') {
                      //debug(JSON.stringify(soldItem, null, 2));
                      //}

                      sale.name = soldItem.displayProperties.name;
                      sale.itemTypeDisplayName = soldItem.itemTypeDisplayName;
                      sale.displaySource = soldItem.displaySource;

                      if (soldItem.value && soldItem.value.itemValue) {
                        async.eachSeries(
                          soldItem.value.itemValue,
                          function (value, callback) {
                            if (value.itemHash != 0) {
                              const reward = {
                                hash: value.itemHash,
                                quantity: value.quantity,
                                name: "",
                                item: {}
                              };
                              sale.rewards.push(reward);
                              Destiny.queryItemById(value.itemHash, function (err, itemValue) {
                                reward.name = itemValue.displayProperties.name;
                                reward.item = itemValue;
                                callback();
                              })
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
                    });

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

  //noinspection JSUnusedGlobalSymbols
  public static lockItem (user, item, characterId, state, callback) {
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

  public static equipItem (user, item, callback) {
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
  public static moveItem (user, item, itemCanBeEquipped, characterId, moveToVault, equip, callback) {
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

  public static getManifest (callback) {
    debug("getManifest");

    Destiny._getFromBungie(Destiny._URL_GET_MANIFEST, function (err, data) {
      //debug(JSON.stringify(err, null, 2));
      //debug(JSON.stringify(data, null, 2));
      if (err) {
        return callback(err)
      }
      const contentPath = data.mobileWorldContentPaths.en;
      //console.log(contentPath);

      // read the file
      const outStream = fs.createWriteStream(Destiny.MANIFEST_ZIP_FILE);
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
          debug("getManifest status code : " + res.statusCode);
        }).pipe(outStream)
        .on('finish', function () {
          const zip = new streamZip({
            file: Destiny.MANIFEST_ZIP_FILE,
            storeEntries: true
          });

          zip.on('ready', function () {
            zip.extract(path.basename(contentPath), Destiny.MANIFEST_CONTENT, function (err) {
              if (err) console.log(err);

              Destiny.queryManifestTables(function (err) {
                if (err) {
                  return callback(err);
                }
                return callback();
                //queryItem("2465295065", function (err, data) {
                //debug(JSON.stringify(data, null, 2));
                //});
              });
            });
          });

        });
    }, null);

  };


// get tables names
  private static queryManifestTables (callback) {
    const db = new sqlite.Database(Destiny.MANIFEST_CONTENT);

    const rows = [];
    try {
      db.serialize(function () {

        const query = "SELECT name FROM sqlite_master WHERE type='table'";
        db.each(query, function (err, row) {
          if (err) throw err;

          //console.log(row);
          rows.push(row);
        });
        callback(null, rows);
      });

    } catch (e) {
      callback(e);
    }
  };

// get bucket definition
  private static queryBucketById (buckedHash, callback) {
    if (!Destiny.bucketHashCache) {
      Destiny.bucketHashCache = {};
      try {
        const db = new sqlite.Database(Destiny.MANIFEST_CONTENT);
        db.serialize(function () {
          const query = "SELECT * FROM DestinyInventoryBucketDefinition";
          db.each(query, function (err, row) {
            if (err) throw err;

            //debug(JSON.stringify(row, null, 2));
            const data = JSON.parse(row.json);
            //debug(JSON.stringify(data, null, 2));
            Destiny.bucketHashCache[data.hash] = data;
          }, function (err, cpt) {
            debug(cpt + " bucket definitions read");
            //debug(JSON.stringify(bucketHashCache, null, 2));
            callback(null, Destiny.bucketHashCache[buckedHash]);
          });
        });

      } catch (e) {
        callback(e);
      }

    } else {
      callback(null, Destiny.bucketHashCache[buckedHash]);
    }

  };

  private static bucketHashCache;
// get bucket definition
  private static queryBucketByName = function (bucketName, callback) {
    if (!Destiny.bucketHashCacheByName) {
      const bucketHashCacheByNameTmp = {};
      try {
        const db = new sqlite.Database(Destiny.MANIFEST_CONTENT);
        db.serialize(function () {
          const query = "SELECT * FROM DestinyInventoryBucketDefinition";
          db.each(query, function (err, row) {
            if (err) throw err;

            //debug(JSON.stringify(row, null, 2));
            const data = JSON.parse(row.json);
            //debug(JSON.stringify(data.displayProperties.name, null, 2));
            bucketHashCacheByNameTmp[data.displayProperties.name] = data;
          }, function (err, cpt) {
            debug(cpt + " bucket definitions read");
            Destiny.bucketHashCacheByName = bucketHashCacheByNameTmp;
            //debug(JSON.stringify(bucketHashCache, null, 2));
            callback(null, Destiny.bucketHashCacheByName[bucketName]);
          });
        });

      } catch (e) {
        callback(e);
      }

    } else {
      callback(null, Destiny.bucketHashCacheByName[bucketName]);
    }

  };
  private static bucketHashCacheByName;

// get item definition
  private static queryItemById (itemHash, callback) {
    if (!Destiny.itemHashCacheById) {
      Destiny.itemHashCacheById = {};
      try {
        const db = new sqlite.Database(Destiny.MANIFEST_CONTENT);
        db.serialize(function () {
          const query = "SELECT * FROM DestinyInventoryItemDefinition";
          db.each(query, function (err, row) {
            if (err) throw err;

            //debug(JSON.stringify(row, null, 2));
            const data = JSON.parse(row.json);
            //debug(JSON.stringify(data, null, 2));
            Destiny.itemHashCacheById[data.hash] = data;
          }, function (err, cpt) {
            debug(cpt + " item definitions read");
            //debug(JSON.stringify(itemHashCacheById, null, 2));
            callback(null, Destiny.itemHashCacheById[itemHash]);
          });
        });

      } catch (e) {
        callback(e);
      }

    } else {
      //debug(JSON.stringify(itemHash, null, 2));
      //debug(JSON.stringify(itemHashCacheById[itemHash], null, 2));
      callback(null, Destiny.itemHashCacheById[itemHash]);
    }

  };

  private static itemHashCacheById;

  private static queryItemByName (itemName, callback) {
    if (!Destiny.itemHashCacheByName) {
      const itemHashCacheByNameTmp = {};
      try {
        const db = new sqlite.Database(Destiny.MANIFEST_CONTENT);
        db.serialize(function () {
          const query = "SELECT * FROM DestinyInventoryItemDefinition";
          db.each(query, function (err, row) {
            if (err) throw err;

            //debug(JSON.stringify(row, null, 2));
            const data = JSON.parse(row.json);
            //debug(JSON.stringify(data.displayProperties.name, null, 2));
            itemHashCacheByNameTmp[data.displayProperties.name] = data;
          }, function (err, cpt) {
            debug(cpt + " item definitions read");
            Destiny.itemHashCacheByName = itemHashCacheByNameTmp;
            //debug(JSON.stringify(itemHashCache, null, 2));
            callback(null, Destiny.itemHashCacheByName[itemName]);
          });
        });

      } catch (e) {
        callback(e);
      }

    } else {
      callback(null, Destiny.itemHashCacheByName[itemName]);
    }

  };

  private static itemHashCacheByName;

// get checklist definition
  private static queryChecklistById (checklistHash, callback) {
    if (!Destiny.checklistHashCacheById) {
      Destiny.checklistHashCacheById = {};
      try {
        const db = new sqlite.Database(Destiny.MANIFEST_CONTENT);
        db.serialize(function () {
          const query = "SELECT * FROM DestinyChecklistDefinition";
          db.each(query, function (err, row) {
            if (err) throw err;

            //debug(JSON.stringify(row, null, 2));
            const data = JSON.parse(row.json);
            //debug(JSON.stringify(data, null, 2));
            Destiny.checklistHashCacheById[data.hash] = data;
          }, function (err, cpt) {
            debug(cpt + " checklist definitions read");
            //debug(JSON.stringify(checklistHash, null, 2));
            callback(null, Destiny.checklistHashCacheById[checklistHash]);
          });
        });

      } catch (e) {
        callback(e);
      }

    } else {
      callback(null, Destiny.checklistHashCacheById[checklistHash]);
    }

  };

  private static checklistHashCacheById;

// get milestone definition
  private static queryMilestoneById (milestoneHash, callback) {
    if (!Destiny.milestoneHashCacheById) {
      Destiny.milestoneHashCacheById = {};
      try {
        const db = new sqlite.Database(Destiny.MANIFEST_CONTENT);
        db.serialize(function () {
          const query = "SELECT * FROM DestinyMilestoneDefinition";
          db.each(query, function (err, row) {
            if (err) throw err;

            //debug(JSON.stringify(row, null, 2));
            const data = JSON.parse(row.json);
            //debug(JSON.stringify(data, null, 2));
            Destiny.milestoneHashCacheById[data.hash] = data;
          }, function (err, cpt) {
            debug(cpt + " milestone definitions read");
            //debug(JSON.stringify(milestoneHash, null, 2));
            callback(null, Destiny.milestoneHashCacheById[milestoneHash]);
          });
        });

      } catch (e) {
        callback(e);
      }

    } else {
      callback(null, Destiny.milestoneHashCacheById[milestoneHash]);
    }

  };

  private static milestoneHashCacheById;

// get objective definition
  //noinspection JSUnusedLocalSymbols
  private static queryObjectiveById (objectiveHash, callback) {
    if (!Destiny.objectiveHashCacheById) {
      Destiny.objectiveHashCacheById = {};
      try {
        const db = new sqlite.Database(Destiny.MANIFEST_CONTENT);
        db.serialize(function () {
          const query = "SELECT * FROM DestinyObjectiveDefinition";
          db.each(query, function (err, row) {
            if (err) throw err;

            //debug(JSON.stringify(row, null, 2));
            const data = JSON.parse(row.json);
            //debug(JSON.stringify(data, null, 2));
            Destiny.objectiveHashCacheById[data.hash] = data;
          }, function (err, cpt) {
            debug(cpt + " objective definitions read");
            //debug(JSON.stringify(objectiveHash, null, 2));
            callback(null, Destiny.objectiveHashCacheById[objectiveHash]);
          });
        });

      } catch (e) {
        callback(e);
      }

    } else {
      callback(null, Destiny.objectiveHashCacheById[objectiveHash]);
    }

  };

  private static objectiveHashCacheById;

// get vendor definition
  private static queryVendorById (vendorHash, callback) {
    if (!Destiny.vendorHashCacheById) {
      Destiny.vendorHashCacheById = {};
      try {
        const db = new sqlite.Database(Destiny.MANIFEST_CONTENT);
        db.serialize(function () {
          const query = "SELECT * FROM DestinyVendorDefinition";
          db.each(query, function (err, row) {
            if (err) throw err;

            //debug(JSON.stringify(row, null, 2));
            const data = JSON.parse(row.json);
            //debug(JSON.stringify(data, null, 2));
            Destiny.vendorHashCacheById[data.hash] = data;
          }, function (err, cpt) {
            debug(cpt + " vendor definitions read");
            //debug(JSON.stringify(vendorHash, null, 2));
            callback(null, Destiny.vendorHashCacheById[vendorHash]);
          });
        });

      } catch (e) {
        callback(e);
      }

    } else {
      callback(null, Destiny.vendorHashCacheById[vendorHash]);
    }

  };

  private static vendorHashCacheById;

  //noinspection JSUnusedLocalSymbols
  public static checkConf (conf, callback) {
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
        });
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
  private static _getFromBungie (path: string, callback: Function, accessToken?: string): void {
    //debug("_getFromBungie(" + path + ")");
    const options = {
      hostname: 'www.bungie.net',
      port: 443,
      path: path,
      headers: {'X-API-Key': Config.destinyAPIKey},
      method: 'GET'
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
      error("Error in connecting Bungie");
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
  private static _postFromBungie (path, postData, callback, accessToken) {
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
          debug.error("Error in getting Bungie data : " + e + ' from ' + path);
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


}

Destiny.initialize();