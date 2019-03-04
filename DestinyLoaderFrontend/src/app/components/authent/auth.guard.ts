import { Injectable } from '@angular/core';
import { Router, CanActivate } from '@angular/router';
import { UserService } from '../../services/user.service';

@Injectable()
export class AuthGuard implements CanActivate {

  constructor (private _router: Router,
               private _userService: UserService) {
  }

  canActivate (): Promise<boolean> {

    // console.log('canActivate');

    return new Promise<boolean>((resolve, reject) => {
      if (this._userService.isAuthent()) {
        // console.log('canActivate true');
        resolve(true);
      } else {
        // not logged in so try to login
        this._userService.startLoginBungie()
            .then(() => {
              // console.log('then OK');
              resolve(true);
            })
            .catch((reason) => {
              console.log(reason);
              reject(reason);
            });
      }


    });

  }
}

@Injectable()
export class AuthGuardAdmin implements CanActivate {

  constructor (private _router: Router,
               private _userService: UserService) {
  }

  canActivate (): Promise<boolean> {


    // console.log('canActivate AuthGuardAdmin');

    return new Promise<boolean>((resolve, reject) => {
      if (this._userService.isAdminAuthent()) {
        // console.log('canActivate true');
        resolve(true);
      } else {
        reject('You are not an administrator');
      }


    });

  }
}
