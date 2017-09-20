var https = require('https');
var async = require('async');
var logger = require('../logger');
var config = require('../config');


//var _URL_SEARCH_DESTINY_PLAYER = '/Destiny/SearchDestinyPlayer/{membershipType}/{displayName}/?definitions=true';
var _URL_SEARCH_DESTINY_PLAYER = '/Destiny2/SearchDestinyPlayer/{membershipType}/{displayName}/'
//var _URL_ACCOUNT_SUMMARY = '/Destiny/{membershipType}/Account/{destinyMembershipId}/Items/?definitions=true';
var _URL_ACCOUNT_SUMMARY = '/Destiny2/{membershipType}/Profile/{destinyMembershipId}/?components=200';
var _URL_GET_INVENTORY = '/Destiny/{membershipType}/Account/{destinyMembershipId}/Character/{characterId}/Inventory/?definitions=true';
var _URL_GET_GRIMOIRE = '/Destiny/Vanguard/Grimoire/{membershipType}/{membershipId}/?definitions=true';
//var _URL_GET_CLAN = '/Destiny2/Stats/Leaderboards/Clans/{groupId}/';
//var _URL_GET_CLAN = '/Destiny2/Clan/{groupId}/WeeklyRewardState/';
//var _URL_GET_CLAN = '/GroupV2/{groupId}/?definitions=true';
//var _URL_GET_CLAN1 = '/GroupV2/{groupId}/Members/';
var _URL_GET_CLAN = '/GroupV2/{groupId}/Members/?lc=en&fmt=true&currentPage={currentPage}&platformType=2'
//var URL_GET_LEADERBOARD = '/Destiny2/Stats/Leaderboards/Clans/{groupId}/?maxtop=200&modes=3,4,16,17';
//var URL_GET_AGREGATECLABOARD = '/Destiny2/Stats/AggregateClanStats/{groupId}/?maxtop=200&modes=3,4,16,17';
//var URL_GET_ACCOUNT_STAT = '/Destiny2/{membershipType}/Account/{destinyMembershipId}/Stats/?groups=102';
//var URL_GET_ACCOUNT_STAT = '/Destiny2/{membershipType}/Account/{destinyMembershipId}/Character/{characterId}/Stats/AggregateActivityStats/';
var URL_GET_ACCOUNT_STAT = '/Destiny2/{membershipType}/Account/{destinyMembershipId}/Character/{characterId}/Stats/?modes=16,17,4,3,5,39&groups=0';

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

  });

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

          var url = URL_GET_ACCOUNT_STAT;
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
        //     var url = URL_GET_AGREGATECLABOARD;
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


module.exports = {};

module.exports.getLight = getLight;
module.exports.getGrimoire = getGrimoire;
module.exports.getClan = getClan;


/**
 * Get data from bungie
 * @param callback
 * @private
 */
function _getFromBungie(path, callback) {
  //logger.info("_getFromBungie(" + path + ")");
  var options = {
    hostname: 'www.bungie.net',
    port: 443,
    //path: '/d1/platform/Destiny/Manifest/InventoryItem/1274330687/',
    path: '/platform' + path,
    headers: {'X-API-Key': config.destinyAPIKey},
    method: 'GET'
  };
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
        logger.error("Error in getting Bungie data : " + e + 'from ' + path);
        return callback(null, null);
      }

      if ((val.ErrorStatus == "DestinyAccountNotFound") || (val.ErrorStatus == "DestinyLegacyPlatformInaccessible")) {
        return callback(null, null);
      }

      if (val.ErrorCode !== 1) {
        logger.info(JSON.stringify(val, null, 2));
        logger.error("Error in reading Bungie data : " + val.Message);
        return callback(null, null);
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
