import { Injectable } from '@angular/core';
import { Router, CanActivate } from '@angular/router';
import { UserService } from '../../services/user.service';
import { async } from 'rxjs/internal/scheduler/async';

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
      }

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

    });

  }
}
