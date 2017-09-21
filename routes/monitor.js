var express = require('express');
var router = express.Router();

module.exports = function authentRouter(passport) {

  router.route('/login')
    .get(function (request, response, next) {
      console.log("GET /login");
      passport.authenticate(
        'oauth2',
        {session: false},
        function (err, user, info) {
          console.log(err);
          console.log(user);
          console.log(info);
        })(request, response, next)
    });

  router.route('/login/callback')
    .get(function (request, response, next) {
      passport.authenticate(
        'oauth2',
        {failureRedirect: '/login'},
        function (req, res) {

          // Successful authentication, redirect home.
          res.redirect('/monitorstuff');
        })(request, response, next)
    });

  return router;
}