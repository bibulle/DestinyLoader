import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { HeaderService } from '../../services/header.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {

  linksLeft: { path: string, label: string, selected: boolean }[] = [];
  linksRight: { path: string, label: string, selected: boolean }[] = [];

  user: {};

  reloading = false;

  // selectedPath: string;

  constructor (private _router: Router,
               private _userService: UserService,
               private _headerService: HeaderService) {

    this._router.events.subscribe((data) => {
      // console.log(data);
//      if (data instanceof RoutesRecognized) {
//        // Title has bee recognized, add it to history
//        let backUrl: string = null;
//        if (this.titles.length > 0) {
//          backUrl = this.titles[0].url;
//        }
//        this.titles.unshift(new Title(data.state.root.firstChild.data['label'], backUrl, data.id, data.url));
//        this.titles = this.titles.slice(0, 100);
//
//      } else if (data instanceof NavigationCancel) {
//        // Title has been canceled : remove from history
//        this.titles = this.titles.slice(1);
//
//      } else if (data instanceof NavigationEnd) {
//        // Title has been done change title, ...
//        this.update(this.titles[0]);
//
//      }
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

    const newLinksLeft: { path: string, label: string, selected: boolean }[] = [];
    const newLinksRight: { path: string, label: string, selected: boolean }[] = [];

    this._router.config.forEach(obj => {
      // console.log(obj);
      if (!obj.redirectTo && obj.data && obj.data['menu']) {
        if (obj.data['right']) {
          newLinksRight.push({path: obj.path, label: obj.data['label'], selected: false});
        } else {
          newLinksLeft.push({path: obj.path, label: obj.data['label'], selected: false});
        }
      }
    });
    this.linksLeft = newLinksLeft;
    this.linksRight = newLinksRight;

    this._userService.userObservable().subscribe(
      user => {
        this.user = user;
        // console.log(user);
      });

    this._headerService.reloadingObservable().subscribe(
      rel => {
        this.reloading = rel;
      });
  }

}
