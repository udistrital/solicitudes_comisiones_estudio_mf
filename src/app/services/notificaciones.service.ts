import { Injectable } from '@angular/core';
import { Observable, of, switchMap, map } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { RequestManager } from '../managers/request.manager';
import { DocenteInfoService } from './docente-info.service';
import { environment } from 'src/environments/environment';

export interface NotificacionData {
  nombre_docente: string;
  id_solicitud: string;
  tipo_solicitud: string;
  instancia: string;
  observaciones: string;
  url_sistema: string;
  fecha: string;
}

interface EmailDestination {
  Destination: { ToAddresses: string[] };
  ReplacementTemplateData: Record<string, string>;
}

/** Correo de pruebas — TODO: eliminar línea en enviar() cuando se activen correos reales */
export const REVIEWER_EMAIL_PLACEHOLDER = 'jonathan100111a@gmail.com';

@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private readonly api: ReturnType<RequestManager['client']>;

  private readonly INSTANCIA_LABEL: Record<string, string> = {
    DOCENTE: 'Docente',
    SECRETARIA_ACADEMICA: 'Secretaría Académica',
    SECRETARIA_GENERAL: 'Secretaría General',
    DECANO: 'Decanatura',
  };

  private readonly SIGUIENTE_INSTANCIA_LABEL: Record<string, string> = {
    // Flujo: DOCENTE → SECRETARIA_ACADEMICA → SECRETARIA_GENERAL → DECANO
    // (COORDINADOR eliminado del flujo — ver CLAUDE.md)
    SECRETARIA_ACADEMICA: 'Secretaría General',
    SECRETARIA_GENERAL: 'Decanatura',
  };

  private readonly TIPO_SOLICITUD_LABEL: Record<string, string> = {
    SOL_INI: 'Solicitud Inicial',
    SOL_PRORROGA: 'Prórroga',
    CIERRE: 'Cierre',
  };

  constructor(
    private readonly request: RequestManager,
    private readonly docenteInfoService: DocenteInfoService,
  ) {
    this.api = this.request.client('NOTIFICACION_MID_SERVICE');
  }

  instanciaLabel(role: string): string {
    return this.INSTANCIA_LABEL[role] ?? role;
  }

  siguienteInstanciaLabel(role: string): string {
    return this.SIGUIENTE_INSTANCIA_LABEL[role] ?? '';
  }

  tipoSolicitudLabel(codigo: string): string {
    return this.TIPO_SOLICITUD_LABEL[codigo] ?? codigo;
  }

  urlDocente(id: number): string {
    const base = ((environment as any)['SGA_PORTAL_URL'] as string ?? '').replace(/\/$/, '');
    return `${base}/solicitudes/${id}?mode=EDITAR`;
  }

  urlRevisor(id: number): string {
    const base = ((environment as any)['SGA_PORTAL_URL'] as string ?? '').replace(/\/$/, '');
    return `${base}/solicitudes/${id}?mode=GESTIONAR`;
  }

  fechaActual(): string {
    return new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
  }

  // --- Notificaciones directas (email ya resuelto) ---

  notificarSolicitudCreada(emailDocente: string, data: NotificacionData): void {
    this.enviar('comisiones_solicitud_creada', emailDocente, data);
  }

  notificarEnviadaDocente(emailDocente: string, data: NotificacionData): void {
    this.enviar('comisiones_enviada_docente', emailDocente, data);
  }

  notificarAvaladaDocente(emailDocente: string, data: NotificacionData): void {
    this.enviar('comisiones_avalada_docente', emailDocente, data);
  }

  notificarRetornada(emailDocente: string, data: NotificacionData): void {
    this.enviar('comisiones_retornada', emailDocente, data);
  }

  notificarAprobada(emailDocente: string, data: NotificacionData): void {
    this.enviar('comisiones_aprobada', emailDocente, data);
  }

  notificarRechazada(emailDocente: string, data: NotificacionData): void {
    this.enviar('comisiones_rechazada', emailDocente, data);
  }

  // --- Notificaciones a revisores (resuelven email dinámicamente) ---

  /**
   * Notifica a la instancia revisora correspondiente resolviendo su email.
   * @param template nombre del template SES a usar
   * @param targetRole rol del revisor a notificar
   * @param cedulaDocente cédula del docente solicitante (para obtener codigo_facultad)
   * @param data datos del correo
   */
  notificarRevisor(
    template: string,
    targetRole: string,
    cedulaDocente: string,
    data: NotificacionData,
  ): void {
    this.resolverEmailRevisor(targetRole, cedulaDocente).subscribe({
      next: (email) => this.enviar(template, email || REVIEWER_EMAIL_PLACEHOLDER, data),
      error: () => this.enviar(template, REVIEWER_EMAIL_PLACEHOLDER, data),
    });
  }

  /**
   * Resuelve el email de un revisor según su rol y el código de facultad del docente.
   * - SECRETARIA_ACADEMICA: secretario_dependencia → documentoToken
   * - DECANO: decano_dependencia → documentoToken
   * - Otros (SECRETARIA_GENERAL): no hay endpoint → retorna cadena vacía
   */
  private resolverEmailRevisor(targetRole: string, cedulaDocente: string): Observable<string> {
    return this.docenteInfoService.consultarDocentePlanta(cedulaDocente).pipe(
      switchMap((info) => {
        const codigoFacultad = info?.codigoFacultad ?? '';
        if (!codigoFacultad) return of('');

        if (targetRole === 'SECRETARIA_ACADEMICA') {
          return this.docenteInfoService.consultarSecretarioDependencia(codigoFacultad).pipe(
            switchMap((persona) =>
              persona ? this.docenteInfoService.obtenerEmailPorCedula(persona.documento) : of(null),
            ),
            map((email) => email ?? ''),
          );
        }

        if (targetRole === 'DECANO') {
          return this.docenteInfoService.consultarDecanoDependencia(codigoFacultad).pipe(
            switchMap((persona) =>
              persona ? this.docenteInfoService.obtenerEmailPorCedula(persona.documento) : of(null),
            ),
            map((email) => email ?? ''),
          );
        }

        // SECRETARIA_GENERAL y otros: sin endpoint disponible aún
        return of('');
      }),
      catchError(() => of('')),
    );
  }

  private enviar(template: string, email: string, data: NotificacionData): void {
    if (!email) return;
    // TODO: eliminar esta línea cuando se activen correos reales
    const destinatario = REVIEWER_EMAIL_PLACEHOLDER;
    const destination: EmailDestination = {
      Destination: { ToAddresses: [destinatario] },
      ReplacementTemplateData: { ...data },
    };
    this.api.post<any>('email/enviar_templated_email', {
      Source: 'notificacionessga@udistrital.edu.co',
      Template: template,
      Destinations: [destination],
      DefaultTemplateData: {},
    }).subscribe({
      error: (err: any) => console.error(`[Notificaciones] Error enviando ${template}:`, err),
    });
  }
}
