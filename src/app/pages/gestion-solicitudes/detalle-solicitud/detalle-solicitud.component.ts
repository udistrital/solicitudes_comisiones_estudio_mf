import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-detalle-solicitud',
  templateUrl: './detalle-solicitud.component.html',
  styleUrls: ['./detalle-solicitud.component.css'],
})
export class DetalleSolicitudComponent {
  id = this.route.snapshot.paramMap.get('id');

  constructor(private route: ActivatedRoute) {}
}
