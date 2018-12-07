import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';


import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { MaterialModule } from './material.module';
import { LightComponent } from './components/light/light.component';
import { ChartComponent } from './components/chart/chart.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { MissingTranslationHandler, MissingTranslationHandlerParams, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import localeEn from '@angular/common/locales/en';
import { RatioComponent } from './components/ratio/ratio.component';
import { TriumphComponent } from './components/triumph/triumph.component';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { ChecklistComponent } from './components/checklist/checklist.component';
import { AuthGuard } from './components/authent/auth.guard';
import { UserService } from './services/user.service';
import { JwtModule } from '@auth0/angular-jwt';

export class MyMissingTranslationHandler implements MissingTranslationHandler {
  handle (params: MissingTranslationHandlerParams) {
    console.log(params);
    return '?' + params.key + '?';
  }
}

registerLocaleData(localeFr, 'fr');
registerLocaleData(localeEn, 'en');

@NgModule({
  declarations: [
    AppComponent,
    NotFoundComponent,
    LightComponent,
    ChartComponent,
    NavbarComponent,
    RatioComponent,
    TriumphComponent,
    ChecklistComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    JwtModule.forRoot({
      config: {
        tokenGetter: UserService.tokenGetter,
        whitelistedDomains: ['localhost:4001' as (string | RegExp), 'bib.bibulle.fr', new RegExp('^null$')]
//        whitelistedDomains: new Array(new RegExp('^null$'))
      }
    }),
    AppRoutingModule,
    MaterialModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      },
      missingTranslationHandler: {provide: MissingTranslationHandler, useClass: MyMissingTranslationHandler},
      // useDefaultLang: false
    })
  ],
  providers: [
    AuthGuard
  ],
  bootstrap: [
    AppComponent
  ]
})
export class AppModule {
}

export function HttpLoaderFactory (http: HttpClient) {
  return new TranslateHttpLoader(http);
}
