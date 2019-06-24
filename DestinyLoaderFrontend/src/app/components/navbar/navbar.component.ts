import { AfterViewInit, Component, ElementRef, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { HeaderService } from '../../services/header.service';
import { Config, Search } from '../../models/config';
import { Subscription } from 'rxjs';
import { User } from '../../models/user';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, OnDestroy, AfterViewInit {

  @Output() onHeight = new EventEmitter<number>();

  linksLeft: { path: string, label: string, icon: string, iconType: string, selected: boolean }[] = [];
  linksRight: { path: string, label: string, icon: string, iconType: string, selected: boolean }[] = [];

  user: User;
  private _currentUserSubscription: Subscription;


  reloading = false;
  private _currentReloadingSubscription: Subscription;

  search = new Search();
  searchTextfield = '';
  private _currentSearchSubscription: Subscription;

  config: Config = new Config();
  private _currentConfigSubscription: Subscription;


  visibleRewardsKeys = Object.keys(this.config.visible.rewards);
  visibleTypeKeys = Object.keys(this.config.visible.types);

  version = environment.version;
  commit = environment.commit;
  private _currentVersionSubscription: Subscription;
  updateNeeded = false;


  constructor (private _router: Router,
               private _userService: UserService,
               private _headerService: HeaderService,
               private _elementRef: ElementRef) {

    this._router.events.subscribe((data) => {
      if (data instanceof NavigationEnd) {
        this.linksLeft.forEach(link => {
          link.selected = ('/' + link.path === data.urlAfterRedirects);
        });
        this.linksRight.forEach(link => {
          link.selected = ('/' + link.path === data.urlAfterRedirects);
        });

      }
    });

  }

  ngOnInit () {

    this._currentUserSubscription = this._userService.userObservable().subscribe(
      user => {
        this.user = user;
        this.calculateMenus();
      });

    this._currentReloadingSubscription = this._headerService.reloadingObservable().subscribe(
      rel => {
        this.reloading = rel;
        this.checkHeight();
      });

    this._currentConfigSubscription = this._headerService.configObservable().subscribe(
      rel => {
        this.config = {...this.config, ...rel};
        console.log(this.config);
        this.checkHeight();
      });

    this._currentSearchSubscription = this._headerService.searchObservable()
                                          .subscribe(search => {
                                            // console.log(search);
                                            this.search = search;
                                            this.searchTextfield = this.search.searchText;
                                            this.checkHeight();
                                          });

    this._currentVersionSubscription = this._headerService.versionObservable().subscribe(
      rel => {
        this.updateNeeded = rel;
        this.checkHeight();
      });

  }

  private calculateMenus () {
    const newLinksLeft: { path: string, label: string, icon: string, iconType: string, selected: boolean }[] = [];
    const newLinksRight: { path: string, label: string, icon: string, iconType: string, selected: boolean }[] = [];
    this._router.config.forEach(obj => {
      // console.log(obj);
      if (!obj.redirectTo && obj.data && obj.data['menu'] && ((!obj.data['onlyAdmin']) || (this.user.isAdmin))) {
        if (obj.data['right']) {
          newLinksRight.push({
            path: obj.path,
            label: obj.data['label'],
            icon: obj.data['icon'],
            iconType: obj.data['iconType'],
            selected: false
          });
        } else {
          newLinksLeft.push({
            path: obj.path,
            label: obj.data['label'],
            icon: obj.data['icon'],
            iconType: obj.data['iconType'],
            selected: false
          });
        }
      }
    });
    this.linksLeft = newLinksLeft;
    this.linksRight = newLinksRight;
    this.checkHeight();
  }

  ngOnDestroy (): void {
    if (this._currentUserSubscription) {
      this._currentUserSubscription.unsubscribe();
    }
    if (this._currentReloadingSubscription) {
      this._currentReloadingSubscription.unsubscribe();
    }
    if (this._currentConfigSubscription) {
      this._currentConfigSubscription.unsubscribe();
    }
    if (this._currentSearchSubscription) {
      this._currentSearchSubscription.unsubscribe();
    }
    if (this._currentVersionSubscription) {
      this._currentSearchSubscription.unsubscribe();
    }
  }

  checkHeight() {
    setTimeout(() => {
      if (this._elementRef && this._elementRef.nativeElement) {
        this.onHeight.emit(this._elementRef.nativeElement.offsetHeight);
        // console.log(this._elementRef.nativeElement.offsetHeight);
      }
    });
  }
  ngAfterViewInit() {
    this.checkHeight();
  }
  onResize () {
    this.checkHeight();
  }

  toggleShowOnlyPowerfulGear () {
    this._headerService.toggleShowOnlyPowerfulGear();
  }

  saveConfig (event) {
    event.stopPropagation();
    setTimeout(() => {
      this._headerService.saveConfig(this.config);
    });
  }

  logout () {
    this._userService.logout();

    this._router.navigate(['']).catch();
  }

  toggleLang (lang: string) {
    this._headerService.changeLanguage(lang);
  }

  searchText () {
    this._headerService.setSearch(this.searchTextfield);
  }

  searchNext (event: any) {
    event.stopPropagation();
    this._headerService.setSearchNext();
  }

  update() {
    location.reload();
  }

}
