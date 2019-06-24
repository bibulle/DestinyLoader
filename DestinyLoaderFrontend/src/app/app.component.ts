import { AfterViewInit, Component, ElementRef, OnInit, Renderer2, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit {

  constructor(private _translate: TranslateService,
              private _matIconRegistry: MatIconRegistry,
              private _domSanitizer: DomSanitizer,
              private _elementRef: ElementRef,
              private _renderer: Renderer2) {
    this._translate.setDefaultLang('en');


    this._matIconRegistry
        .addSvgIcon('light', this._domSanitizer.bypassSecurityTrustResourceUrl('/assets/images/light.svg'))
        .addSvgIcon('pvp', this._domSanitizer.bypassSecurityTrustResourceUrl('/assets/images/pvp.svg'))
        .addSvgIcon('flag_fr', this._domSanitizer.bypassSecurityTrustResourceUrl('/assets/images/fr.svg'))
        .addSvgIcon('flag_us', this._domSanitizer.bypassSecurityTrustResourceUrl('/assets/images/us.svg'));


  }

  ngOnInit (): void {
  }

  ngAfterViewInit() {
    // const height = this.elementView.nativeElement.offsetHeight;
    // console.log(this.elementView);
  }


  onNavBarHeight (navbarHeight: number) {
    // console.log(navbarHeight+' '+this._elementRef.nativeElement.style.top);
    // console.log(this._elementRef.nativeElement.style.top);
    // this._elementRef.nativeElement.style.top = navbarHeight;
    this._renderer.setStyle(this._elementRef.nativeElement, 'top', ''+navbarHeight+'px');
  }
}
