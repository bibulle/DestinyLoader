import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// import {HomeComponent} from './components/home/home.component';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { LightComponent } from './components/light/light.component';
import { RatioComponent } from './components/ratio/ratio.component';
import { TriumphComponent } from './components/triumph/triumph.component';
import { GloryComponent } from './components/glory/glory.component';
import { ChecklistComponent } from './components/checklist/checklist.component';
import { AuthGuard, AuthGuardAdmin } from './components/authent/auth.guard';
import { ObjectiveTimesComponent } from './components/objective-times/objective-times.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: '/light',
    pathMatch: 'full'
  },
  {
    path: 'light',
    component: LightComponent,
    data: {
      label: 'label.light',
      menu: true,
      icon: 'light',
      iconType: 'svgIcon'
    }
  },
  {
    path: 'ratio',
    component: RatioComponent,
    data: {
      label: 'label.ratio',
      menu: true,
      icon: 'pvp',
      iconType: 'svgIcon'
    }
  },
  {
    path: 'triumph',
    component: TriumphComponent,
    data: {
      label: 'label.triumph',
      menu: true,
      icon: 'fa-trophy',
      iconType: 'fas'
    }
  },
  {
    path: 'glory',
    component: GloryComponent,
    data: {
      label: 'label.glory',
      menu: true,
      icon: 'fa-bolt',
      iconType: 'fas'
    }
  },
  {
    path: 'checklist',
    component: ChecklistComponent,
    canActivate: [AuthGuard],
    data: {
      label: 'label.checklist',
      menu: true,
      icon: 'fa-clipboard-list',
      iconType: 'fas',
      right: false
    }
  },
  {
    path: 'objective-times',
    component: ObjectiveTimesComponent,
    canActivate: [AuthGuardAdmin],
    data: {
      label: 'label.objective-times',
      menu: true,
      icon: 'fa-clock',
      iconType: 'fas',
      right: false,
      onlyAdmin: true
    }
  },
  // // Show the 404 page for any routes that don't exist.
  {
    path: '**',
    component: NotFoundComponent,
    data: {
      label: 'route.not-found',
      menu: false
    }
  }
];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
