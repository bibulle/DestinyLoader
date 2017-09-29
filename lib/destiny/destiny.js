var https = require('https');
var request = require('request');
var async = require('async');
var fs = require('fs');
var path = require('path');
var sqlite = require('sqlite3').verbose();
var SZIP = require('node-stream-zip'); //use this

var logger = require('../logger');
var config = require('../config');


var _URL_AUTH_GET_CODE = 'https://www.bungie.net/en/OAuth/Authorize?client_id={client-id}&response_type=code';
var _URL_GET_TOKEN_FROM_CODE = '/Platform/App/OAuth/Token/';
var _URL_GET_TOKEN_FROM_REFRESH = '/Platform/App/GetAccessTokensFromRefreshToken/?code={refreshToken}';
var _URL_GET_CURRENT_USER = '/Platform/User/GetMembershipsForCurrentUser/';
var _URL_SEARCH_DESTINY_PLAYER = '/Platform/Destiny2/SearchDestinyPlayer/{membershipType}/{displayName}/'
var _URL_ACCOUNT_SUMMARY = '/Platform/Destiny2/{membershipType}/Profile/{destinyMembershipId}/?components=200';
var _URL_GET_INVENTORY = '/Platform/Destiny/{membershipType}/Account/{destinyMembershipId}/Character/{characterId}/Inventory/?definitions=true';
var _URL_GET_GRIMOIRE = '/Platform/Destiny/Vanguard/Grimoire/{membershipType}/{membershipId}/?definitions=true';
//var _URL_GET_CLAN = '/Platform/Destiny2/Stats/Leaderboards/Clans/{groupId}/';
//var _URL_GET_CLAN = '/Platform/Destiny2/Clan/{groupId}/WeeklyRewardState/';
//var _URL_GET_CLAN = '/Platform/GroupV2/{groupId}/?definitions=true';
//var _URL_GET_CLAN1 = '/Platform/GroupV2/{groupId}/Members/';
var _URL_GET_CLAN = '/Platform/GroupV2/{groupId}/Members/?lc=en&fmt=true&currentPage={currentPage}&platformType=2'
//var _URL_GET_LEADERBOARD = '/Platform/Destiny2/Stats/Leaderboards/Clans/{groupId}/?maxtop=200&modes=3,4,16,17';
//var _URL_GET_AGREGATECLABOARD = '/Platform/Destiny2/Stats/AggregateClanStats/{groupId}/?maxtop=200&modes=3,4,16,17';
//var _URL_GET_ACCOUNT_STAT = '/Platform/Destiny2/{membershipType}/Account/{destinyMembershipId}/Stats/?groups=102';
//var _URL_GET_ACCOUNT_STAT = '/Platform/Destiny2/{membershipType}/Account/{destinyMembershipId}/Character/{characterId}/Stats/AggregateActivityStats/';
var _URL_GET_ACCOUNT_STAT = '/Platform/Destiny2/{membershipType}/Account/{destinyMembershipId}/Character/{characterId}/Stats/?modes=16,17,4,3,5,39&groups=0';
var _URL_GET_USER_STUFF = '/Platform/Destiny2/{membershipType}/Profile/{destinyMembershipId}/?components=100,102,103,200,201,202,204,205,300,301,302,304,305,306,307,308'

var _URL_GET_MANIFEST = '/Platform//Destiny2/Manifest/'

var _URL_LOCK_ITEM = "/Platform/Destiny2/Actions/Items/SetLockState/";
var _URL_MOVE_ITEM = "/Platform/Destiny2/Actions/Items/TransferItem/";
var _URL_EQUIP_ITEM = "/Platform/Destiny2/Actions/Items/EquipItem/"

var getAuthentCodeUrl = function (callback) {
  var url = _URL_AUTH_GET_CODE;
  url = url.replace(/[{]client-id(})/, config.oAuthClientId);

  //logger.info(JSON.stringify(url, null, 2));
  return callback(null, url);

}
var getTokenUrl = function (callback) {
  var url = _URL_GET_TOKEN_FROM_CODE;

  //logger.info(JSON.stringify(url, null, 2));
  return callback(null, url);

}
var getCurrentUser = function (user, callback) {
  //logger.info("getCurrentUser '" + user.auth.access_token + "'");

  // Get the destiny player
  var url = _URL_GET_CURRENT_USER;
  //logger.info(JSON.stringify(url, null, 2));

  _getFromBungie(url, function (err, data) {
    //logger.info(JSON.stringify(err, null, 2));
    //logger.info(JSON.stringify(data, null, 2));
    if (err) {
      return callback(err);
    }
    callback(null, data);
  }, user.auth.access_token);

}
var getGrimoire = function (user, callback) {
  logger.info("getGrimoire '" + user.id + "'");

  // Get the destiny player
  var url = _URL_SEARCH_DESTINY_PLAYER;
  url = url.replace(/[{]membershipType(})/, 'All');
  url = url.replace(/[{]displayName(})/, user.id);
  //logger.info(JSON.stringify(url, null, 2));

  _getFromBungie(url, function (err, data) {
    //logger.info(JSON.stringify(data, null, 2));
    if (err) {
      return callback(err);
    }
    if (data.length == 0) {
      return callback('User "' + user.id + '" not found')
    }

    var membershipType = data[0].membershipType;
    var membershipId = data[0].membershipId;
    //logger.info(JSON.stringify(membershipType, null, 2));
    //logger.info(JSON.stringify(membershipId, null, 2));

    // Get characters
    var url = _URL_GET_GRIMOIRE;
    url = url.replace(/[{]membershipType(})/, membershipType);
    url = url.replace(/[{]membershipId(})/, membershipId);
    //logger.info(JSON.stringify(url, null, 2));

    _getFromBungie(url, function (err, data) {
      //logger.info(JSON.stringify(data.data, null, 2));
      if (err) {
        return callback(err);
      }
      if (data.data.cardCollection.length == 0) {
        return callback('Grimoire cards for "' + user.id + '" not found')
      }

      // Build the result
      result = {};
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

}
var getLight = function (userId, isOnLine, callback) {
  //logger.info("getLight '" + userId + "'");

  // Get the destiny player

  var url = _URL_SEARCH_DESTINY_PLAYER;
  url = url.replace(/[{]membershipType(})/, 'All');
  url = url.replace(/[{]displayName(})/, userId.replace(' ', '+'));
  //logger.info(JSON.stringify(url, null, 2));

  _getFromBungie(url, function (err, data) {
    //logger.info(JSON.stringify(err, null, 2));
    //logger.info(JSON.stringify(data, null, 2));
    if (err) {
      return callback(err);
    }
    if (!data || data.length == 0) {
      //logger.info('User "' + userId + '" not found');
      return callback(null, []);
    }

    var membershipType = data[0].membershipType;
    var membershipId = data[0].membershipId;
    //logger.info(JSON.stringify(membershipId, null, 2));

    // Get characters
    var url = _URL_ACCOUNT_SUMMARY;
    url = url.replace(/[{]membershipType(})/, membershipType);
    url = url.replace(/[{]destinyMembershipId(})/, membershipId);
    //logger.info(JSON.stringify(url, null, 2));

    _getFromBungie(url, function (err, data) {
      //logger.info(JSON.stringify(err, null, 2));
      //logger.info(JSON.stringify(data, null, 2));
      if (err) {
        return callback(err);
      }
      var result = [];

      if (!data || data.length == 0) {
        //logger.info('User "' + userId + '" not found (profile)');
        return callback(null, result);
      }

      //logger.info(JSON.stringify(data.characters.data, null, 2));


      var cpt = 1;
      //async.eachSeries(data.characters.data,
      async.eachSeries(Object.keys(data.characters.data),
        function (characterId, callback) {
          var character = data.characters.data[characterId];
          //logger.info(JSON.stringify(character, null, 2));

          var resultChar = {}
          resultChar.date = new Date();
          resultChar.name = userId + " / " + cpt;
          resultChar.userId = userId;
          resultChar.isOnLine = isOnLine;
          resultChar.id = character.characterId;
          resultChar.minutesPlayedTotal = character.minutesPlayedTotal;
          resultChar.light = character.light;
          resultChar.baseCharacterLevel = character.baseCharacterLevel + (character.percentToNextLevel / 100);

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
            //logger.info(JSON.stringify(resultChar, null, 2));
          }

          cpt++;

          var url = _URL_GET_ACCOUNT_STAT;
          url = url.replace(/[{]membershipType(})/, membershipType);
          url = url.replace(/[{]destinyMembershipId(})/, membershipId);
          url = url.replace(/[{]characterId(})/, resultChar.id);
          //logger.info(JSON.stringify(url, null, 2));

          _getFromBungie(url, function (err, data) {
            //logger.info(JSON.stringify(err, null, 2));
            //logger.info(JSON.stringify(data, null, 2));
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

            callback();

          });

        },
        function (err) {
          //logger.info("==========");
          //logger.info(JSON.stringify(err, null, 2));
          //logger.info(JSON.stringify(result, null, 2));

          callback(err, result);
        }
      );

    });
  });

};
var getClan = function (groupId, callback) {
  //logger.info("getClan '" + groupId + "'");

  // Get the destiny player

  var url = _URL_GET_CLAN;
  var currentPage = 1;
  url = url.replace(/[{]groupId(})/, groupId);
  url = url.replace(/[{]currentPage(})/, currentPage);
  //logger.info(JSON.stringify(url, null, 2));

  _getFromBungie(url, function (err, data) {
    //logger.info(JSON.stringify(err, null, 2));
    //logger.info(JSON.stringify(data, null, 2));
    if (err) {
      return callback(err);
    }
    if (!data || data.length == 0 || !data.results || data.results.length == 0) {
      return callback('Clan "' + groupId + '" not found')
    }

    // We got results
    var members = [];

    async.eachSeries(
      data.results,
      function (result, callback) {
        //logger.info(JSON.stringify(result, null, 2));
        var member = {};
        member.isOnLine = result.isOnline;
        member.displayName = result.destinyUserInfo.displayName;

        members.push(member);
        callback();
      },
      function (err) {
        //     var url = _URL_GET_AGREGATECLABOARD;
        //     var currentPage = 1;
        //     url = url.replace(/[{]groupId(})/, groupId);
        //     url = url.replace(/[{]currentPage(})/, currentPage);
        //     logger.info(JSON.stringify(url, null, 2));
        //
        //     _getFromBungie(url, function (err, data) {
        //         logger.info(JSON.stringify(err, null, 2));
        //         logger.info(JSON.stringify(data, null, 2));
        //         if (err) {
        //             return callback(err);
        //         }
        callback(err, members);
        // })
      }
    );

  });
};
var getUserStuff = function (user, callback) {
  //logger.info("getUserStuff");

  // Get the destiny player
  var url = _URL_GET_USER_STUFF;
  url = url.replace(/[{]membershipType(})/, user.destinyMemberships[0].membershipType);
  url = url.replace(/[{]destinyMembershipId(})/, user.destinyMemberships[0].membershipId);
  //logger.info(JSON.stringify(url, null, 2));

  _getFromBungie(url, function (err, data) {
    //logger.info(JSON.stringify(err, null, 2));
    //logger.info(JSON.stringify(data, null, 2));
    if (err) {
      return callback(err);
    }
    if (!data) {
      return callback("Error");
    }


    //console.log(data);
    //console.log(data.characterInventories.data);
    //console.log(data.itemComponents.instances.data);

    var result = {
      items: {}
    };

    // read the item instance
    var itemInstancesTable = {};
    async.eachSeries(
      Object.keys(data.itemComponents.instances.data),
      function (instanceId, callback) {
        itemInstancesTable[instanceId] = data.itemComponents.instances.data[instanceId];
        callback();
      }
    );

    // read the item socket
    var itemSocketsTable = {};
    async.eachSeries(
      Object.keys(data.itemComponents.sockets.data),
      function (instanceId, callback) {
        itemSocketsTable[instanceId] = data.itemComponents.sockets.data[instanceId];
        callback();
      }
    );

    // build item list from the  profile inventories
    var itemsToLoad = data.profileInventory.data.items;

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
          }
        );
        callback();
      }
    );

    // add items from the  characters equipment
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
      }
    );

    //logger.info(JSON.stringify(itemsToLoad, null, 2));

    // Fill the items
    async.eachSeries(
      itemsToLoad,
      function (item, callback) {
        async.waterfall([
            // Add item instance info
            function (callback) {
              //logger.info(JSON.stringify(item, null, 2));
              if (item.itemInstanceId) {
                if (itemInstancesTable[item.itemInstanceId]) {
                  item.instance = itemInstancesTable[item.itemInstanceId];
                } else {
                  logger.error("Item Instance not found");
                  logger.warn(JSON.stringify(item, null, 2));
                }
              } else {
                //logger.error("No item instance id");
                //logger.info(JSON.stringify(item, null, 2));
              }
              callback(null, item);
            },
            // Add item socket info
            function (item, callback) {
              //logger.info(JSON.stringify(item, null, 2));
              item.lightLevelBonus = 0;
              if (item.itemInstanceId) {
                if (itemSocketsTable[item.itemInstanceId]) {
                  item.sockets = itemSocketsTable[item.itemInstanceId].sockets;
                  //logger.info(JSON.stringify(item.sockets, null, 2));
                  // search for mod into sockets
                  async.eachSeries(
                    item.sockets,
                    function (socket, callback) {
                      if (socket.plugHash && socket.isEnabled) {
                        queryItemById(socket.plugHash, function (err, plug) {
                          // is it a mod
                          if (err) {
                            return callback(err, item);
                          }
                          if (plug.itemType == 19) {
                            //logger.info(JSON.stringify(plug, null, 2));
                            plug.investmentStats.forEach(function (stat) {
                              if ((stat.statTypeHash == 1480404414) || (stat.statTypeHash == 3897883278)) {
                                //logger.info(JSON.stringify(plug, null, 2));
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
                  //logger.error("Item Socket not found");
                  //logger.warn(JSON.stringify(item, null, 2));
                  callback(null, item);
                }
              } else {
                //logger.error("No item instance id");
                //logger.info(JSON.stringify(item, null, 2));
                callback(null, item);
              }
            },
            // Add current bucket data
            function (item, callback) {
              //logger.info(JSON.stringify(item, null, 2));
              if (item.bucketHash) {
                queryBucket(item.bucketHash, function (err, bucket) {
                  if (err) return callback(err, item);
                  item.bucket = bucket;
                  item.bucketName = bucket.displayProperties.name;
                  if (!item.bucketName) {
                    //logger.error("Empty bucket name");
                    //logger.error(JSON.stringify(bucket, null, 2));
                    //logger.error(JSON.stringify(item, null, 2));
                    item.bucketName = item.bucketHash;
                  }
                  callback(null, item);
                })
              } else {
                logger.error("Empty bucket");
                logger.warn(JSON.stringify(item, null, 2));
                callback(null, item);
              }
            },
            // Add item info
            function (item, callback) {
              if (item.itemHash) {
                queryItemById(item.itemHash, function (err, definition) {
                  if (err) return callback(err);
                  item.item = definition;
                  item.itemName = definition.displayProperties.name;
                  if (!item.itemName) {
                    logger.error("Empty definition name");
                    logger.warn(JSON.stringify(definition, null, 2));
                  }
                  callback(null, item);
                })
              } else {
                logger.error("Empty definition");
                logger.warn(JSON.stringify(item, null, 2));
                callback(null, item);
              }
            },
            // Add target bucket data
            function (item, callback) {
              //logger.info(JSON.stringify(item, null, 2));
              if (item.item.inventory.bucketTypeHash) {
                queryBucket(item.item.inventory.bucketTypeHash, function (err, bucket) {
                  if (err) return callback(err, item);
                  item.bucketTarget = bucket;
                  item.bucketNameTarget = bucket.displayProperties.name;
                  if (!item.bucketNameTarget) {
                    //logger.error("Empty bucket name");
                    //logger.error(JSON.stringify(bucket, null, 2));
                    //logger.error(JSON.stringify(item, null, 2));
                    item.bucketNameTarget = item.item.inventory.bucketTypeHash;
                  }
                  callback(null, item);
                })
              } else {
                logger.error("Empty bucket");
                logger.warn(JSON.stringify(item, null, 2));
                callback(null, item);
              }
            },
            // Clean the item (to have only needed data)
            function (item, callback) {
              //if ((item.item.displayProperties.name == "Uriel's Gift") || (item.item.displayProperties.name == "Seven-Six-Five")) {
              //if ((item.bucketName == "Modifications")) {
              //  logger.info(JSON.stringify(item, null, 2));
              //}
              try {
                newItem = {
                  "bucketName": item.bucketName,
                  "bucketNameTarget": item.bucketNameTarget,
                  "itemInstanceId": (item.itemInstanceId ? item.itemInstanceId : null),
                  "damageType": (item.instance ? item.instance.damageType : null),
                  "isEquipped": (item.instance ? item.instance.isEquipped : null),
                  "lightLevel": (item.instance ? item.instance.itemLevel * 10 + item.instance.quality : null),
                  "lockable": item.lockable,
                  "state": item.state,
                  "location": item.location,
                  "name": item.item.displayProperties.name,
                  "itemTypeDisplayName": item.item.itemTypeDisplayName,
                  "itemTypeAndTierDisplayName": item.item.itemTypeAndTierDisplayName,
                  "infusionCategoryName": (item.item.quality ? item.item.quality.infusionCategoryName : null),
                  "characterId": item.characterId,
                  "itemHash": item.itemHash,
                  "tierType": item.item.inventory.tierType,
                  "lightLevelBonus": item.lightLevelBonus,
                };

              } catch (e) {
                logger.error(JSON.stringify(e, null, 2));
                logger.warn(JSON.stringify(item, null, 2));
              }
              callback(null, newItem);
            }

          ],
          function (err, item) {
            // We classify by bucketNameTarget and itemTypeDisplayName
            if (!result.items[item.bucketNameTarget]) {
              result.items[item.bucketNameTarget] = {};
            }
            if (!result.items[item.bucketNameTarget][item.itemTypeDisplayName]) {
              result.items[item.bucketNameTarget][item.itemTypeDisplayName] = [];
            }
            result.items[item.bucketNameTarget][item.itemTypeDisplayName].push(item);

            async.setImmediate(function () {
              callback(err, result);
            });
          });

      },
      function (err) {
        callback(null, result);
      }
    )
  }, user.auth.access_token);

}

var lockItem = function (user, item, state, callback) {
  //logger.info("lockItem");

  // Get the destiny player
  var url = _URL_LOCK_ITEM;

  _postFromBungie(url,
    {
      state: state,
      itemId: item.itemInstanceId,
      characterId: item.characterId,
      membershipType: user.destinyMemberships[0].membershipType
    }
    , function (err, data) {
      //logger.info(JSON.stringify(err, null, 2));
      //logger.info(JSON.stringify(data, null, 2));
      if (err) {
        return callback(err);
      }
      callback();

    }, user.auth.access_token);
}

var equipItem = function (user, item, callback) {
  //logger.info("lockItem");

  // Get the destiny player
  var url = _URL_EQUIP_ITEM;

  _postFromBungie(url,
    {
      itemId: item.itemInstanceId,
      characterId: item.characterId,
      membershipType: user.destinyMemberships[0].membershipType
    }
    , function (err, data) {
      //logger.info(JSON.stringify(err, null, 2));
      //logger.info(JSON.stringify(data, null, 2));
      if (err) {
        return callback(err);
      }
      callback();

    }, user.auth.access_token);
}

var moveItem = function (user, item, itemCanBeEquipped, moveToVault, callback) {
  logger.info("moveItem");
  logger.info(JSON.stringify(item, null, 2));

  // Get the destiny player
  var url = _URL_MOVE_ITEM;

  // if item is equipped, switch it with itemCanBeEquipped
  if (item.isEquipped && moveToVault && itemCanBeEquipped) {

    equipItem(user, itemCanBeEquipped, function(err) {
      if (err) {
        return callback(err);
      }
      _postFromBungie(url,
        {
          itemReferenceHash: item.itemHash,
          stackSize: 1,
          transferToVault: moveToVault,
          itemId: item.itemInstanceId,
          characterId: item.characterId,
          membershipType: user.destinyMemberships[0].membershipType
        }
        , function (err, data) {
          //logger.info(JSON.stringify(err, null, 2));
          //logger.info(JSON.stringify(data, null, 2));
          if (err) {
            return callback(err);
          }
          callback();

        }, user.auth.access_token);
    });
  } else {
    _postFromBungie(url,
      {
        itemReferenceHash: item.itemHash,
        stackSize: 1,
        transferToVault: moveToVault,
        itemId: item.itemInstanceId,
        characterId: item.characterId,
        membershipType: user.destinyMemberships[0].membershipType
      }
      , function (err, data) {
        //logger.info(JSON.stringify(err, null, 2));
        //logger.info(JSON.stringify(data, null, 2));
        if (err) {
          return callback(err);
        }
        callback();

      }, user.auth.access_token);
  }

}

var getManifest = function (callback) {
  logger.info("getManifest");

  // Get the destiny player
  var url = _URL_GET_MANIFEST;
  //logger.info(JSON.stringify(url, null, 2));

  _getFromBungie(url, function (err, data) {
    //logger.info(JSON.stringify(err, null, 2));
    //logger.info(JSON.stringify(data, null, 2));
    if (err) {
      return callback(err)
    }
    var contentPath = data.mobileWorldContentPaths.en;
    //console.log(contentPath);

    // read the file
    var outStream = fs.createWriteStream('../data/manifest.zip');
    var options = {
      uri: 'https://www.bungie.net' + contentPath,
      port: 443,
      method: 'GET',
      encoding: null,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.destinyAPIKey
      }
    };

    request(options)
      .on('response', function (res, body) {
        //console.log(res.statusCode);
      }).pipe(outStream)
      .on('finish', function () {
        var zip = new SZIP({
          file: '../data/manifest.zip',
          storeEntries: true
        });

        zip.on('ready', function () {
          zip.extract(path.basename(contentPath), '../data/manifest.content', function (err, count) {
            if (err) console.log(err);

            queryManifestTables(function (err, data) {
              if (err) {
                return callback(err);
              }
              return callback();
              //queryItem("2465295065", function (err, data) {
              //  logger.info(JSON.stringify(data, null, 2));
              //});
            });
          });
        });

      });
  }, null);

}


// get tables names
var queryManifestTables = function (callback) {
  var db = new sqlite.Database('../data/manifest.content');

  var rows = [];
  try {
    db.serialize(function () {

      var query = "SELECT name FROM sqlite_master WHERE type='table'";
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
}
// get bucket definition
var queryBucket = function (buckedHash, callback) {
  if (!bucketHashCache) {
    bucketHashCache = {};
    try {
      var db = new sqlite.Database('../data/manifest.content');
      db.serialize(function () {
        var query = "SELECT * FROM DestinyInventoryBucketDefinition";
        db.each(query, function (err, row) {
          if (err) throw err;

          //logger.info(JSON.stringify(row, null, 2));
          data = JSON.parse(row.json);
          //logger.info(JSON.stringify(data, null, 2));
          bucketHashCache[data.hash] = data;
        }, function (err, cpt) {
          logger.info(cpt + " bucket definitions read");
          //logger.info(JSON.stringify(bucketHashCache, null, 2));
          callback(null, bucketHashCache[buckedHash]);
        });
      });

    } catch (e) {
      callback(e);
    }

  } else {
    callback(null, bucketHashCache[buckedHash]);
  }

}
var bucketHashCache;

// get item definition
var queryItemById = function (itemHash, callback) {
  if (!itemHashCacheById) {
    itemHashCacheById = {};
    try {
      var db = new sqlite.Database('../data/manifest.content');
      db.serialize(function () {
        var query = "SELECT * FROM DestinyInventoryItemDefinition";
        db.each(query, function (err, row) {
          if (err) throw err;

          //logger.info(JSON.stringify(row, null, 2));
          data = JSON.parse(row.json);
          //logger.info(JSON.stringify(data, null, 2));
          itemHashCacheById[data.hash] = data;
        }, function (err, cpt) {
          logger.info(cpt + " item definitions read");
          //logger.info(JSON.stringify(itemHashCacheById, null, 2));
          callback(null, itemHashCacheById[itemHash]);
        });
      });

    } catch (e) {
      callback(e);
    }

  } else {
    callback(null, itemHashCacheById[itemHash]);
  }

}
var itemHashCacheById;
var queryItemByName = function (itemName, callback) {
  if (!itemHashCacheByName) {
    itemHashCacheByNameTmp = {};
    try {
      var db = new sqlite.Database('../data/manifest.content');
      db.serialize(function () {
        var query = "SELECT * FROM DestinyInventoryItemDefinition";
        db.each(query, function (err, row) {
          if (err) throw err;

          //logger.info(JSON.stringify(row, null, 2));
          data = JSON.parse(row.json);
          //logger.info(JSON.stringify(data.displayProperties.name, null, 2));
          itemHashCacheByNameTmp[data.displayProperties.name] = data;
        }, function (err, cpt) {
          logger.info(cpt + " item definitions read");
          itemHashCacheByName = itemHashCacheByNameTmp;
          //logger.info(JSON.stringify(itemHashCache, null, 2));
          callback(null, itemHashCacheByName[itemName]);
        });
      });

    } catch (e) {
      callback(e);
    }

  } else {
    callback(null, itemHashCacheByName[itemName]);
  }

}
var itemHashCacheByName;


var checkConf = function (conf, callback) {
  var messages = [];

  //logger.info(JSON.stringify(conf, null, 2));

  async.eachSeries(
    conf.list,
    function (name, callback) {
      queryItemByName(name, function (err, item) {
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

}

module.exports = {};

module.exports.getLight = getLight;
module.exports.getGrimoire = getGrimoire;
module.exports.getClan = getClan;
module.exports.getCurrentUser = getCurrentUser;
module.exports.getAuthentCodeUrl = getAuthentCodeUrl;
module.exports.getTokenUrl = getTokenUrl;
module.exports.getUserStuff = getUserStuff;
module.exports.getManifest = getManifest;
module.exports.queryManifestTables = queryManifestTables;
module.exports.queryBucket = queryBucket;
module.exports.checkConf = checkConf;
module.exports.lockItem = lockItem;
module.exports.moveItem = moveItem;


/**
 * Get data from bungie
 * @param callback
 * @private
 */
function _getFromBungie(path, callback, accessToken) {
  //logger.info("_getFromBungie(" + path + ")");
  var options = {
    hostname: 'www.bungie.net',
    port: 443,
    path: path,
    headers: {'X-API-Key': config.destinyAPIKey},
    method: 'GET'
  };
  if (accessToken) {
    options.headers.Authorization = "Bearer " + accessToken
  }

  //logger.info(JSON.stringify(options, null, 2));

  var req = https.request(options, function (res) {
    //logger.info("statusCode: ", res.statusCode);
    //logger.info("headers: ", res.headers);
    //logger.info(res);

    var content = '';

    res.on('data', function (d) {
      //logger.info("data");
      //logger.info(d.toString());
      content += d.toString();
    });
    res.on('end', function (d) {
      //logger.info('end');

      var val;

      try {
        //logger.info('end : '+content);
        val = JSON.parse(content);
      } catch (e) {
        logger.warn("statusCode: ", res.statusCode, " : ", res.statusMessage);
        //logger.info(content);
        //logger.error("Error in getting Bungie data : " + e + ' from ' + path);
        return callback("Error in getting Bungie data : " + e + ' from ' + path, null);
      }

      if ((val.ErrorStatus == "DestinyAccountNotFound") || (val.ErrorStatus == "DestinyLegacyPlatformInaccessible")) {
        return callback(null, null);
      }

      if (val.ErrorCode !== 1) {
        logger.warn(JSON.stringify(val, null, 2));
        logger.error("Error in reading Bungie data : " + val.Message);
        return callback("Error in reading Bungie data : " + val.Message, null);
      }

      //logger.info(JSON.stringify(val.Response, null, 2));
      return callback(null, val.Response);
    });
  });
  req.end();

  req.on('error', function (e) {
    //logger.info("error");

    return callback("Error in conecting Bungie : " + e);
  });
}

/**
 * Post action to bungie
 * @param callback
 * @private
 */
function _postFromBungie(path, postData, callback, accessToken) {
  logger.info("_postFromBungie(" + path + ")");
  logger.info(JSON.stringify(postData, null, 2));

  postData = JSON.stringify(postData);
  var options = {
    hostname: 'www.bungie.net',
    port: 443,
    path: path,
    headers: {
      'X-API-Key': config.destinyAPIKey,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': postData.length
    },
    method: 'POST'
  };
  if (accessToken) {
    options.headers.Authorization = "Bearer " + accessToken
  }

  logger.info(JSON.stringify(options, null, 2));

  var req = https.request(options, function (res) {
    //logger.info("statusCode: ", res.statusCode);
    //logger.info("headers: ", res.headers);
    //logger.info(res);

    var content = '';

    res.on('data', function (d) {
      //logger.info("data");
      //logger.info(d.toString());
      content += d.toString();
    });
    res.on('end', function (d) {
      //logger.info('end');

      var val;

      try {
        //logger.info('end : '+content);
        val = JSON.parse(content);
      } catch (e) {
        logger.warn("statusCode: ", res.statusCode, " : ", res.statusMessage);
        //logger.info(content);
        //logger.error("Error in getting Bungie data : " + e + ' from ' + path);
        return callback("Error in getting Bungie data : " + e + ' from ' + path, null);
      }

      if ((val.ErrorStatus == "DestinyAccountNotFound") || (val.ErrorStatus == "DestinyLegacyPlatformInaccessible")) {
        return callback(null, null);
      }

      if (val.ErrorCode !== 1) {
        logger.warn(JSON.stringify(val, null, 2));
        logger.error("Error in reading Bungie data : " + val.Message);
        return callback("Error in reading Bungie data : " + val.Message, null);
      }

      //logger.info(JSON.stringify(val.Response, null, 2));
      return callback(null, val.Response);
    });
  });
  req.write(postData);
  req.end();

  req.on('error', function (e) {
    //logger.info("error");

    return callback("Error in connecting Bungie : " + e);
  });
}

// init
async.waterfall([
    function (callback) {
      getManifest(callback);
    },
    function (callback) {
      queryBucket("", callback);
    },
    function (foo, callback) {
      queryItemById("", callback);
    },
    function (foo, callback) {
      queryItemByName("", callback);
    },
  ],
  function (err) {
    if (err) {
      logger.error(err);
      process.exit(-1);
    }
  });

