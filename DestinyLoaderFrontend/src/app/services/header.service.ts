/* tslint:disable:member-ordering */
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Config, Search } from '../models/config';
import { TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { NotificationService } from './notification.service';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root'
})
export class HeaderService {

  private readonly searchSubject: BehaviorSubject<Search>;
  private readonly reloadingSubject: BehaviorSubject<boolean>;
  private readonly versionSubject: BehaviorSubject<boolean>;

  config: Config;
  private configSubject: BehaviorSubject<Config>;

// tslint:disable-next-line:member-ordering
  private static KEY_CONFIG_LOCAL_STORAGE = 'config';

  private configUrl = environment.serverUrl + 'monitorStuff/value';

  constructor (private httpClient: HttpClient,
               private _translateService: TranslateService,
               private _notificationService: NotificationService,
               private _userService: UserService) {

    this.searchSubject = new BehaviorSubject<Search>(new Search());
    this.reloadingSubject = new BehaviorSubject<boolean>(false);
    this.versionSubject = new BehaviorSubject<boolean>(false);

    this._loadConfig();
  }

  // Search management
  searchObservable (): Observable<Search> {
    return this.searchSubject;
  }
  setSearch(search: string) {
    // console.log(search + ' - ' + this.searchSubject.getValue().searchText);
    if (search !== this.searchSubject.getValue().searchText) {
      this.searchSubject.next({
        shown: this.searchSubject.getValue().shown,
        searchText: search,
        foundCount: 0,
        foundCurrent: 0
      });
    }
  }
  setSearchNext() {
    this.searchSubject.next({
      shown: this.searchSubject.getValue().shown,
      searchText: this.searchSubject.getValue().searchText,
      foundCount: this.searchSubject.getValue().foundCount,
      foundCurrent: this.searchSubject.getValue().foundCurrent + 1
    });
  }
  setSearchFoundCount(count) {
    this.searchSubject.next({
      shown: this.searchSubject.getValue().shown,
      searchText: this.searchSubject.getValue().searchText,
      foundCount: count,
      foundCurrent: this.searchSubject.getValue().foundCurrent
    });
  }
  setSearchShown(shown: boolean) {
    this.searchSubject.next({
      shown: shown,
      searchText: (shown ? this.searchSubject.getValue().searchText : ''),
      foundCount: (shown ? this.searchSubject.getValue().foundCount : 0),
      foundCurrent: (shown ? this.searchSubject.getValue().foundCurrent : 0)
    });
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
    this.saveConfig(this.config);
  }

  changeLanguage (language: string) {
    // this.setSearch('');
    this.config.language = language;

    // console.log(this.config.language);
    this._translateService.use(this.config.language);

    this.saveConfig(this.config);
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
    this.saveConfig(this.config);
  }


  saveConfig (config) {
    this.config = config;
    this.configSubject.next(this.config);
    HeaderService._saveConfigToLocalStorage(this.config);
    this._saveConfigToBackend(this.config)
        .catch((err) => {
          console.log(err);
        });
  }

  private _loadConfig () {
    if (!this.config || !this.configSubject) {
      this.config = new Config();
      this.config = {...this.config, ...HeaderService._loadConfigFromLocalStorage()};
      this.config.visible = {...new Config().visible, ...this.config.visible};
      this._setLanguageFromConfig();
      if (!this.configSubject) {
        this.configSubject = new BehaviorSubject<Config>(this.config);
      } else {
        this.configSubject.next(this.config);
      }
    }

    this._loadConfigFromBackend()
        .then(config => {
          if (!config.language && !config.selectedPursuits) {
            let newConfig = new Config();
            newConfig = {...newConfig, ...HeaderService._loadConfigFromLocalStorage()};
            newConfig.visible = {...new Config().visible, ...newConfig.visible};
            this.saveConfig(newConfig);
          } else {
            this.config = new Config();
            this.config = {...this.config, ...config};
            this.config.visible = {...new Config().visible, ...this.config.visible};
            // console.log(this.config);
            this._setLanguageFromConfig();
            this.configSubject.next(this.config);
          }
        })
        .catch((err) => {
          console.log(err);
        });
  }

  private _setLanguageFromConfig () {
    if (!this.config.language) {
      this.config.language = this._translateService.getBrowserLang();
    }
    this._translateService.use(this.config.language);
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

              // console.log(data);
              if (data['refreshedToken']) {
                UserService.tokenSetter(data['refreshedToken']);
                this._userService.checkAuthent();
              }
              if (data['version']) {
                this.checkVersion(data['version']);
              }
              resolve(data['data'] as Config);
            },
            err => {
              reject(err);
            }
          );
    });
  }

  // Version management
  versionObservable (): Observable<boolean> {
    return this.versionSubject;
  }
  checkVersion (versionBackend: any) {
    if (versionBackend && (versionBackend.commit.hash !== environment.commit.hash)) {
      console.log('should be update : \'' + versionBackend.commit.hash + '\' !== \'' + environment.commit.hash + '\'');
      if (this.versionSubject.getValue() === false) {
        this._translateService.get('update-needed')
            .subscribe((text => {
              this._notificationService.warn(text);
            }));
      }
      this.versionSubject.next(true);
    } else {
      this.versionSubject.next(false);
    }
  }
}
