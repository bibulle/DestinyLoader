import * as path from "path";

// const debug = require('debug')('server:debug:config');
const error = require('debug')('server:error:config');
const fs = require('fs');

export class Config {
  public static package_name = "";
  public static package_version = "";
  public static package_commit = {
    "number": 0,
    "hash": "",
    "shortHash": "",
    "timestamp": ""
  };

  public static mongoUrl = "";
  public static dbPath = "";

  public static defaultLanguage = 'en';
  public static languages = ['en', 'fr'];

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

    console.log('initialize');
    console.log('----------');
    console.log(process.env);
    Config.package_name = process.env.npm_package_name;
    Config.package_version = process.env.npm_package_version;
    Config.package_commit = {
      "number": +process.env.npm_package_commit_number,
      "hash": process.env.npm_package_commit_hash,
      "shortHash": process.env.npm_package_commit_shorthash,
      "timestamp": process.env.npm_package_commit_timestamp
    };

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

  static getLang(lang: string):string {
    if (this.languages.indexOf(lang) > -1) {
      return lang;
    }
    return this.defaultLanguage
  }

}

Config.initialize();
