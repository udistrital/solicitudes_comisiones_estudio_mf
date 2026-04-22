import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EmptyRouteComponent } from './empty-route/empty-route.component';
import { BandejaComponent } from './pages/gestion-solicitudes/bandeja/bandeja.component';
import { DetalleSolicitudComponent } from './pages/gestion-solicitudes/detalle-solicitud/detalle-solicitud.component';
import { APP_BASE_HREF } from '@angular/common';


const routes: Routes = [
  { path: '', redirectTo: 'solicitudes', pathMatch: 'full' },
  { path: 'solicitudes', component: BandejaComponent },
  { path: 'solicitudes/:id', component: DetalleSolicitudComponent },
  { path: '**', component: EmptyRouteComponent },
];

export function appBaseHrefFactory(): string {
  const p = window.location.pathname || '/';
  // cuando corre dentro del root-config
  if (p.startsWith('/comisiones')) return '/comisiones';
  // cuando corre standalone (ng serve directo al puerto 4224)
  return '/';
}

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
  providers: [
  { provide: APP_BASE_HREF, useFactory: appBaseHrefFactory }    
  ],

})
export class AppRoutingModule {}
