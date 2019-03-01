import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { BehaviorSubject ,  Observable } from 'rxjs';
import { UserService } from './user.service';
import { HeaderService } from './header.service';
import { Checklist, Objective } from '../models/checklist';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class ChecklistService {

  private static checklists: Checklist;

  private static KEY_CHECKLIST_LOCAL_STORAGE = 'checklist';
  private static REFRESH_EVERY = 60 * 1000;

  private static _refreshIsRunning = false;
  private readonly currentChecklistSubject: BehaviorSubject<Checklist>;

  private checklistUrl = environment.serverUrl + 'monitorStuff/api';
  private runningUrl = environment.serverUrl + 'monitorStuff/running';

  private language = '';

  constructor (private httpClient: HttpClient,
               private _userService: UserService,
               private _headerService: HeaderService,
               private _notificationService: NotificationService) {

    if (ChecklistService._loadChecklistFromLocalStorage()) {
      this.currentChecklistSubject = new BehaviorSubject<Checklist>(ChecklistService._loadChecklistFromLocalStorage());
    } else {
      this.currentChecklistSubject = new BehaviorSubject<Checklist>(new Checklist());
    }

    this._headerService.configObservable().subscribe(
      rel => {
        // console.log(this.language + ' ' + rel.language);
        if (this.language !== rel.language) {
          this.language = rel.language;

          if (this._userService.isAuthent()) {
            this._loadChecklistFromBungie()
                .then(checklist => {
                  // console.log('currentChecklistSubject.next ' + checklist.length);
                  ChecklistService._saveChecklistFromLocalStorage(checklist);
                  this.currentChecklistSubject.next(checklist);
                })
                .catch((reason) => {
                  console.log(reason);
                  this._notificationService.error(reason);
                });
          }

        }
      });
  }

  /**
   * Refresh characters every...
   * @private
   */
  _refreshChecklist (_service: ChecklistService) {
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
                this._notificationService.error(reason);
                setTimeout(() => {
                    this._refreshChecklist(_service);
                  }, ChecklistService.REFRESH_EVERY
                );
              });
    } else {
      ChecklistService._refreshIsRunning = false;
    }
  }


// tslint:disable-next-line:member-ordering
  private static _saveChecklistFromLocalStorage (checklist) {
    localStorage.setItem(ChecklistService.KEY_CHECKLIST_LOCAL_STORAGE, JSON.stringify(checklist));
  }

// tslint:disable-next-line:member-ordering
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
      setTimeout(() => {
          this._refreshChecklist(this);
        }
        , ChecklistService.REFRESH_EVERY);
    }
  }

  /**
   * load the characters list
   */
  _loadChecklistFromBungie (): Promise<Checklist> {
    // console.log('_loadChecklistFromBungie ');

    this._headerService.startReloading();
    return new Promise<Checklist>((resolve, reject) => {
      this.httpClient.get(this.checklistUrl + '?lang=' + this.language)
      // .map((res: Response) => res.json().data as Book[])
          .subscribe(
            (data: Object) => {
              console.log(data);

              // is the token refreshed ?
              if (data['refreshedToken']) {
                UserService.tokenSetter(data['refreshedToken']);
                this._userService.checkAuthent();
              }
              if (data['version']) {
                this._headerService.checkVersion(data['version']);
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


  startObjective (objective: Objective, characterId: string, pursuitId: string): Promise<Objective> {
    return new Promise<Objective>(((resolve, reject) => {
      this.httpClient.post(this.runningUrl, {
        action: 'start',
        characterId: characterId,
        pursuitId: pursuitId,
        objective: objective
      })
          .subscribe(
            (data: Object) => {

              resolve(data as Objective);
            },
            err => {
              this._headerService.stopReloading();
              reject(err);
            }
          );
    }));
  }

  stopObjective (objective: Objective, characterId: string, pursuitId: string): Promise<Objective> {
    return new Promise<Objective>(((resolve, reject) => {
      this.httpClient.post(this.runningUrl, {
        action: 'stop',
        characterId: characterId,
        pursuitId: pursuitId,
        objective: objective
      })
          .subscribe(
            (data: Object) => {
              // console.log(data);

              resolve(data as Objective);
            },
            err => {
              this._headerService.stopReloading();
              reject(err);
            }
          );
    }));
  }


}
