var logger = require('../logger');
var fs = require('fs');

var config = {
  "dbPath": "",
  "crontab": "",
  "crontabGrimoire": "",
  "startingDate": "2017/10/17 00:00:00",
  "clanId": 0,
  "accountsClan": [],
  "accountsGrimoire": [],
  'destinyAPIKey': '',
  "oAuthClientId": "",
  "oAuthClientSecret": ""
};

var node_env = process.env.NODE_ENV || 'development';

// Check the user env
if (!fs.existsSync(__dirname + "/env-myown.json")) {
  logger.error("Your environment is not set, create the '"+__dirname+"/env-myown.json' file.");
  logger.error("   on can copy it from the 'lib/config/env-model.json' file.");
  process.exit(1);
}

// read it
var env = require('./env-myown.json')

for (var attrname in env[node_env]) {
  config[attrname] = env[node_env][attrname];
}

// do some init
try {
  fs.mkdirSync(__dirname+"/../../data");
} catch (e) {
}

module.exports = config;