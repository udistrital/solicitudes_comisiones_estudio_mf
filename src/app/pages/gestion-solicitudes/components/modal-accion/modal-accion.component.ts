import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface ModalAccionData {
  action: string;
  radicado: string;
}

@Component({
  selector: 'app-modal-accion',
  templateUrl: './modal-accion.component.html',
  styleUrls: ['./modal-accion.component.css'],
})
export class ModalAccionComponent {
  comentario = '';

  constructor(
    private ref: MatDialogRef<ModalAccionComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ModalAccionData
  ) {}

  cancelar() {
    this.ref.close(null);
  }

  continuar() {
    this.ref.close({ comentario: this.comentario });
  }
}
