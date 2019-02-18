/* tslint:disable:member-ordering */
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Config } from '../models/config';
import { TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HeaderService {

  private readonly reloadingSubject: BehaviorSubject<boolean>;

  config: Config = new Config();
  private configSubject: BehaviorSubject<Config>;

// tslint:disable-next-line:member-ordering
  private static KEY_CONFIG_LOCAL_STORAGE = 'config';

  private configUrl = environment.serverUrl + 'monitorStuff/value';

  constructor (private httpClient: HttpClient,
               private _translate: TranslateService) {

    this.reloadingSubject = new BehaviorSubject<boolean>(false);

    this._loadConfig();
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


  toggleShowOnlyPowerfulGear () {
    this.config.showOnlyPowerfulGear = !this.config.showOnlyPowerfulGear;
    this._saveConfig();
  }

  changeLanguage (language: string) {
    this.config.language = language;

    // console.log(this.config.language);
    this._translate.use(this.config.language);

    this._saveConfig();
  }

  toggleSelectedPursuit (key) {
    if (!this.config.selectedPursuits) {
      this.config.selectedPursuits = [];
    }

    const index = this.config.selectedPursuits.indexOf(key);
    if (index > -1) {
      this.config.selectedPursuits.splice(index, 1);
    } else {
      this.config.selectedPursuits.push(key);
    }
    this._saveConfig();
  }


  private _saveConfig () {
    this.configSubject.next(this.config);
    HeaderService._saveConfigToLocalStorage(this.config);
    this._saveConfigToBackend(this.config)
        .catch((err) => {
          console.log(err);
        });
  }

  private _loadConfig () {
    if (!this.config || !this.configSubject) {
      this.config = HeaderService._loadConfigFromLocalStorage();
      this._setLanguageFromConfig();
      if (!this.configSubject) {
        this.configSubject = new BehaviorSubject<Config>(this.config);
      } else {
        this.configSubject.next(this.config);
      }
    }

    this._loadConfigFromBackend()
        .then(config => {
          this.config = config;
          console.log(this.config);
          this._setLanguageFromConfig();
          this.configSubject.next(this.config);
        })
        .catch((err) => {
          console.log(err);
        });
  }

  private _setLanguageFromConfig () {
    if (!this.config.language) {
      this.config.language = this._translate.getBrowserLang();
    }
    this._translate.use(this.config.language);
  }

  private static _saveConfigToLocalStorage (config: Config) {
    localStorage.setItem(HeaderService.KEY_CONFIG_LOCAL_STORAGE, JSON.stringify(config));
  }

  private static _loadConfigFromLocalStorage (): Config {
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

  private _saveConfigToBackend (config: Config): Promise<Config> {
    return new Promise<Config>(((resolve, reject) => {
      this.httpClient.post(this.configUrl, {
        data: config,
        contentType: 'application/json'
      })
          .subscribe(
            (data: Object) => {

              resolve(data as Config);
            },
            err => {
              reject(err);
            }
          );
    }));
  }

  private _loadConfigFromBackend (): Promise<Config> {
    return new Promise<Config>((resolve, reject) => {
      this.httpClient.get(this.configUrl)
          .subscribe(
            (data: Object) => {

              console.log(data);
              resolve(data['data'] as Config);
            },
            err => {
              reject(err);
            }
          );
    });
  }

}
