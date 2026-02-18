import { Injectable } from '@angular/core';
import { RequestManager } from '../managers/request.manager';
import { Role } from '../models/roles.model';
import { SolicitudRow } from '../models/solicitud.model';

@Injectable({ providedIn: 'root' })
export class SolicitudesService {
  private api: ReturnType<RequestManager['client']>;

  constructor(private request: RequestManager) {
    this.api = this.request.client('SOLICITUDES_SERVICE');
  }

  // DEMO: ajustas endpoints reales cuando los tengas
  listarBandeja(role: Role) {
    return this.api.get<SolicitudRow[]>(`/solicitudes?role=${role}`);
  }

  obtenerDetalle(id: number) {
    return this.api.get<any>(`/solicitudes/${id}`);
  }
}
