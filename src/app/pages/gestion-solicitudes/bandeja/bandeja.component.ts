import { Component } from '@angular/core';
import { ROLE_OPTIONS, Role } from '../../../models/roles.model';
import { SolicitudRow } from '../../../models/solicitud.model';
import { ColumnDef, TableAction } from '../../../shared/dynamic-table/dynamic-table.types';
import { BANDEJA_ACTION_DEFS, BandejaActionKey, ROLE_TABLE_CONFIGS } from './bandeja.table-config';

@Component({
  selector: 'app-bandeja',
  templateUrl: './bandeja.component.html',
  styleUrls: ['./bandeja.component.css'],
})
export class BandejaComponent {
  roleOptions = ROLE_OPTIONS;
  selectedRole: Role = 'DOCENTE';

  // DEMO (luego se conecta con SolicitudesService)
  rows: SolicitudRow[] = [
    { id: 101, radicado: 'SOL-2026-0001', docente: 'María Pérez', proyecto: 'Ingeniería de Sistemas', estado: 'BORRADOR', fecha: '2026-02-01' },
    { id: 102, radicado: 'SOL-2026-0002', docente: 'Juan Gómez', proyecto: 'Matemáticas', estado: 'RADICADA', fecha: '2026-02-02' },
    { id: 103, radicado: 'SOL-2026-0003', docente: 'Laura Díaz', proyecto: 'Ingeniería Industrial', estado: 'POR_SUBSANAR', fecha: '2026-02-03' },
    { id: 104, radicado: 'SOL-2026-0004', docente: 'Carlos Ruiz', proyecto: 'Electrónica', estado: 'EN_REVISION', fecha: '2026-02-04' },
    { id: 105, radicado: 'SOL-2026-0005', docente: 'Ana Torres', proyecto: 'Sistemas', estado: 'AVALADA', fecha: '2026-02-05' },
  ];

  get title(): string {
    return ROLE_TABLE_CONFIGS[this.selectedRole].title;
  }

  get columnDefs(): ColumnDef<SolicitudRow>[] {
    return ROLE_TABLE_CONFIGS[this.selectedRole].columns;
  }

  get actions(): TableAction<SolicitudRow>[] {
    return BANDEJA_ACTION_DEFS.map((def) => ({
      key: def.key,
      label: def.label,
      variant: def.variant,
      visible: (row) => this.can(def.key, row),
    }));
  }

  onRoleChange(role: Role) {
    this.selectedRole = role;
  }

  can(action: BandejaActionKey, row: SolicitudRow): boolean {
    const role = this.selectedRole;
    const st = row.estado;

    if (action === 'VER') return true;

    if (role === 'DOCENTE') {
      if (action === 'EDITAR') return st === 'BORRADOR' || st === 'POR_SUBSANAR';
      if (action === 'ENVIAR') return st === 'BORRADOR' || st === 'POR_SUBSANAR';
      return false;
    }

    if (role === 'COORDINACION') {
      if (action === 'REVISAR') return st === 'RADICADA' || st === 'EN_REVISION';
      if (action === 'RETORNAR') return st === 'EN_REVISION';
      if (action === 'AVALAR') return st === 'EN_REVISION';
      return false;
    }

    if (role === 'SECRETARIA_ACADEMICA') {
      if (action === 'REVISAR') return st === 'AVALADA';
      if (action === 'RETORNAR') return st === 'AVALADA';
      if (action === 'AVALAR') return st === 'AVALADA';
      return false;
    }

    if (role === 'SUPERVISION') {
      if (action === 'REVISAR') return st === 'AVALADA';
      if (action === 'AVALAR') return st === 'AVALADA';
      if (action === 'RETORNAR') return st === 'AVALADA';
      return false;
    }

    return false;
  }

  onAction(action: string, row: SolicitudRow) {
    const a = action as BandejaActionKey;
    console.log(`[${this.selectedRole}] Acción: ${a}`, row);
    alert(`[${this.selectedRole}] Acción: ${a}\nRadicado: ${row.radicado}\nEstado: ${row.estado}`);
  }
}
