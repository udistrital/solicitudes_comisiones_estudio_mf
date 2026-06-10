import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-aviso-creacion',
  templateUrl: './aviso-creacion.component.html',
  standalone: false
})
export class AvisoCreacionComponent {
  aceptado = false;

  readonly normativa = [
    {
      label: 'Acuerdo CSU 009 de 2007',
      url: 'https://sgral.udistrital.edu.co/xdata/csu/acu_2007-009.pdf',
    },
    {
      label: 'Acuerdo CSU 006 de 2009',
      url: 'https://sgral.udistrital.edu.co/xdata/csu/acu_2009-006.pdf',
    },
    {
      label: 'Acuerdo CA 013 de 2009',
      url: 'https://sgral.udistrital.edu.co/xdata/ca/acu_2009-013.pdf',
    },
  ];

  constructor(private readonly dialogRef: MatDialogRef<AvisoCreacionComponent>) {}

  confirmar(): void {
    if (this.aceptado) {
      this.dialogRef.close(true);
    }
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
