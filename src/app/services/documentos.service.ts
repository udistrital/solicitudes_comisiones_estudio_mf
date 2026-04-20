import { Injectable } from '@angular/core';
import { RequestManager } from '../managers/request.manager';

@Injectable({ providedIn: 'root' })
export class DocumentosService {
  private readonly api: ReturnType<RequestManager['client']>;

  constructor(private readonly request: RequestManager) {
    this.api = this.request.client('DOCUMENTOS_SERVICE');
  }

  listarPorSolicitud(idSolicitud: number) {
    return this.api.get<any[]>(`/solicitudes/${idSolicitud}/documentos`);
  }
}
