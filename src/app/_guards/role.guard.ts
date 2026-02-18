import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate } from '@angular/router';
import { Role } from '../models/roles.model';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  // DEMO: luego lo conectas con auth real (rol del usuario)
  currentRole: Role = 'DOCENTE';

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const allowed = (route.data['roles'] as Role[] | undefined) ?? [];
    if (allowed.length === 0) return true;
    return allowed.includes(this.currentRole);
  }
}
