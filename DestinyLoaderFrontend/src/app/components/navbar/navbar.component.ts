import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { HeaderService } from '../../services/header.service';
import { Config } from '../../models/config';
import { Subscription } from 'rxjs';
import { User } from '../../models/user';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, OnDestroy {

  linksLeft: { path: string, label: string, icon: string, iconType: string, selected: boolean }[] = [];
  linksRight: { path: string, label: string, icon: string, iconType: string, selected: boolean }[] = [];

  user: User;
  private _currentUserSubscription: Subscription;


  reloading = false;
  private _currentReloadingSubscription: Subscription;


  config: Config = new Config();
  private _currentConfigSubscription: Subscription;


  constructor (private _router: Router,
               private _userService: UserService,
               private _headerService: HeaderService) {

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

    const newLinksLeft: { path: string, label: string, icon: string, iconType: string, selected: boolean }[] = [];
    const newLinksRight: { path: string, label: string, icon: string, iconType: string, selected: boolean }[] = [];

    this._router.config.forEach(obj => {
      // console.log(obj);
      if (!obj.redirectTo && obj.data && obj.data['menu']) {
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

    this._currentUserSubscription = this._userService.userObservable().subscribe(
      user => {
        this.user = user;
      });

    this._currentReloadingSubscription = this._headerService.reloadingObservable().subscribe(
      rel => {
        this.reloading = rel;
      });

    this._currentConfigSubscription = this._headerService.configObservable().subscribe(
      rel => {
        this.config = rel;
      });
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
  }


  toggleShowOnlyPowerfulGear () {
    this._headerService.toggleShowOnlyPowerfulGear();
  }

  logout () {
    this._userService.logout();

    this._router.navigate(['']).catch();
  }

  toggleLang (lang: string) {
    this._headerService.changeLanguage(lang);
  }

}
