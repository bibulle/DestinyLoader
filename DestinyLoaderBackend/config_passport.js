
var OAuth2Strategy = require('passport-oauth2').Strategy;
var destiny = require("./lib/destiny");


module.exports = function(passport) {


  var oAuth2Strategy = new OAuth2Strategy({
      authorizationURL: 'https://www.bungie.net/fr/OAuth/Authorize',
      tokenURL: 'https://www.bungie.net/Platform/App/OAuth/token/',
      clientID: "21550",
      clientSecret: "qg3ZABhmVMXNS2JBisGO5B-tmWmFZUn00.j2Ju2gRH0",
      callbackURL: "https://lights.bibulle.fr/monitorstuff/login/callback"
    },
    function(accessToken, refreshToken, profile, cb) {
      console.log(accessToken);
      console.log(refreshToken);
      console.log(profile);
      console.log(cb);

      return cb(null, profile);
    }
  );

  oAuth2Strategy.userProfile = function (accesstoken, done) {
    // choose your own adventure, or use the Strategy's oauth client
    destiny.getCurrentUser(accesstoken, done);
  };

  passport.use(oAuth2Strategy);


}
