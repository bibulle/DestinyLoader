import * as _ from "lodash";
import { sign, verify } from "jsonwebtoken";
import { refreshBungieToken } from "../routes/authent";
import { Destiny } from "../utils/destiny/destiny";

// noinspection JSUnusedLocalSymbols
const debug = require('debug')('server:debug:user');


export class User {

  id: string;

  bungieNetUser: {
    membershipId: string;
    displayName: string;
  };

  isAdmin: boolean;


  /**
   * Create e JWT token
   * @param user
   * @returns {string|void}
   */
  static createToken (user): string {
    //debug(user);
    let sendUser: any = _.pick(user, ['destinyMemberships', 'bungieNetUser', 'auth', 'isAdmin']);
    sendUser.tokenDate = new Date();

    return sign(sendUser, "myReallySecret", {expiresIn: "14d"});
  }


  /**
   * Check token
   * @param token
   * @param done callback (err, user)
   */
  static checkToken (token, done: (err: Error, user: User) => any): void {
    //debug('checkToken');
    return verify(token, "myReallySecret", (err, decoded) => {
      if (err) {
        return done(err, null);
      }

      const tokenAge = new Date().getTime() - new Date(decoded.tokenDate).getTime();
      // if it's more than 5 minutes, refresh it
      if (tokenAge > 5 * 60 * 1000) {
        Destiny.getTokenUrl((err, url) => {
          if (err) {
            return done(err, null);
          }
          refreshBungieToken(url, decoded.auth.refresh_token,
            (err, refreshed_auth) => {
              if (err) {
                return done(err, null);
              } else {
                decoded.auth = refreshed_auth;
                decoded.refreshedToken = User.createToken(decoded);

                return done(null, decoded);
              }
            })
        });
      } else {
        return done(null, decoded);
      }
    });
  }

}
