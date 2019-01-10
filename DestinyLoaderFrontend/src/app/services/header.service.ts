import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import { Config } from '../models/config';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class HeaderService {

  private readonly reloadingSubject: BehaviorSubject<boolean>;

  config: Config = new Config();
  private readonly configSubject: BehaviorSubject<Config>;

// tslint:disable-next-line:member-ordering
  private static KEY_CONFIG_LOCAL_STORAGE = 'config';


  constructor (private _translate: TranslateService) {

    this.reloadingSubject = new BehaviorSubject<boolean>(false);


    this.config = HeaderService.loadConfigFromLocalStorage();
    if (!this.config.language) {
      this.config.language = this._translate.getBrowserLang();
    }
    // console.log(this.config.language);
    this._translate.use(this.config.language);

    this.configSubject = new BehaviorSubject<Config>(this.config);

  }

  // Reloading management
  reloadingObservable (): Observable<boolean> {
    return this.reloadingSubject;
  }

  startReloading () {
    this.reloadingSubject.next(true);
  }

  stopReloading () {
    this.reloadingSubject.next(false);
  }

  // Configuration management
  configObservable (): Observable<Config> {
    return this.configSubject;
  }

// tslint:disable-next-line:member-ordering
  static saveConfigFromLocalStorage (config: Config) {
    localStorage.setItem(HeaderService.KEY_CONFIG_LOCAL_STORAGE, JSON.stringify(config));
  }

// tslint:disable-next-line:member-ordering
  static loadConfigFromLocalStorage (): Config {
    try {
      const ret: Config = JSON.parse(localStorage.getItem(HeaderService.KEY_CONFIG_LOCAL_STORAGE));
      if (ret) {
        return ret;
      } else {
        return new Config();
      }
    } catch {
      return new Config();
    }
  }

  toggleShowOnlyPowerfulGear() {
    this.config.showOnlyPowerfulGear = !this.config.showOnlyPowerfulGear;
    this.configSubject.next(this.config);
    HeaderService.saveConfigFromLocalStorage(this.config);
  }

  changeLanguage(language: string) {
    this.config.language = language;

    // console.log(this.config.language);
    this._translate.use(this.config.language);

    this.configSubject.next(this.config);
    HeaderService.saveConfigFromLocalStorage(this.config);
  }



}
