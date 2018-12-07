import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root'
})
export class ChecklistService {

  private static checklistList: Object[];

  private static REFRESH_EVERY = 60 * 1000;

  private currentChecklistSubject: BehaviorSubject<Object[]>;

  private checklistUrl = environment.serverUrl + 'monitorstuff/api';

  constructor (private httpClient: HttpClient) {
    this.currentChecklistSubject = new BehaviorSubject<Object[]>([]);


    ChecklistService._refreshChecklist(this);

  }

  /**
   * Refresh characters every...
   * @private
   */
  static _refreshChecklist (_service) {
    _service._loadChecklist()
            .then(checklist => {
              // console.log('currentChecklistSubject.next ' + checklist.length);
              _service.currentChecklistSubject.next(checklist);
              setTimeout(() => {
                  this._refreshChecklist(_service);
                }, ChecklistService.REFRESH_EVERY
              );
            })
            .catch((reason) => {
              console.log(reason);
              setTimeout(() => {
                  this._refreshChecklist(_service);
                }, ChecklistService.REFRESH_EVERY
              );
            });
  }


  /**
   * load the characters list
   */
  _loadChecklist (): Promise<Object[]> {
    // console.log('_loadChecklist ');

    return new Promise<Object[]>((resolve, reject) => {
      this.httpClient.get(this.checklistUrl)
      // .map((res: Response) => res.json().data as Book[])
          .subscribe(
            (data: Object) => {
              // console.log(data);

              // is the token refreshed ?
              if (data['refreshedToken']) {
                UserService.tokenSetter(data['refreshedToken']);
              }
              ChecklistService.checklistList = data['data'];

              resolve(ChecklistService.checklistList);
            },
            err => {
              reject(err);
            },
          );
    });
  }

  /**
   * Subscribe to know if current course changes
   */
  currentChecklistObservable (): Observable<Object[]> {
    return this.currentChecklistSubject;
  }

}
