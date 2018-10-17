import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';

// import {HomeComponent} from './components/home/home.component';
import {NotFoundComponent} from './components/not-found/not-found.component';
import {LightComponent} from './components/light/light.component';
import { RatioComponent } from './components/ratio/ratio.component';
import { TriumphComponent } from './components/triumph/triumph.component';

const routes: Routes = [
  { path: '',               redirectTo: '/light',              pathMatch: 'full'},
//  { path: 'home',           component: HomeComponent                 , data: {label: 'route.news'   , menu: true}},
  { path: 'light',          component: LightComponent                ,                                data: {label: 'label.light'    , menu: true}},
  { path: 'ratio',          component: RatioComponent                ,                                data: {label: 'label.ratio'    , menu: true}},
  { path: 'triumph',        component: TriumphComponent              ,                                data: {label: 'label.triumph'  , menu: true}},
  // // Show the 404 page for any routes that don't exist.
  { path: '**',             component: NotFoundComponent,      data: {label: 'route.not-found', menu: false} }
];


@NgModule( {
  imports: [ RouterModule.forRoot(routes) ],
  exports: [ RouterModule ]
})
export class AppRoutingModule {}
