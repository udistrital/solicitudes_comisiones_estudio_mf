import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { getToken } from '../utils/auth.util';
import { DocenteInfo, PersonaDependencia } from '../models/docente-info.model';

interface DatosDocenteResponse {
  datosCollection?: {
    datos?: Array<Record<string, string>>;
  };
}

interface DocumentoTokenResponse {
  email?: string;
  documento?: string;
  role?: string[];
}

@Injectable({ providedIn: 'root' })
export class DocenteInfoService {
  private readonly baseUrl = ((environment as any)['ACADEMICA_JBPM_SERVICE'] ?? '') as string;
  private readonly autenticacionMidUrl = ((environment as any)['AUTENTICACION_MID_SERVICE'] ?? '') as string;

  constructor(private readonly http: HttpClient) {}

  consultarDocentePlanta(documento: string): Observable<DocenteInfo | null> {
    const url = `${this.baseUrl.replace(/\/+$/, '')}/consulta_datos_docente_planta/${encodeURIComponent(documento)}`;
    return this.http
      .get<DatosDocenteResponse>(url, { headers: this.authHeaders() })
      .pipe(
        map((res) => this.mapDocenteResponse(res)),
        catchError(() => of(null)),
      );
  }

  consultarSecretarioDependencia(codigoFacultad: string): Observable<PersonaDependencia | null> {
    const url = `${this.baseUrl.replace(/\/+$/, '')}/secretario_dependencia/${encodeURIComponent(codigoFacultad)}`;
    return this.http
      .get(url, { headers: this.authHeaders(), responseType: 'text' })
      .pipe(
        map((xml) => this.parsearPersonaDependencia(xml, 'secretario')),
        catchError(() => of(null)),
      );
  }

  consultarDecanoDependencia(codigoFacultad: string): Observable<PersonaDependencia | null> {
    const url = `${this.baseUrl.replace(/\/+$/, '')}/decano_dependencia/${encodeURIComponent(codigoFacultad)}`;
    return this.http
      .get(url, { headers: this.authHeaders(), responseType: 'text' })
      .pipe(
        map((xml) => this.parsearPersonaDependencia(xml, 'decano')),
        catchError(() => of(null)),
      );
  }

  obtenerEmailPorCedula(cedula: string): Observable<string | null> {
    const url = `${this.autenticacionMidUrl.replace(/\/+$/, '')}/token/documentoToken`;
    return this.http
      .post<DocumentoTokenResponse>(url, { numero: cedula }, { headers: this.authHeaders() })
      .pipe(
        map((res) => res?.email?.trim() || null),
        catchError(() => of(null)),
      );
  }

  private authHeaders(): HttpHeaders {
    const token = getToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  private mapDocenteResponse(res: DatosDocenteResponse): DocenteInfo | null {
    const datos = res?.datosCollection?.datos?.[0];
    if (!datos) return null;
    const str = (key: string): string | null => datos[key]?.trim() || null;
    return {
      nombres: str('nombres'),
      apellidos: str('apellidos'),
      documento: str('documento'),
      tipoDocumento: str('tipo_documento'),
      facultad: str('facultad'),
      codigoFacultad: str('codigo_facultad'),
      proyecto: str('proyecto'),
      celular: str('celular'),
      telefono: str('telefono'),
    };
  }

  private parsearPersonaDependencia(xml: string, tag: string): PersonaDependencia | null {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const el = doc.getElementsByTagName(tag)[0];
    if (!el) return null;
    const documento = el.getElementsByTagName('documento')[0]?.textContent?.trim() ?? '';
    const nombre = el.getElementsByTagName('nombre')[0]?.textContent?.trim() ?? '';
    return documento ? { documento, nombre } : null;
  }
}
