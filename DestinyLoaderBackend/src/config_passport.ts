import { Destiny } from "./utils/destiny/destiny";
import { User } from "./utils/user";

//const OAuth2Strategy = require('passport-oauth2').Strategy;
const BearerStrategy = require('passport-http-bearer').Strategy;
const BungieOAuth2Strategy = require('passport-bungie-oauth2').Strategy;

const debug = require('debug')('server:debug:config_passport');

module.exports = function (passport) {
  debug('init');

//  const oAuth2Strategy = new OAuth2Strategy({
//      authorizationURL: 'https://www.bungie.net/fr/OAuth/Authorize',
//      tokenURL: 'https://www.bungie.net/Platform/App/OAuth/token/',
//      clientID: "21550",
//      clientSecret: "qg3ZABhmVMXNS2JBisGO5B-tmWmFZUn00.j2Ju2gRH0",
//      callbackURL: "https://lights.bibulle.fr/monitorStuff/login/callback"
//    },
//    function(accessToken, refreshToken, profile, cb) {
//      debug(accessToken);
//      debug(refreshToken);
//      debug(profile);
//      debug(cb);
//
//      return cb(null, profile);
//    }
//  );
//
//  // =========================================================================
//  // oAUTH2 (useful ?) =======================================================
//  // =========================================================================
//
//  oAuth2Strategy.userProfile = function (accesstoken, done) {
//    debug('userProfile');
//    // choose your own adventure, or use the Strategy's oauth client
//    Destiny.getCurrentUser(accesstoken, done);
//  };
//
//  passport.use(oAuth2Strategy);

  // =========================================================================
  // CHECK JWT ===============================================================
  // =========================================================================
  passport.use('jwt-check', new BearerStrategy(
    {
      passReqToCallback: true
    },
    (request, payload, done) => {
      //debug("jwt-check ");

      User.checkToken(payload, function (err, decoded) {
        if (err) {
          //debug(err);
          return done(err);
        }
        request.user = decoded;

        return done(null, request.user);
      })
    })
  );

  // =========================================================================
  // BUNGIE ==================================================================
  // =========================================================================
  passport.use(new BungieOAuth2Strategy({
      clientID: "21550",
      //callbackURL: "https://lights.bibulle.fr/monitorStuff/login/callback",
      callbackURL: "http://localhost:4200/assets/logged.html",
      response_type: "code"
    },
    function (accessToken, refreshToken, profile, done) {
      Destiny.getCurrentUser(accessToken, function (err, user) {
        debug(err);
        debug(user);
        done(err, user);
      });
    }
  ));


};