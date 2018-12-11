import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';

@Injectable({
  providedIn: 'root'
})
export class HeaderService {

  private readonly reloadingSubject: BehaviorSubject<boolean>;

  constructor() {

    this.reloadingSubject = new BehaviorSubject<boolean>(false);

  }

  /**
   * Get the observable on reloading changes
   * @returns {Observable<Boolean>}
   */
  reloadingObservable(): Observable<boolean> {
    return this.reloadingSubject;
  }

  startReloading() {
    this.reloadingSubject.next(true);
  }
  stopReloading() {
    this.reloadingSubject.next(false);
  }
}
