import * as path from "path";

// const debugLogger = require('debugLogger')('server:debugLogger:config');
const error = require('debug')('server:error:config');
const fs = require('fs');

export class Config {
  public static mongoUrl = "";
  public static dbPath = "";
  public static crontab = "";
  public static crontabGrimoire = "";
  public static startingDate = "2017/10/17 00:00:00";
  public static clanId = 0;
  public static accountsClan = [];
  public static accountsGrimoire = [];
  public static destinyAPIKey = '';
  public static oAuthClientId = "";
  public static oAuthClientSecret = "";
  public static clanMembers = [];

  public static CLAN_MEMBER_LIST = path.resolve(__dirname+'/../../../data/clanMember.js');




  private static node_env = process.env.NODE_ENV || 'development';

  static initialize () {
    // debugLogger(Config.CLAN_MEMBER_LIST);

    // Check the user env
    if (!fs.existsSync(__dirname + "/env-myown.json")) {
      error("Your environment is not set, create the '" + __dirname + "/env-myown.json' file.");
      error("   on can copy it from the 'lib/config/env-model.json' file.");
      process.exit(1);
    }

    // read it
    const env = require('./env-myown.json');

    for (const attrname in env[Config.node_env]) {
      //noinspection JSUnfilteredForInLoop
      Config[attrname] = env[Config.node_env][attrname];
    }

    // do some init
    try {
      fs.mkdirSync(path.dirname(Config.CLAN_MEMBER_LIST));
    } catch (e) {
    }

  }


}

Config.initialize();
