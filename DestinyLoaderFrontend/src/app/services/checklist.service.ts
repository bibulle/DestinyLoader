/* tslint:disable:member-ordering */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
// import { environment } from '../../environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';
import { UserService } from './user.service';
import {HeaderService, ReloadingKey} from './header.service';
import { Checklist, Objective, ObjectiveTime } from '../models/checklist';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class ChecklistService {

  // CHECKLIST
  private static checklists: Checklist;

  private static KEY_CHECKLIST_LOCAL_STORAGE = 'checklist';
  private static REFRESH_CHECKLIST_EVERY = 60 * 1000;

  private static _refreshChecklistIsRunning = false;
  private readonly currentChecklistSubject: BehaviorSubject<Checklist>;

  // OBJECTIVE TIMES
  private static objectiveTimes: ObjectiveTime[];

  private static REFRESH_OBJECTIVE_TIME_EVERY = 60 * 1000;
  private static _refreshObjectiveTimesIsRunning = false;
  private readonly currentObjectiveTimesSubject: BehaviorSubject<ObjectiveTime[]>;

//  private checklistUrl = environment.serverUrl + 'monitorStuff/api';
//  private runningUrl = environment.serverUrl + 'monitorStuff/running';
  private checklistUrl = '/monitorStuff/api';
  private runningUrl =  '/monitorStuff/running';
  private setTagUrl =  '/monitorStuff/tag';

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

    this.currentObjectiveTimesSubject = new BehaviorSubject<ObjectiveTime[]>([]);

    this._headerService.configObservable().subscribe(
      rel => {
        // console.log(this.language + ' ' + rel.language);
        if (this.language !== rel.language) {
          this.language = rel.language;

//          if (this._userService.isAuthent()) {
//            this._loadChecklistFromBungie()
//                .then(checklist => {
//                  // console.log('currentChecklistSubject.next ' + checklist.length);
//                  ChecklistService._saveChecklistFromLocalStorage(checklist);
//                  this.currentChecklistSubject.next(checklist);
//                })
//                .catch((reason) => {
//                  console.log(reason);
//                  this._notificationService.error(reason);
//                });
//          }

        }
      });
  }


// tslint:disable-next-line:member-ordering
  static saveChecklistFromLocalStorage (checklist) {
    localStorage.setItem(ChecklistService.KEY_CHECKLIST_LOCAL_STORAGE, JSON.stringify(checklist));
    console.log('Storage used by checklist : ' + (localStorage.getItem(ChecklistService.KEY_CHECKLIST_LOCAL_STORAGE).length * 2 / 1024 / 1024).toFixed(2) + 'Mb');
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
    // console.log('startLoadingChecklist');
    if (!ChecklistService._refreshChecklistIsRunning) {
      setTimeout(() => {
          this.refreshChecklist(this);
        }
        , ChecklistService.REFRESH_CHECKLIST_EVERY);
    }
  }

  /**
   * Refresh characters every...
   * @private
   */
  refreshChecklist (_service: ChecklistService, once = false) {
    // console.log('refreshChecklist');
    if (_service.currentChecklistSubject.observers.length > 0) {
      ChecklistService._refreshChecklistIsRunning = true;
      _service._loadChecklistFromBungie()
              .then(checklist => {
                // console.log('currentChecklistSubject.next ' + checklist.length);
                // ChecklistService._saveChecklistFromLocalStorage(checklist);
                _service.currentChecklistSubject.next(checklist);
                if (!once) {
                  setTimeout(() => {
                      this.refreshChecklist(_service);
                    }
                    , ChecklistService.REFRESH_CHECKLIST_EVERY);
                }
              })
              .catch((reason) => {
                console.log(reason);
                this._notificationService.error(reason);
                if (!once) {
                  setTimeout(() => {
                      this.refreshChecklist(_service);
                    }
                    , ChecklistService.REFRESH_CHECKLIST_EVERY);
                }
              });
    } else {
      ChecklistService._refreshChecklistIsRunning = false;
    }
  }

  /**
   * load the characters list
   */
  _loadChecklistFromBungie (): Promise<Checklist> {
    // console.log('_loadChecklistFromBungie ');

    this._headerService.startReloading(ReloadingKey.Checklist);
    return new Promise<Checklist>((resolve, reject) => {
      this.httpClient.get(this.checklistUrl + '?lang=' + this.language)
      // .map((res: Response) => res.json().data as Book[])
          .subscribe(
            (data: Object) => {
              // console.log(data);

              // is the token refreshed ?
              if (data['refreshedToken']) {
                UserService.tokenSetter(data['refreshedToken']);
                this._userService.checkAuthent();
              }
              if (data['version']) {
                this._headerService.checkVersion(data['version']);
              }
              ChecklistService.checklists = data['data'];

              this._headerService.stopReloading(ReloadingKey.Checklist);
              resolve(ChecklistService.checklists);
            },
            err => {
              this._headerService.stopReloading(ReloadingKey.Checklist);
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

  setTag(key: string, tags: string[]) {
    return new Promise<Checklist>((resolve, reject) => {
      this.httpClient.post(this.setTagUrl, {
        key: key,
        tags: tags
      }).subscribe(
        (data: Object) => {
          // console.log(data);

          // is the token refreshed ?
          if (data['refreshedToken']) {
            UserService.tokenSetter(data['refreshedToken']);
            this._userService.checkAuthent();
          }
          if (data['version']) {
            this._headerService.checkVersion(data['version']);
          }
          ChecklistService.checklists = data['data'];

          resolve(ChecklistService.checklists);
        },
        err => {
          this._headerService.stopReloading(ReloadingKey.Checklist);
          reject(err);
        },
      );

    });
  }


    startObjective (objective: Objective, characterId: string, characterName: string, pursuitId: string, pursuitName: string): Promise<Objective> {
    return new Promise<Objective>(((resolve, reject) => {
      this.httpClient.post(this.runningUrl, {
        action: 'start',
        characterId: characterId,
        characterName: characterName,
        pursuitId: pursuitId,
        pursuitName: pursuitName,
        objective: objective
      })
          .subscribe(
            (data: Object) => {

              resolve(data as Objective);
            },
            err => {
              // this._headerService.stopReloading();
              reject(err);
            }
          );
    }));
  }

  stopObjective (objective: Objective, characterId: string, pursuitId: string): Promise<Objective> {
    return new Promise<Objective>((resolve, reject) => {
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
              // this._headerService.stopReloading();
              reject(err);
            }
          );
    });
  }

  deleteObjectiveTime (objectiveTime: ObjectiveTime): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.httpClient.post(this.runningUrl, {
        action: 'delete',
        objectiveTime: objectiveTime
      })
          .subscribe(
            () => {
              this.refreshObjectiveTimes(this, true);
              resolve();
            },
            err => {
              console.log(err);


              this._notificationService.error(err);

              reject(err);
            }
          );

    });
  }


  /**
   * Initialize the loading of stats
   */
  startLoadingObjectiveTimes () {
    // console.log('startLoadingObjectiveTimes');
    if (!ChecklistService._refreshObjectiveTimesIsRunning) {
      setTimeout(() => {
          this.refreshObjectiveTimes(this);
        }
        , ChecklistService.REFRESH_OBJECTIVE_TIME_EVERY);
    }
  }

  /**
   * Refresh characters every...
   * @private
   */
  refreshObjectiveTimes (_service: ChecklistService, once = false) {
    // console.log('refreshObjectiveTimes');
    if (_service.currentObjectiveTimesSubject.observers.length > 0) {
      ChecklistService._refreshObjectiveTimesIsRunning = true;
      _service._loadObjectiveTimesFromBackend()
              .then(objectiveTimes => {
                // console.log('currentObjectiveTimesSubject.next ' + objectiveTimes.length);
                _service.currentObjectiveTimesSubject.next(objectiveTimes);
                if (!once) {
                  setTimeout(() => {
                      this.refreshObjectiveTimes(_service);
                    }
                    , ChecklistService.REFRESH_OBJECTIVE_TIME_EVERY);
                }
              })
              .catch((reason) => {
                console.log(reason);
                this._notificationService.error(reason);
                if (!once) {
                  setTimeout(() => {
                      this.refreshObjectiveTimes(_service);
                    }
                    , ChecklistService.REFRESH_OBJECTIVE_TIME_EVERY);
                }
              });
    } else {
      ChecklistService._refreshObjectiveTimesIsRunning = false;
    }
  }

  /**
   * load the characters list
   */
  _loadObjectiveTimesFromBackend (): Promise<ObjectiveTime[]> {
    // console.log('_loadObjectiveTimesFromBackend ');

    this._headerService.startReloading(ReloadingKey.ObjectiveTimes);
    return new Promise<ObjectiveTime[]>((resolve, reject) => {
      this.httpClient.get(this.runningUrl + '?lang=' + this.language)
      // .map((res: Response) => res.json().data as Book[])
          .subscribe(
            (data: Object) => {
              // console.log(data);

              // is the token refreshed ?
              if (data['refreshedToken']) {
                UserService.tokenSetter(data['refreshedToken']);
                this._userService.checkAuthent();
              }
              if (data['version']) {
                this._headerService.checkVersion(data['version']);
              }
              ChecklistService.objectiveTimes = data['data'].currentTimes;

              this._headerService.stopReloading(ReloadingKey.ObjectiveTimes);
              resolve(ChecklistService.objectiveTimes);
            },
            err => {
              this._headerService.stopReloading(ReloadingKey.ObjectiveTimes);
              reject(err);
            },
          );
    });
  }

  /**
   * Subscribe to know if current objectiveTimes changes
   */
  currentObjectiveTimesObservable (): Observable<ObjectiveTime[]> {
    return this.currentObjectiveTimesSubject;
  }

}
