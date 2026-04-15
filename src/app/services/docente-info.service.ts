import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { getToken } from '../utils/auth.util';
import { DocenteInfo } from '../models/docente-info.model';

interface DatosDocenteResponse {
  datosCollection?: {
    datos?: Array<Record<string, string>>;
  };
}

@Injectable({ providedIn: 'root' })
export class DocenteInfoService {
  private readonly baseUrl = ((environment as any)['ACADEMICA_JBPM_SERVICE'] ?? '') as string;

  constructor(private http: HttpClient) {}

  consultarDocentePlanta(documento: string): Observable<DocenteInfo | null> {
    const url = `${this.baseUrl.replace(/\/+$/, '')}/consulta_datos_docente_planta/${encodeURIComponent(documento)}`;
    const token = getToken();
    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();

    return this.http
      .get<DatosDocenteResponse>(url, { headers })
      .pipe(map((res) => this.mapResponse(res)));
  }

  private mapResponse(res: DatosDocenteResponse): DocenteInfo | null {
    const datos = res?.datosCollection?.datos?.[0];
    if (!datos) return null;

    const str = (key: string): string | null => datos[key]?.trim() || null;

    return {
      nombres: str('nombres'),
      apellidos: str('apellidos'),
      documento: str('documento'),
      tipoDocumento: str('tipo_documento'),
      facultad: str('facultad'),
      proyecto: str('proyecto'),
      celular: str('celular'),
      telefono: str('telefono'),
    };
  }
}
