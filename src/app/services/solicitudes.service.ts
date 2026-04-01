import { Injectable } from '@angular/core';
import { RequestManager } from '../managers/request.manager';

@Injectable({ providedIn: 'root' })
export class SolicitudesService {
  private api: ReturnType<RequestManager['client']>;
  private apiMid: ReturnType<RequestManager['client']>;
  private apiCrud: ReturnType<RequestManager['client']>;

  constructor(private request: RequestManager) {
    this.api = this.request.client('SOLICITUDES_SERVICE');
    this.apiMid = this.request.client('COMISIONES_MID_SERVICE');
    this.apiCrud = this.request.client('COMISIONES_CRUD_SERVICE');
  }

  obtenerDetalleSolicitud(id: number) {
    return this.apiMid.get<any>(`v1/solicitud/detalles_solicitud/${id}`);
  }

  crearSolicitud(payload: any) {
    return this.apiMid.post<any>('v1/solicitud/crear_solicitud', payload);
  }

  listarTiposDocumentoSolicitud() {
    return this.apiCrud.get<any>('v1/tipo_documento_solicitud');
  }

  // ========== Bandeja por rol ==========

  listarSolicitudesDocente(cedula: string) {
    return this.apiMid.get<any>(`v1/solicitud/solicitudes_by_identificacion/${cedula}`);
  }

  listarPendientesCoordinador(cedula: string) {
    return this.apiMid.get<any>(`v1/solicitud/pendientes_coordinador/${cedula}`);
  }

  listarPendientesSecretaria(cedula: string) {
    return this.apiMid.get<any>(`v1/solicitud/pendientes_secretaria/${cedula}`);
  }

  cambiarEstadoSolicitud(payload: any) {
    return this.apiMid.post<any>('v1/solicitud/estados', payload);
  }
}
