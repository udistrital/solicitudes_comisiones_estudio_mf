import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';

import { AppComponent } from './app.component';
import { EmptyRouteComponent } from './empty-route/empty-route.component';

import { BandejaComponent } from './pages/gestion-solicitudes/bandeja/bandeja.component';
import { DetalleSolicitudComponent } from './pages/gestion-solicitudes/detalle-solicitud/detalle-solicitud.component';
import { ModalAccionComponent } from './pages/gestion-solicitudes/components/modal-accion/modal-accion.component';
import { VisorDocumentosComponent } from './pages/gestion-solicitudes/components/visor-documentos/visor-documentos.component';

import { DynamicTableComponent } from './shared/dynamic-table/dynamic-table.component';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';


@NgModule({
  declarations: [
    AppComponent,
    EmptyRouteComponent,

    // Pages Fase 1
    BandejaComponent,
    DetalleSolicitudComponent,
    ModalAccionComponent,
    VisorDocumentosComponent,

    // Shared
    DynamicTableComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    HttpClientModule,

    // Material
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSnackBarModule,
    FormsModule,
    MatInputModule,
    MatCheckboxModule,
    MatDialogModule,

  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
