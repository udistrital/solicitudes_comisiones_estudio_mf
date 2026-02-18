import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-visor-documentos',
  templateUrl: './visor-documentos.component.html',
  styleUrls: ['./visor-documentos.component.css'],
})
export class VisorDocumentosComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}
}
