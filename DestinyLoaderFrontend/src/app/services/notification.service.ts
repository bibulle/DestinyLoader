import {Injectable} from '@angular/core';
import {MatSnackBar, MatSnackBarConfig} from '@angular/material';
import {UserService} from './user.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  constructor(public _snackBar: MatSnackBar,
              private _userService: UserService) {
  }

  //noinspection JSUnusedGlobalSymbols
  message(message: string) {
    // console.log(message);
    this._display(message, 5000, ['message']);
  }

  //noinspection JSUnusedGlobalSymbols
  info(message: string) {
    console.log(message);
    this._display(message, 5000, null);
  }

  //noinspection JSUnusedGlobalSymbols
  warn(message: string) {
    console.warn(message);
    this._display(message, 5000, ['warn']);
  }

  error(err: string) {

    console.error(err);
    const message = this._extractMessage(err);
    console.error(message);
    this._display(message, 5000, ['error']);
  }

  _display(message: string, duration: number, extraClasses: [string]) {

    const config = new MatSnackBarConfig();
    config.duration = duration;
    config.panelClass = extraClasses;

    this._snackBar.open(message, null, config);
  }

  _extractMessage(err: any) {
    let message = err.statusText || err;
    if (err['_body']) {
      const error = JSON.parse(err['_body']);
      console.log(error);
      if ( error.error && error.error.name === 'JsonWebTokenError') {
        this._userService.logout();
      }

      message = error.message || message;
    }

    return message;
  }
}
