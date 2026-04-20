import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ConfiguracionService } from '../services/configuracion.service';

@Injectable({ providedIn: 'root' })
export class PermisosUtils {

  constructor(private configuracionService: ConfiguracionService) {}

  /**
   * Verifica si alguno de los roles dados tiene permiso sobre una opción.
   * Consulta perfil_x_menu_opcion en el servicio de configuración.
   */
  tienePermiso(roles: string[], nombreOpcion: string): Observable<boolean> {
    const endpoint = `perfil_x_menu_opcion?limit=-1&query=Opcion__Nombre:${nombreOpcion},Perfil__Nombre__in:${roles.join('|')}`;
    return this.configuracionService.get(endpoint).pipe(
      map((response: any) => {
        const data = response?.Data || response;
        const hasData = Array.isArray(data) && data.length > 0;
        // console.log(`[Permisos] ${nombreOpcion}: result=${hasData}`, '| raw Data:', JSON.stringify(data));
        return hasData;
      }),
      catchError((_err) => {
        // console.warn(`[Permisos] ${nombreOpcion}: ERROR`, _err);
        return of(false);
      })
    );
  }
}
