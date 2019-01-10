import { Router, Response, Request, NextFunction } from "express";
import { User } from "../models/user";
import { Destiny } from "../utils/destiny/destiny";
import { Config } from "../utils/config/config";

const https = require('https');

let debug = require('debug')('server:routes:debug:authentication');
let error = require('debug')('server:routes:error:authentication');

function authenticationRouter (passport) {
  const router: Router = Router();

  router.route('/bungie')
        // ====================================
        // route for sending our user to Bungie to authenticate
        // ====================================
        .get((request: Request, response: Response, next: NextFunction) => {
          debug("GET /bungie");
          passport.authenticate(['bungie-oauth2'], {grant_type: 'authorization_code'}, (err): any => {
            if (err) {
              return next(err);
            }
          })(request, response, next);
        });

  router.route('/bungie/login')
        // ====================================
        // route to get a jwt token for a Bungie authenticate user
        // ====================================
        .get((request: Request, response: Response) => {
          debug("GET /bungie/login");

          if (!request.query || !request.query.code) {
            return response.status(500).send("no code");

          }

          const code = request.query.code;

          // We've got the code, get the authentication stuff
          Destiny.getTokenUrl(function (err, url) {

            getBungieToken(url, code,
              (err, auth_val) => {
                if (err) {
                  return response.status(500).send(err);
                }

                // Create the user
                //debug(JSON.stringify(val, null, 2));
                let user = {auth: auth_val};

                // fill it
                Destiny.getCurrentUser(user, function (err, data) {
                  if (err) return response.status(500).send(err);

                  user['destinyMemberships'] = data.destinyMemberships;
                  user['bungieNetUser'] = data.bungieNetUser;

                  request.session.user = user;
                  // debug(user);

                  debug("201 : token created(" + user['bungieNetUser']['displayName'] + ")");
                  return response.status(201).send({
                    id_token: User.createToken(user)
                  });

                });

              }
            );


          });
        });

  return router;
}

export { authenticationRouter, refreshBungieToken };


function getBungieToken (url, code, callback) {
  // debug("getBungieToken");

  let postData = "grant_type=authorization_code&code=" + code + "";
  return (_getBungieToken(url, postData, callback))
}

function refreshBungieToken (url, refresh_token, callback) {
  // debug("refreshBungieToken");

  let postData = "grant_type=refresh_token&refresh_token=" + refresh_token + "";
  return (_getBungieToken(url, postData, callback))
}

function _getBungieToken (url, postData, callback) {
  // debug("_getBungieToken");

  // build the request
  let options = {
    hostname: 'www.bungie.net',
    port: 443,
    path: url,
    headers: {
      'Authorization': 'Basic ' + Buffer.from(Config.oAuthClientId + ":" + Config.oAuthClientSecret).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': postData.length
    },
    method: 'POST'
  };

  //debug(JSON.stringify(options, null, 2));
  //debug(JSON.stringify(postData, null, 2));

  // Launch the request
  const req = https.request(options, function (res) {
    //debug("statusCode: ", res.statusCode);
    //debug("headers: ", res.headers);
    //debug(res);

    let content = '';

    // get the result
    res.on('data', function (d) {
      //debug("data");
      //debug(d.toString());
      content += d.toString();
    });
    res.on('end', function () {
      //debug('end');
      //debug(d);

      let val;

      try {
        //debug('end : '+content);
        val = JSON.parse(content);
      } catch (e) {
        //error(content);
        error("Error in getting Bungie data : " + e + 'from ' + url);
        return callback(e);
      }

      if (val.error) {
        error(JSON.stringify(val, null, 2));
        error("Error in reading Bungie data : " + val.error_description);
        return callback("Error in reading Bungie data : " + val.error_description);
      }

      callback(null, val);

    })
  });

  req.write(postData);
  req.end();

  req.on('error', function (e) {
    error("Error in connecting Bungie : " + e);
    error(e);

    return callback("Error in connecting Bungie : " + e);
  });
}