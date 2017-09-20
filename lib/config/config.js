var logger = require('../logger');
var fs = require('fs');

var config = {
  "dbPath": "",
  "crontab": "",
  "crontabGrimoire": "",
  "clanId": 0,
  "accountsGrimoire": [],
  'destinyAPIKey': ''
};

var node_env = process.env.NODE_ENV || 'development';

// Check the user env
if (!fs.existsSync(__dirname+"/env-myown.json")) {
  logger.error("Your environment is not set, create the 'lib/config/env-myown.json' file.");
  logger.error("   on can copy it from the 'lib/config/env-model.json' file.");
  process.exit(1);
}

// read it
var env = require('./env-myown.json')

for (var attrname in env[node_env]) {
  config[attrname] = env[node_env][attrname];
}


module.exports = config;