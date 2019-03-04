import { Destiny } from "./utils/destiny/destiny";
import { User } from "./models/user";

//const OAuth2Strategy = require('passport-oauth2').Strategy;
const BearerStrategy = require('passport-http-bearer').Strategy;
const BungieOAuth2Strategy = require('passport-bungie-oauth2').Strategy;

const debug = require('debug')('server:debug:config_passport');

module.exports = function (passport) {
  debug('init');


  // =========================================================================
  // CHECK JWT ===============================================================
  // =========================================================================
  //noinspection TypeScriptValidateJSTypes
  passport.use('jwt-check', new BearerStrategy(
    {
      passReqToCallback: true
    },
    (request, payload, done) => {
      // debug("jwt-check ");


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
  //noinspection TypeScriptValidateJSTypes
  passport.use(new BungieOAuth2Strategy({
      clientID: "21550",
      //callbackURL: "https://lights.bibulle.fr/monitorStuff/login/callback",
      //callbackURL: "http://localhost:4200/assets/logged.html",
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
