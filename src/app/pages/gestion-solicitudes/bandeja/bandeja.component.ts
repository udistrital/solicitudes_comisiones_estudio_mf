import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ROLE_OPTIONS, Role } from '../../../models/roles.model';
import { SolicitudRow } from '../../../models/solicitud.model';
import { ColumnDef, TableAction } from '../../../shared/dynamic-table/dynamic-table.types';
import { BandejaActionKey, ROLE_TABLE_CONFIGS } from './bandeja.table-config';
import { PopUpManager } from '../../../managers/popup.manager';

@Component({
  selector: 'app-bandeja',
  templateUrl: './bandeja.component.html',
  styleUrls: ['./bandeja.component.scss'],
})
export class BandejaComponent {
  roleOptions = ROLE_OPTIONS;
  selectedRole: Role = 'DOCENTE';

  rows: SolicitudRow[] = [
    { id: 101, radicado: 'SOL-2026-0001', docente: 'María Pérez', proyecto: 'Ingeniería de Sistemas', estado: 'BORRADOR', fecha: '2026-02-01' },
    { id: 102, radicado: 'SOL-2026-0002', docente: 'Juan Gómez', proyecto: 'Matemáticas', estado: 'RADICADA', fecha: '2026-02-02' },
    { id: 103, radicado: 'SOL-2026-0003', docente: 'Laura Díaz', proyecto: 'Ingeniería Industrial', estado: 'POR_SUBSANAR', fecha: '2026-02-03' },
    { id: 104, radicado: 'SOL-2026-0004', docente: 'Carlos Ruiz', proyecto: 'Electrónica', estado: 'EN_REVISION', fecha: '2026-02-04' },
    { id: 105, radicado: 'SOL-2026-0005', docente: 'Ana Torres', proyecto: 'Sistemas', estado: 'AVALADA', fecha: '2026-02-05' },
  ];

  constructor(private router: Router, private popup: PopUpManager) {}

  get title(): string {
    return ROLE_TABLE_CONFIGS[this.selectedRole].title;
  }

  get columnDefs(): ColumnDef<SolicitudRow>[] {
    return ROLE_TABLE_CONFIGS[this.selectedRole].columns;
  }

  get actions(): TableAction<SolicitudRow>[] {
    if (this.selectedRole === 'DOCENTE') {
      return [
        { key: 'EDITAR', label: 'Editar', variant: 'stroked' },
        {
          key: 'ELIMINAR',
          label: 'Eliminar',
          variant: 'stroked',
          visible: (row) => row.estado === 'BORRADOR',
        },
        { key: 'ENVIAR', label: 'Enviar', variant: 'flat' },
      ];
    }

    return [{ key: 'GESTIONAR', label: 'Gestionar', variant: 'stroked' }];
  }

  onRoleChange(role: Role) {
    this.selectedRole = role;
  }

  onAction(action: string, row: SolicitudRow) {
    const a = action as BandejaActionKey;

    if (a === 'EDITAR') {
      this.router.navigate(['/solicitudes', row.id], {
        queryParams: { role: this.selectedRole, mode: 'EDITAR' },
      });
      return;
    }

    if (a === 'GESTIONAR') {
      this.router.navigate(['/solicitudes', row.id], {
        queryParams: { role: this.selectedRole, mode: 'GESTIONAR' },
      });
      return;
    }

    if (a === 'ELIMINAR') {
      // hardcodeado: elimina visualmente
      this.rows = this.rows.filter((x) => x.id !== row.id);
      this.popup.success(`Solicitud ${row.radicado} eliminada (demo)`);
      return;
    }

    if (a === 'ENVIAR') {
      // hardcodeado: cambia estado
      row.estado = 'RADICADA';
      this.popup.success(`Solicitud ${row.radicado} enviada (demo)`);
      return;
    }
  }
}