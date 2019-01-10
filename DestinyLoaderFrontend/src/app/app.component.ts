import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { MatIconRegistry } from '@angular/material';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

  constructor(private _translate: TranslateService,
              private _matIconRegistry: MatIconRegistry,
              private _domSanitizer: DomSanitizer) {
    this._translate.setDefaultLang('en');


    this._matIconRegistry
        .addSvgIcon('light', this._domSanitizer.bypassSecurityTrustResourceUrl('/assets/images/light.svg'))
        .addSvgIcon('pvp', this._domSanitizer.bypassSecurityTrustResourceUrl('/assets/images/pvp.svg'))
        .addSvgIcon('flag_fr', this._domSanitizer.bypassSecurityTrustResourceUrl('/assets/images/fr.svg'))
        .addSvgIcon('flag_us', this._domSanitizer.bypassSecurityTrustResourceUrl('/assets/images/us.svg'));


  }

  ngOnInit (): void {
  }


}
