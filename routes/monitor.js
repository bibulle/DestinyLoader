var logger = require("logger");
var express = require('express');
var router = express.Router();
var destiny = require("destiny");

module.exports = function authentRouter(passport) {

  router.route('/login')
    .get(function (request, response, next) {
      logger.info("GET /login");
      passport.authenticate(
        'oauth2',
        {session: true},
        function (err, user, info) {
          logger.info(err);
          logger.info(user);
          logger.info(info);
        })(request, response, next)
    });

  router.route('/login/callback')
    .get(function (request, response, next) {
      logger.info("GET /login/callback");

      passport.authenticate(
        'oauth2',
        {failureRedirect: '/login'},
        function (err, user, info) {
          console.log(err);
          console.log(user);
          console.log(info);

          // Successful authentication, redirect home.
          response.redirect('/monitorstuff');
        })(request, response, next)
    });

  return router;
}