/* tslint:disable:member-ordering */
import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable, timer} from 'rxjs';
import {Config, Search, SearchStyle} from '../models/config';
import {TranslateService} from '@ngx-translate/core';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../environments/environment';
import {NotificationService} from './notification.service';
import {UserService} from './user.service';

@Injectable({
  providedIn: 'root'
})
export class HeaderService {

  private readonly searchSubject: BehaviorSubject<Search>;
  private readonly reloadingSubject: BehaviorSubject<number>;
  private readonly versionSubject: BehaviorSubject<boolean>;

  config: Config;
  private configSubject: BehaviorSubject<Config>;

// tslint:disable-next-line:member-ordering
  private static KEY_CONFIG_LOCAL_STORAGE = 'config';
  private static KEY_RELOADING_TIMES_LOCAL_STORAGE = 'reloadingTimeMeans';

//  private configUrl = environment.serverUrl + 'monitorStuff/value';
  private configUrl = '/monitorStuff/value';

  constructor(private httpClient: HttpClient,
              private _translateService: TranslateService,
              private _notificationService: NotificationService,
              private _userService: UserService) {

    this.searchSubject = new BehaviorSubject<Search>(new Search());
    this.reloadingSubject = new BehaviorSubject<number>(0);
    this.versionSubject = new BehaviorSubject<boolean>(false);

    this._loadConfig();

    this._reloadingTimesMeans = HeaderService._loadReloadingTimesFromLocalStorage();
    timer(200, 200).subscribe(() => {
      this._calculateReloadTime();
    });
  }

  // Search management
  searchObservable(): Observable<Search> {
    return this.searchSubject;
  }

  setSearch(search: string) {
    // console.log(search + ' - ' + this.searchSubject.getValue().searchText);
    if (search !== this.searchSubject.getValue().searchText) {
      this.searchSubject.next({
        shown: this.searchSubject.getValue().shown,
        searchText: search,
        foundCount: 0,
        foundCurrent: 0,
        style: this.searchSubject.getValue().style,
        tagsShown: this.searchSubject.getValue().tagsShown
      });
    }
  }

  setSearchNext() {
    this.searchSubject.next({
      shown: this.searchSubject.getValue().shown,
      searchText: this.searchSubject.getValue().searchText,
      foundCount: this.searchSubject.getValue().foundCount,
      foundCurrent: this.searchSubject.getValue().foundCurrent + 1,
      style: this.searchSubject.getValue().style,
      tagsShown: this.searchSubject.getValue().tagsShown
    });
  }

  setSearchFoundCount(count) {
    this.searchSubject.next({
      shown: this.searchSubject.getValue().shown,
      searchText: this.searchSubject.getValue().searchText,
      foundCount: count,
      foundCurrent: this.searchSubject.getValue().foundCurrent,
      style: this.searchSubject.getValue().style,
      tagsShown: this.searchSubject.getValue().tagsShown
    });
  }

  setSearchShown(shown: boolean) {
    this.searchSubject.next({
      shown: shown,
      searchText: (shown ? this.searchSubject.getValue().searchText : ''),
      foundCount: (shown ? this.searchSubject.getValue().foundCount : 0),
      foundCurrent: (shown ? this.searchSubject.getValue().foundCurrent : 0),
      style: this.searchSubject.getValue().style,
      tagsShown: this.searchSubject.getValue().tagsShown
    });
  }

  toggleSearchType() {
    this.searchSubject.next({
      shown: this.searchSubject.getValue().shown,
      searchText: this.searchSubject.getValue().searchText,
      foundCount: this.searchSubject.getValue().foundCount,
      foundCurrent: this.searchSubject.getValue().foundCurrent,
      style: (this.searchSubject.getValue().style === SearchStyle.SEARCH ? SearchStyle.FILTER : SearchStyle.SEARCH),
      tagsShown: this.searchSubject.getValue().tagsShown
    });
  }

  setTagsShown(shown: boolean) {
    this.searchSubject.next({
      shown: this.searchSubject.getValue().shown,
      searchText: (shown ? this.searchSubject.getValue().searchText : ''),
      foundCount: (shown ? this.searchSubject.getValue().foundCount : 0),
      foundCurrent: (shown ? this.searchSubject.getValue().foundCurrent : 0),
      style: this.searchSubject.getValue().style,
      tagsShown: shown
    });
  }



  // Reloading management

  private readonly _reloadingSet = new Set();
  private readonly _reloadingTimes = {};
  private readonly _reloadingTimesMeans = {};

  reloadingObservable(): Observable<number> {
    return this.reloadingSubject;
  }

  startReloading(key: ReloadingKey) {
    this._reloadingSet.add(key);
    this._reloadingTimes[key] = Date.now();
    // this.reloadingSubject.next(50);
  }

  private _calculateReloadTime() {
    if (this._reloadingSet.size !== 0) {

      let valueMin = 100;
      this._reloadingSet.forEach(key => {
        const DURING = this._reloadingTimesMeans[key] ? this._reloadingTimesMeans[key] : 10000;

        let valueMilliSeconds = Date.now() - this._reloadingTimes[key];
        if (valueMilliSeconds >= DURING + 1000) {
          valueMilliSeconds = 0.9 * DURING + 0.1 * (valueMilliSeconds % DURING) / DURING;
        }

        valueMin = Math.min(valueMin, 100 * valueMilliSeconds / DURING);

      });

      this.reloadingSubject.next(valueMin);

    }

  }

  stopReloading(key: ReloadingKey) {

    if (this._reloadingTimesMeans[key]) {
      this._reloadingTimesMeans[key] = (9 * this._reloadingTimesMeans[key] + (Date.now() - this._reloadingTimes[key])) / 10;
    } else {
      this._reloadingTimesMeans[key] = (Date.now() - this._reloadingTimes[key]);
    }
    HeaderService._saveReloadingTimesToLocalStorage(this._reloadingTimesMeans);

    this._reloadingSet.delete(key);
    if (this._reloadingSet.size === 0) {
      this.reloadingSubject.next(100);
      setTimeout(() => {
        this.reloadingSubject.next(0);
      }, 100);
    }
  }

  private static _saveReloadingTimesToLocalStorage(reloadingTimeMeans: {}) {
    localStorage.setItem(HeaderService.KEY_RELOADING_TIMES_LOCAL_STORAGE, JSON.stringify(reloadingTimeMeans));
  }

  private static _loadReloadingTimesFromLocalStorage(): {} {
    try {
      const ret: {} = JSON.parse(localStorage.getItem(HeaderService.KEY_RELOADING_TIMES_LOCAL_STORAGE));
      if (ret) {
        return ret;
      } else {
        return {};
      }
    } catch {
      return {};
    }
  }


  // Configuration management
  configObservable(): Observable<Config> {
    return this.configSubject;
  }


  // toggleShowOnlyPowerfulGear() {
  //   this.config.showOnlyPowerfulGear = !this.config.showOnlyPowerfulGear;
  //   this.saveConfig(this.config);
  // }

  changeLanguage(language: string) {
    // this.setSearch('');
    this.config.language = language;

    // console.log(this.config.language);
    this._translateService.use(this.config.language);

    this.saveConfig(this.config);
  }

  toggleSelectedPursuit(key) {
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


  saveConfig(config) {
    this.config = config;
    this.configSubject.next(this.config);
    HeaderService._saveConfigToLocalStorage(this.config);
    this._saveConfigToBackend(this.config)
      .catch((err) => {
        console.log(err);
      });
  }

  private _loadConfig() {
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
          this.config.visible.types = {...new Config().visible.types, ...this.config.visible.types};
          this.config.visible.rewards = {...new Config().visible.rewards, ...this.config.visible.rewards};
          // console.log(this.config);
          this._setLanguageFromConfig();
          this.configSubject.next(this.config);
        }
      })
      .catch((err) => {
        console.log(err);
      });
  }

  private _setLanguageFromConfig() {
    if (!this.config.language) {
      this.config.language = this._translateService.getBrowserLang();
    }
    this._translateService.use(this.config.language);
  }

  private static _saveConfigToLocalStorage(config: Config) {
    localStorage.setItem(HeaderService.KEY_CONFIG_LOCAL_STORAGE, JSON.stringify(config));
  }

  private static _loadConfigFromLocalStorage(): Config {
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

  private _saveConfigToBackend(config: Config): Promise<Config> {
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

  private _loadConfigFromBackend(): Promise<Config> {
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
  versionObservable(): Observable<boolean> {
    return this.versionSubject;
  }

  checkVersion(versionBackend: any) {
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

export enum ReloadingKey {
  ObjectiveTimes,
  Stats,
  Checklist
}
