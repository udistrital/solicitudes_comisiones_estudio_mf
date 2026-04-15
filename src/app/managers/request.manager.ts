import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { HttpErrorManager } from './http-error.manager';
import { getToken } from '../utils/auth.util';

type HttpOptions = { headers?: HttpHeaders | Record<string, string> };

@Injectable({ providedIn: 'root' })
export class RequestManager {
  constructor(private http: HttpClient, private httpErrors: HttpErrorManager) {}

  /**
   * Crea un cliente “ligero” por servicio (evita estado global mutable).
   * serviceKey debe existir en environment (ej: SOLICITUDES_SERVICE).
   */
  client(serviceKey: string) {
    const baseUrl = (environment as any)[serviceKey] as string | undefined;

    if (!baseUrl) {
      // En dev puede funcionar como URL relativa si aún no tienes env listo.
      console.warn(`[RequestManager] Falta environment.${serviceKey}. Se usará URL relativa.`);
    }

    const buildUrl = (endpoint: string) => {
      const a = (baseUrl ?? '').replace(/\/+$/, '');
      const b = endpoint.replace(/^\/+/, '');
      return a ? `${a}/${b}` : `/${b}`;
    };

    return {
      get: <T>(endpoint: string, options: HttpOptions = {}) =>
        this.http
          .get<T>(buildUrl(endpoint), this.withAuth(options))
          .pipe(catchError((e) => this.httpErrors.handleError(e))),

      post: <T>(endpoint: string, body: any, options: HttpOptions = {}) =>
        this.http
          .post<T>(buildUrl(endpoint), body, this.withAuth(options))
          .pipe(catchError((e) => this.httpErrors.handleError(e))),

      put: <T>(endpoint: string, body: any, options: HttpOptions = {}) =>
        this.http
          .put<T>(buildUrl(endpoint), body, this.withAuth(options))
          .pipe(catchError((e) => this.httpErrors.handleError(e))),

      delete: <T>(endpoint: string, options: HttpOptions = {}) =>
        this.http
          .delete<T>(buildUrl(endpoint), this.withAuth(options))
          .pipe(catchError((e) => this.httpErrors.handleError(e))),
    };
  }

  private withAuth(options: HttpOptions) {
    const token = getToken();
    let headers = new HttpHeaders();

    if (options.headers instanceof HttpHeaders) {
      headers = options.headers;
    } else if (options.headers) {
      for (const [k, v] of Object.entries(options.headers)) headers = headers.set(k, v);
    }

    if (token) headers = headers.set('Authorization', `Bearer ${token}`);

    return { ...options, headers };
  }
}
