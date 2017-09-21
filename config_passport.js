
var OAuth2Strategy = require('passport-oauth2').Strategy;


module.exports = function(passport) {


  passport.use(new OAuth2Strategy({
      authorizationURL: 'https://www.bungie.net/fr/OAuth/Authorize',
      tokenURL: 'https://www.bungie.net/Platform/App/GetAccessTokensFromCode/',
      clientID: "21550",
      clientSecret: "qg3ZABhmVMXNS2JBisGO5B-tmWmFZUn00.j2Ju2gRH0",
      callbackURL: "http://localhost:3000/auth/example/callback"
    },
    function(accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ exampleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  ));


}