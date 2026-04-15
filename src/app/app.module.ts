import { NgModule, LOCALE_ID } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

import { AppRoutingModule } from './app-routing.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HttpClient } from '@angular/common/http';

import { AppComponent } from './app.component';
import { EmptyRouteComponent } from './empty-route/empty-route.component';

import { BandejaComponent } from './pages/gestion-solicitudes/bandeja/bandeja.component';
import { DetalleSolicitudComponent } from './pages/gestion-solicitudes/detalle-solicitud/detalle-solicitud.component';
import { VisorDocumentosComponent } from './pages/gestion-solicitudes/components/visor-documentos/visor-documentos.component';

import { DynamicTableComponent } from './shared/dynamic-table/dynamic-table.component';
import { Fr010FormComponent } from './pages/gestion-solicitudes/components/fr010-form/fr010-form.component';

// Forms
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// i18n
import {
  TranslateModule,
  TranslateLoader,
  TranslateService,
  MissingTranslationHandler,
  MissingTranslationHandlerParams,
} from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { environment } from '../environments/environment';

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
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, MatPaginatorIntl } from '@angular/material/paginator';

/**
 * Usa deployUrl del environment para resolver la ruta absoluta de los JSON.
 * Esto evita que el loader resuelva rutas relativas al pathname del navegador
 * (ej: /solicitud-comision/solicitudes/assets/i18n/en.json → 404).
 * En su lugar resuelve a la raiz del microfrontend:
 *   local  → http://localhost:4224/assets/i18n/
 *   test   → https://pruebas....portaloas.../assets/i18n/
 *   prod   → https://solicitudes....portaloas.../assets/i18n/
 */
export function HttpLoaderFactory(http: HttpClient): TranslateHttpLoader {
  return new TranslateHttpLoader(http, `${environment.deployUrl}assets/i18n/`, '.json');
}

export class SgaMissingTranslationHandler implements MissingTranslationHandler {
  handle(params: MissingTranslationHandlerParams): string {
    console.warn(`[i18n] Missing translation: "${params.key}"`);
    return params.key;
  }
}

export function paginatorIntlFactory(translate: TranslateService): MatPaginatorIntl {
  const intl = new MatPaginatorIntl();
  const update = () => {
    intl.itemsPerPageLabel = translate.instant('PAGINATOR.ITEMS_PER_PAGE');
    intl.nextPageLabel = translate.instant('PAGINATOR.NEXT_PAGE');
    intl.previousPageLabel = translate.instant('PAGINATOR.PREV_PAGE');
    intl.firstPageLabel = translate.instant('PAGINATOR.FIRST_PAGE');
    intl.lastPageLabel = translate.instant('PAGINATOR.LAST_PAGE');
    intl.getRangeLabel = (page, pageSize, length) => {
      if (length === 0 || pageSize === 0) return `0 / ${length}`;
      const start = page * pageSize + 1;
      const end = Math.min(start + pageSize - 1, length);
      return `${start} – ${end} / ${length}`;
    };
    intl.changes.next();
  };
  translate.onLangChange.subscribe(() => update());
  update();
  return intl;
}

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

    // i18n
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      },
      missingTranslationHandler: {
        provide: MissingTranslationHandler,
        useClass: SgaMissingTranslationHandler,
      },
      defaultLanguage: 'es',
    }),

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
    MatTooltipModule,
    MatPaginatorModule,
  ],
  providers: [
    { provide: LOCALE_ID, useValue: 'es-CO' },
    { provide: MAT_DATE_LOCALE, useValue: 'es-CO' },
    { provide: MatPaginatorIntl, useFactory: paginatorIntlFactory, deps: [TranslateService] },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}