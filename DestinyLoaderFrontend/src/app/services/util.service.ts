import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UtilService {

  constructor () {
  }

  static updateObject(src: Object, dst: Object) {

    if ((src instanceof Array) && (dst instanceof Array)) {
      while (src.length < dst.length) {
        dst.splice(-1, 1);
      }
    } else {
      for (const key of Object.keys(dst)) {
        if (!src.hasOwnProperty(key)) {
          delete dst[key];
        }
      }
    }

    for (const key of Object.keys(src)) {
      if (src[key] instanceof Object) {
        if ((!dst.hasOwnProperty(key)) || (src[key] instanceof Date)) {
          dst[key] = src[key];
        } else {
          UtilService.updateObject(src[key], dst[key]);
        }
      } else {
        dst[key] = src[key];
        // console.log(key);
      }
    }
  }


}
