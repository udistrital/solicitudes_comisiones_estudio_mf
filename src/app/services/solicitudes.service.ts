import { Injectable } from '@angular/core';
import { RequestManager } from '../managers/request.manager';
import { Role } from '../models/roles.model';
import { SolicitudRow } from '../models/solicitud.model';

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

  // DEMO: ajustas endpoints reales cuando los tengas
  listarBandeja(role: Role) {
    return this.api.get<SolicitudRow[]>(`/solicitudes?role=${role}`);
  }

  obtenerDetalle(id: number) {
    return this.api.get<any>(`/solicitudes/${id}`);
  }

  crearSolicitud(payload: any) {
    return this.apiMid.post<any>('v1/solicitud/crear_solicitud', payload);
  }

  listarTiposDocumentoSolicitud() {
    return this.apiCrud.get<any>('v1/tipo_documento_solicitud');
  }
}
