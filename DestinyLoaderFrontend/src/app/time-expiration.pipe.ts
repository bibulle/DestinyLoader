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

  public transform (input: string): string {

    // console.log(input + ' : ' + Number(input));

    // We check the input value of the pipe,
    //     which must be a character string representing a date or a number (representing the delta
    if (!isNaN(Number(input))) {
      // a number (representing the delta in millisecond)
      return TimeExpirationPipe.elapsed(Number(input));
    } else if (new Date(input).toString() !== 'Invalid Date' && !isNaN(Date.parse(input))) {
      // a Date
      return TimeExpirationPipe.elapsed(new Date(input).getTime() - new Date().getTime());
    }

    throw new Error('This pipe only works with strings representing dates or numbers' + input);
  }

  // The string of characters to be transmitted is determined according to the time elapsed since the date passed in parameter of the pipe
  private static elapsed (value: number): string {
    const delta = value / 1000;

    // We format the character string to return
    if (delta <= 0) {
      return ``;
    } else if (delta < 2) {
      return `${Math.floor(delta)} sec.`;
    } else if (delta < 60) {
      return `${Math.floor(delta)} sec.`;
    } else if (delta < 60 * 2) {
      return `${Math.floor(delta / 60)} min.`;
    } else if (delta < 3600) {
      return `${Math.floor(delta / 60)} min.`;
    } else if (delta < 3600 * 2) {
      return `${Math.floor(delta / 3600)} hour`;
    } else if (delta < 86400) {
      return `${Math.floor(delta / 3600)} hours`;
    } else if (delta < 86400 * 2) {
      return `${Math.floor(delta / 3600)} day`;
    } else if (delta < Number.MAX_SAFE_INTEGER/1000) {
      return `${Math.floor(delta / 86400)} days`;
    } else {
      return 'Infinity';
    }
  }
}
