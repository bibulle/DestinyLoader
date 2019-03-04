
import {distinctUntilChanged} from 'rxjs/operators';
import { Injectable } from '@angular/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { User } from '../models/user';
import { environment } from '../../environments/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, timer } from 'rxjs';
import { WindowService } from './window.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private static KEY_TOKEN_LOCAL_STORAGE = 'id_token';
  private static KEY_TOKEN_REQUEST = 'id_token';

  private loggedIn = false;

  private userSubject: BehaviorSubject<User>;

  private user = {} as User;
  private jwtHelper: JwtHelperService = new JwtHelperService();

  private loopCount = 600;
  private intervalLength = 100;

  private windowHandle: any = null;
  private intervalId: any = null;

  constructor (private _http: HttpClient) {
    this.loggedIn = !!UserService.tokenGetter();

    this.userSubject = new BehaviorSubject<User>(this.user);

    this.checkAuthent();

    const timer1 = timer(3 * 1000, 3 * 1000);
    timer1.subscribe(() => {
      this.checkAuthent();
    });
  }


  /**
   * Get token from local storage
   * @returns {string | null}
   */
  public static tokenGetter () {
    // console.log('tokenGetter');
    return localStorage.getItem(UserService.KEY_TOKEN_LOCAL_STORAGE);
  }

  /**
   * Set token to local storage
   * @param {string | null} token
   */
  public static  tokenSetter(token: (string | null)) {
    localStorage.setItem(UserService.KEY_TOKEN_LOCAL_STORAGE, token);
  }

  //noinspection JSUnusedGlobalSymbols
  /**
   * Remove token from local storage
   */
  public static  tokenRemove() {
    localStorage.removeItem(UserService.KEY_TOKEN_LOCAL_STORAGE);
  }

  /**
   * get user message from error
   * @param error
   * @returns string
   * @private
   */
  private static _getMSgFromError(error): string {

    console.error(error);
    // Try to get the content
    try {
      // const data = error.json();
      const data = error;
      if (data && data.error) {
        if (data.error instanceof Array) {
          error = data.error[data.error.length - 1];
        } else if (data.message) {
          error = 'System error : ' + data.message;
        } else {
          error = data.error;
        }
      }
    } catch (er) {
      console.error(er);
    }

    return error.statusText || error.message || error || 'Connection error';
  }

  /**
   * Logout (just remove the JWT token)
   */
  logout() {
    UserService.tokenRemove();
    this.loggedIn = false;
    this.checkAuthent();
  }

  /**
   * Start logging process with google
   */
  startLoginBungie (): Promise<void> {
    // console.log('startLoginBungie');
    const oAuthURL = `${environment.serverUrl}authent/bungie`;
    return this._startLoginOAuth(oAuthURL);

  }

  /**
   * Login with bungie code (and get a JWT token)
   * @param parsed
   * @returns {Promise<void>}
   */
  loginBungie(parsed): Promise<User|string> {
    // console.log("loginBungie "+parsed.code);
    return this._doGet(environment.serverUrl + 'authent/bungie/login?code=' + parsed.code);
  }

  //noinspection JSUnusedGlobalSymbols
  /**
   * Get the observable on user changes
   * @returns {Observable<User>}
   */
  userObservable(): Observable<User> {
    return this.userSubject.pipe(
               // .debounceTime(200)
               distinctUntilChanged(
                 (a, b) => {
                   // console.log(JSON.stringify(a.local));
                   // console.log(JSON.stringify(b.local));
                   return JSON.stringify(a) === JSON.stringify(b);
                 }
               ));
  }

  /**
   * Check authentication locally (is the jwt not expired)
   * @returns {boolean} are we authenticate
   */
  checkAuthent (emitEvent = true): boolean {
    // console.log('checkAuthent');
    let ret = false;

    const jwt = UserService.tokenGetter();

//    const oldUser = this.user;

    if (!jwt || this.jwtHelper.isTokenExpired(jwt)) {
      this.user = {} as User;
    } else {
      this.user = this.jwtHelper.decodeToken(jwt) as User;
      ret = true;
    }

    // console.log(this.user);

    if (emitEvent) {
      this.userSubject.next(this.user);
    }

    return ret;
  }

  /**
   * Is logged ?
   */
  isAuthent (): Boolean {
    // console.log('isAuthent');

    this.checkAuthent();

    return !!(this.user && this.user['bungieNetUser']);

  }
  isAdminAuthent () {
    return this.isAuthent() && this.user.isAdmin;
  }

//  /**
//   * Refresh the JWT token (if user is updated)
//   * @returns {Promise<void>}
//   */
//  refreshUser (): Promise<User | string> {
//    return new Promise<User>((resolve, reject) => {
//      this._http
//          .get(environment.serverUrl + 'authent/user')
//          // .map((res: Response) => res.json().data as User[])
//          .subscribe(
//            (data: Object) => {
//              const user = data['data'] as User;
//              if (user.id) {
//                this.user = user;
//                this.userSubject.next(this.user);
//              }
//              resolve(this.user);
//            },
//            err => {
//              reject(err);
//            },
//          );
//    });
//
//    // return this._doGet(environment.serverUrl + 'authent/refreshToken');
//  }

  /**
   * Start logging process
   * @param oAuthURL
   * @returns {Promise<void>}
   * @private
   */
  private _startLoginOAuth (oAuthURL: string): Promise<void> {
    const oAuthCallbackUrl = '/assets/logged.html';


    return new Promise<void>((resolve, reject) => {
      let loopCount = this.loopCount;
      this.windowHandle = WindowService.createWindow(oAuthURL, 'OAuth2 Login');


      this.intervalId = setInterval(() => {
        let parsed;
        if (loopCount-- < 0) {
          // Too many try... stop it
          clearInterval(this.intervalId);
          this.windowHandle.close();
          this.checkAuthent();
          console.error('Time out : close logging window');
          reject('Time out');
        } else {

          // Read th URL in the window
          let href: string;
          try {
            href = this.windowHandle.location.href;
          } catch (e) {
            console.log('Error:', e);
          }

          if (href != null) {

            // We got an answer...
            // console.log(href);

            // try to find the code
            const reSimple = /[?&](code|access_token)=(.*)/;
            const foundSimple = href.match(reSimple);

            if (foundSimple) {
              clearInterval(this.intervalId);
              this.windowHandle.close();

              parsed = this._parseQueryString(href.replace(new RegExp(`^.*${oAuthCallbackUrl}[?]`), ''));
              // console.log(parsed);

              if (parsed.code) {
                // we got the code... login
                this.loginBungie(parsed)
                    .then(() => {
                      resolve();
                    })
                    .catch(msg => {
                      this.checkAuthent();
                      reject(msg);
                    });
              } else {
                console.error('oAuth callback without and with code...?.. ' + href);
                this.checkAuthent();
                reject('login error');
              }

            } else {
              // http://localhost:3000/auth/callback#error=access_denied
              if (href.indexOf(oAuthCallbackUrl) > 0) {
                // If error
                clearInterval(this.intervalId);
                this.windowHandle.close();
                this.checkAuthent();

                parsed = this._parseQueryString(href.replace(new RegExp(`^.*${oAuthCallbackUrl}[?]`), ''));

                if (parsed.error_message) {
                  reject(parsed.error_message.replace(/[+]/g, ' '));
                } else {
                  reject('Login error');
                }
              }
            }
          }

        }
      }, this.intervalLength);
    });
  }

  /**
   * Perform the login (get after external popup)
   * @param authentUrl
   * @returns {Promise<void>}
   * @private
   */
  private _doGet(authentUrl: string) {
    return new Promise<User|string>((resolve, reject) => {
      this._http
          .get(
            authentUrl,
            {
              headers: new HttpHeaders({
                'Accept': 'application/json',
              })
            }
          )
          // .timeout(3000)
          .toPromise()
          .then(data => {
            // const data = res.json();
            // console.log(data);
            if (data[UserService.KEY_TOKEN_REQUEST]) {
              UserService.tokenSetter(data[UserService.KEY_TOKEN_REQUEST]);
              this.loggedIn = true;
              this.checkAuthent();
              resolve();
            } else if (data['data']) {
              resolve(data['data'] as User);
            } else if (data['newPassword']) {
              resolve(data['newPassword'] as string);
            } else {
              resolve();
            }
          })
          .catch(error => {
            this.checkAuthent();

            const msg = UserService._getMSgFromError(error);
            reject(msg);
          });
    });
  }

  /**
   * Parse a query string (lifted from https://github.com/sindresorhus/query-string)
   * @param str
   * @returns {{}}
   */
  private _parseQueryString(str) {
    // log("_parseQueryString : "+str);
    if (typeof str !== 'string') {
      return {};
    }

    str = str.trim().replace(/^[?#&]/, '');

    if (!str) {
      return {};
    }

    //noinspection TypeScriptValidateJSTypes
    return str.split('&').reduce(function (ret, param) {
      //noinspection TypeScriptValidateJSTypes
      const parts = param.replace(/[+]/g, ' ').split('=');
      // Firefox (pre 40) decodes `%3D` to `=`
      // https://github.com/sindresorhus/query-string/pull/37
      let key = parts.shift();
      let val = parts.length > 0 ? parts.join('=') : undefined;

      key = decodeURIComponent(key);

      // missing `=` should be `null`:
      // http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
      val = val === undefined ? null : decodeURIComponent(val);

      if (!ret.hasOwnProperty(key)) {
        ret[key] = val;
      } else if (Array.isArray(ret[key])) {
        ret[key].push(val);
      } else {
        ret[key] = [ret[key], val];
      }

      return ret;
    }, {});
  }

}
