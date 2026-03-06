import { NgModule, LOCALE_ID } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

import { AppRoutingModule } from './app-routing.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';

import { AppComponent } from './app.component';
import { EmptyRouteComponent } from './empty-route/empty-route.component';

import { BandejaComponent } from './pages/gestion-solicitudes/bandeja/bandeja.component';
import { DetalleSolicitudComponent } from './pages/gestion-solicitudes/detalle-solicitud/detalle-solicitud.component';
import { VisorDocumentosComponent } from './pages/gestion-solicitudes/components/visor-documentos/visor-documentos.component';

import { DynamicTableComponent } from './shared/dynamic-table/dynamic-table.component';
import { Fr010FormComponent } from './pages/gestion-solicitudes/components/fr010-form/fr010-form.component';

// Forms
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, MAT_DATE_LOCALE } from '@angular/material/core';

registerLocaleData(localeEs);

@NgModule({
  declarations: [
    AppComponent,
    EmptyRouteComponent,

    // Pages Fase 1
    BandejaComponent,
    DetalleSolicitudComponent,
    VisorDocumentosComponent,

    // Shared
    DynamicTableComponent,
    Fr010FormComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    HttpClientModule,

    // Forms
    FormsModule,
    ReactiveFormsModule,

    // Material
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSnackBarModule,
    MatInputModule,
    MatCheckboxModule,
    MatDialogModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  providers: [
    { provide: LOCALE_ID, useValue: 'es-CO' },
    { provide: MAT_DATE_LOCALE, useValue: 'es-CO' },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}