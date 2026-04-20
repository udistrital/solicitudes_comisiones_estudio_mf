import { Injectable } from '@angular/core';
import { RequestManager } from '../managers/request.manager';

@Injectable({ providedIn: 'root' })
export class ConfiguracionService {
  private api: ReturnType<RequestManager['client']>;

  constructor(private request: RequestManager) {
    this.api = this.request.client('CONFIGURACION_SERVICE');
  }

  get(endpoint: string) {
    return this.api.get<any>(endpoint);
  }
}
