import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import { UserService } from './user.service';
import { HeaderService } from './header.service';
import { Checklist } from '../models/checklist';

@Injectable({
  providedIn: 'root'
})
export class ChecklistService {

  private static checklists: Checklist;

  private static KEY_CHECKLIST_LOCAL_STORAGE = 'checklist';
  private static REFRESH_EVERY = 60 * 1000;

  private static _refreshIsRunning = false;
  private readonly currentChecklistSubject: BehaviorSubject<Checklist>;

  private checklistUrl = environment.serverUrl + 'monitorstuff/api';

  constructor (private httpClient: HttpClient,
               private _userService: UserService,
               private _headerService: HeaderService) {

    if (ChecklistService._loadChecklistFromLocalStorage()) {
      this.currentChecklistSubject = new BehaviorSubject<Checklist>(ChecklistService._loadChecklistFromLocalStorage());
    } else {
      this.currentChecklistSubject = new BehaviorSubject<Checklist>(new Checklist());
    }

  }

  /**
   * Refresh characters every...
   * @private
   */
  static _refreshChecklist (_service: ChecklistService) {
    if (_service.currentChecklistSubject.observers.length > 0) {
      ChecklistService._refreshIsRunning = true;
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
    } else {
      ChecklistService._refreshIsRunning = false;
    }
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
   * Initialize the loading of stats
   */
  startLoadingChecklist () {
    if (!ChecklistService._refreshIsRunning) {
      ChecklistService._refreshChecklist(this);
    }
  }

  /**
   * load the characters list
   */
  _loadChecklistFromBungie (): Promise<Checklist> {
    // console.log('_loadChecklistFromBungie ');

    this._headerService.startReloading();
    return new Promise<Checklist>((resolve, reject) => {
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
  currentChecklistObservable (): Observable<Checklist> {
    return this.currentChecklistSubject;
  }


}
