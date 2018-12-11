import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import { UserService } from './user.service';
import { HeaderService } from './header.service';

@Injectable({
  providedIn: 'root'
})
export class ChecklistService {

  private static checklists: Object;

  private static KEY_CHECKLIST_LOCAL_STORAGE = 'checklist';
  private static REFRESH_EVERY = 60 * 1000;

  private readonly currentChecklistSubject: BehaviorSubject<Object>;

  private checklistUrl = environment.serverUrl + 'monitorstuff/api';

  constructor (private httpClient: HttpClient,
               private _userService: UserService,
               private _headerService: HeaderService) {

    if (ChecklistService._loadChecklistFromLocalStorage()) {
      this.currentChecklistSubject = new BehaviorSubject<Object>(ChecklistService._loadChecklistFromLocalStorage());
    } else {
      this.currentChecklistSubject = new BehaviorSubject<Object>({});
    }


    ChecklistService._refreshChecklist(this);

  }

  /**
   * Refresh characters every...
   * @private
   */
  static _refreshChecklist (_service) {
    _service._loadChecklistFromBungie()
            .then(checklist => {
              // console.log('currentChecklistSubject.next ' + checklist.length);
              ChecklistService._saveChecklistFromLocalStorage(checklist);
              _service.currentChecklistSubject.next(checklist);
              setTimeout(() => {
                  this._refreshChecklist(_service);
                }
                , ChecklistService.REFRESH_EVERY);
            })
            .catch((reason) => {
              console.log(reason);
              setTimeout(() => {
                  this._refreshChecklist(_service);
                }, ChecklistService.REFRESH_EVERY
              );
            });
  }


  private static _saveChecklistFromLocalStorage (checklist) {
    localStorage.setItem(ChecklistService.KEY_CHECKLIST_LOCAL_STORAGE, JSON.stringify(checklist));
  }

  private static _loadChecklistFromLocalStorage (): any {
    try {
      return JSON.parse(localStorage.getItem(ChecklistService.KEY_CHECKLIST_LOCAL_STORAGE));
    } catch {
      return {};
    }
  }

  /**
   * load the characters list
   */
  _loadChecklistFromBungie (): Promise<Object> {
    // console.log('_loadChecklistFromBungie ');

    this._headerService.startReloading();
    return new Promise<Object>((resolve, reject) => {
      this.httpClient.get(this.checklistUrl)
      // .map((res: Response) => res.json().data as Book[])
          .subscribe(
            (data: Object) => {
              // console.log(data);

              // is the token refreshed ?
              if (data['refreshedToken']) {
                UserService.tokenSetter(data['refreshedToken']);
                this._userService.checkAuthent();
              }
              ChecklistService.checklists = data['data'];

              this._headerService.stopReloading();
              resolve(ChecklistService.checklists);
            },
            err => {
              this._headerService.stopReloading();
              reject(err);
            },
          );
    });
  }

  /**
   * Subscribe to know if current course changes
   */
  currentChecklistObservable (): Observable<Object> {
    return this.currentChecklistSubject;
  }


}
