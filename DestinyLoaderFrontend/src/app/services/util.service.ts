import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UtilService {

  constructor() {
  }

  static updateObject(src: Object, dst: Object, excludedKey: string[] = []) {
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
      if (!excludedKey.includes(key)) {
        if (src[key] instanceof Object) {
          if ((!dst.hasOwnProperty(key)) || (src[key] instanceof Date)) {
            dst[key] = src[key];
          } else {
            if (dst[key] == null) {
              src[key] = null;
            } else {
              UtilService.updateObject(src[key], dst[key], ['pursuits']);
            }
          }
        } else {
          dst[key] = src[key];
          // console.log(key);
        }
      }
    }
  }

  static highlight(string: string, searchText: string, searchRegExp: RegExp): string {
    // this.cptHighlight++;
    // if (this.cptHighlight % 100 === 0) {
    // console.log('highlignt ' + this.cptHighlight + ' (' + this.constructor.name + ')');
    // console.log('highlignt ' + this.cptHighlight + ' (' + this.charNum + '-' + this.pursuit.pursuitNum + ')');
    // }
    if (!searchText || !string) {
      return string;
    }
    // do the highlighting
    return string.replace(searchRegExp, (match: string) => {
      // if (!this.found) {
      //   this.found = true;
      //   this.pursuitMatchSearch.emit({charNum: this.charNum, pursuitNum: this.pursuit.pursuitNum});
      // }
      return '<span class="highlight-text">' + match + '</span>';
    });
  }


}
