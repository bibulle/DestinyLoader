import {NgModule} from '@angular/core';

import {
  // MatButtonModule,
  // MatMenuModule,
  MatToolbarModule,
  MatIconModule,
  MatListModule,
  MatSidenavModule,
  MatSnackBarModule,
  MatCardModule,
  MatMenuModule,
  MatButtonModule,
  MatProgressSpinnerModule,
  MatCheckboxModule,
  MatTooltipModule,
  MatFormFieldModule, MatInputModule, MatTabsModule,
  // MatCardModule
} from '@angular/material';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

@NgModule({
  imports: [
    BrowserAnimationsModule,
    MatButtonModule,
    MatMenuModule,
    MatToolbarModule,
    MatIconModule,
    MatListModule,
    MatSidenavModule,
    MatSnackBarModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatTabsModule
  ],
  exports: [
    MatButtonModule,
    MatMenuModule,
    MatToolbarModule,
    MatIconModule,
    MatListModule,
    MatSidenavModule,
    MatSnackBarModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatTabsModule
  ]
})
export class MaterialModule {
}
