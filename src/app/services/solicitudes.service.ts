import { Injectable } from '@angular/core';
import { RequestManager } from '../managers/request.manager';

@Injectable({ providedIn: 'root' })
export class SolicitudesService {
  private readonly api: ReturnType<RequestManager['client']>;
  private readonly apiMid: ReturnType<RequestManager['client']>;
  private readonly apiCrud: ReturnType<RequestManager['client']>;
  private readonly apiDocCrud: ReturnType<RequestManager['client']>;
  private readonly apiGestorDocMid: ReturnType<RequestManager['client']>;

  constructor(private request: RequestManager) {
    this.api = this.request.client('SOLICITUDES_SERVICE');
    this.apiMid = this.request.client('COMISIONES_MID_SERVICE');
    this.apiCrud = this.request.client('COMISIONES_CRUD_SERVICE');
    this.apiDocCrud = this.request.client('DOCUMENTO_CRUD_SERVICE');
    this.apiGestorDocMid = this.request.client('GESTOR_DOCUMENTAL_MID_SERVICE');

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

  eliminarSolicitudDocente(id: number){
    return this.apiMid.put<any>(`v1/solicitud/cancelar/${id}`, {});
  }

  editarSolicitud(id: number, payload: any) {
    return this.apiMid.put<any>(`v1/solicitud/${id}`, payload);
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

  listarSolicitudesActivasCrud() {
    return this.apiCrud.get<any>('v1/solicitud?query=Activo:true&limit=-1');
  }

  cambiarEstadoSolicitud(payload: any) {
    return this.apiMid.post<any>('v1/solicitud/estados', payload);
  }

  listarHistoricoEstadoPorCodigo(codigoEstado: string) {
    return this.apiCrud.get<any>(
      `v1/historico_estado_solicitud?query=Activo:true,EstadoSolicitudId__CodigoAbreviacion:${codigoEstado}&limit=-1`
    );
  }

  // ========== Documento CRUD ==========

  obtenerTipoDocumentoPorCodigo(codigoAbreviacion: string) {
    return this.apiDocCrud.get<any>(
      `v2/tipo_documento?query=CodigoAbreviacion%3A${codigoAbreviacion}`
    );
  }

  obtenerDocumentoPorEnlace(enlace: string) {
    return this.apiGestorDocMid.get<any>(`v1/document/${encodeURIComponent(enlace)}`);
  }
  
}
