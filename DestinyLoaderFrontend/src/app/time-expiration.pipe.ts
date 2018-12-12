/* tslint:disable:member-ordering */
import { Pipe, PipeTransform } from '@angular/core';
import 'rxjs-compat/add/operator/repeatWhen';
import 'rxjs-compat/add/operator/mergeMap';
import 'rxjs-compat/add/observable/timer';
import 'rxjs-compat/add/operator/takeWhile';
import 'rxjs-compat/add/operator/map';
import 'rxjs-compat/add/observable/of';

/**
 * time expiration pipe
 * inspired by : https://awesome-angular.developpez.com/tutoriels/angular-pipes/
 */
@Pipe({
  name: 'timeExpiration',
})
export class TimeExpirationPipe implements PipeTransform {

  public transform (sinceDate: string): string {

    // We check the input value of the pipe, which must be a character string representing a date
    if (new Date(sinceDate).toString() === 'Invalid Date' || isNaN(Date.parse(sinceDate))) {
      throw new Error('This pipe only works with strings representing dates ' + sinceDate);
    }

    return TimeExpirationPipe.elapsed(new Date(sinceDate));
  }

  // The string of characters to be transmitted is determined according to the time elapsed since the date passed in parameter of the pipe
  private static elapsed (value: Date): string {
    // We retrieve the current date to calculate the elapsed time
    const now = new Date().getTime();

    // The delta is calculated in seconds between the current date and the date passed in parameter of the pipe
    const delta = (value.getTime() - now) / 1000;

    // We format the character string to return
    if (delta < 0) {
      return ``;
    } else if (delta < 2) {
      return `${Math.floor(delta)} second`;
    } else if (delta < 60) {
      return `${Math.floor(delta)} seconds`;
    } else if (delta < 60 * 2) {
      return `${Math.floor(delta / 60)} minute`;
    } else if (delta < 3600) {
      return `${Math.floor(delta / 60)} minutes`;
    } else if (delta < 3600 * 2) {
      return `${Math.floor(delta / 3600)} hour`;
    } else if (delta < 86400) {
      return `${Math.floor(delta / 3600)} hours`;
    } else if (delta < 86400 * 2) {
      return `${Math.floor(delta / 3600)} day`;
    } else {
      return `${Math.floor(delta / 86400)} days`;
    }
  }
}
