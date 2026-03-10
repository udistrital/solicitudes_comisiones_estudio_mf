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
      const editable = (row: SolicitudRow) =>
        row.estado === 'BORRADOR' || row.estado === 'POR_SUBSANAR';

      return [
        {
          key: 'VER',
          label: 'Ver',
          icon: 'visibility',
          tooltip: 'Ver solicitud',
          visible: (row: SolicitudRow) => !editable(row),
        },
        {
          key: 'EDITAR',
          label: 'Editar',
          icon: 'edit',
          tooltip: 'Editar solicitud',
          visible: editable,
        },
        {
          key: 'ELIMINAR',
          label: 'Eliminar',
          icon: 'delete',
          tooltip: 'Eliminar solicitud',
          color: 'warn',
          visible: (row: SolicitudRow) => row.estado === 'BORRADOR',
        },
        {
          key: 'ENVIAR',
          label: 'Enviar',
          icon: 'send',
          tooltip: 'Enviar solicitud',
          color: 'primary',
          visible: editable,
        },
      ];
    }

    return [{ key: 'GESTIONAR', label: 'Gestionar', icon: 'manage_search', tooltip: 'Gestionar solicitud' }];
  }

  onRoleChange(role: Role) {
    this.selectedRole = role;
  }

  onAction(action: string, row: SolicitudRow) {
    const a = action as BandejaActionKey;

    if (a === 'VER') {
      this.router.navigate(['/solicitudes', row.id], {
        queryParams: { role: this.selectedRole, mode: 'VER' },
      });
      return;
    }

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
      this.popup.confirm(
        `¿Desea eliminar la solicitud <b>${row.radicado}</b>?`,
        'Eliminar',
        'Cancelar'
      ).then((result) => {
        if (result.isConfirmed) {
          this.rows = this.rows.filter((x) => x.id !== row.id);
          this.popup.success(`Solicitud ${row.radicado} eliminada (demo)`);
        }
      });
      return;
    }

    if (a === 'ENVIAR') {
      this.popup.confirm(
        `¿Desea enviar la solicitud <b>${row.radicado}</b>? Una vez enviada, no podrá editarla.`,
        'Enviar',
        'Cancelar'
      ).then((result) => {
        if (result.isConfirmed) {
          row.estado = 'RADICADA';
          this.popup.success(`Solicitud ${row.radicado} enviada (demo)`);
        }
      });
      return;
    }
  }
}
