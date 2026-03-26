import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
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
    { id: 101, idDocente: '86064919', docente: 'María Pérez', proyecto: 'Ingeniería de Sistemas', estado: 'NO_ENV', fecha: '2026-02-01' },
    { id: 102, idDocente: '1032456789', docente: 'Juan Gómez', proyecto: 'Matemáticas', estado: 'RAD', fecha: '2026-02-02' },
    { id: 103, idDocente: '52834567', docente: 'Laura Díaz', proyecto: 'Ingeniería Industrial', estado: 'CORR', fecha: '2026-02-03' },
    { id: 104, idDocente: '79512345', docente: 'Carlos Ruiz', proyecto: 'Electrónica', estado: 'REV_PROY', fecha: '2026-02-04' },
    { id: 105, idDocente: '1019876543', docente: 'Ana Torres', proyecto: 'Sistemas', estado: 'APROB_EJEC', fecha: '2026-02-05' },
  ];

  constructor(
    private router: Router,
    private popup: PopUpManager,
    private translate: TranslateService,
  ) {}

  get title(): string {
    return ROLE_TABLE_CONFIGS[this.selectedRole].title;
  }

  get columnDefs(): ColumnDef<SolicitudRow>[] {
    return ROLE_TABLE_CONFIGS[this.selectedRole].columns;
  }

  get actions(): TableAction<SolicitudRow>[] {
    if (this.selectedRole === 'DOCENTE') {
      const editable = (row: SolicitudRow) =>
        row.estado === 'NO_ENV' || row.estado === 'CORR';

      return [
        {
          key: 'VER',
          label: 'ACTIONS.VER',
          icon: 'visibility',
          tooltip: 'TOOLTIPS.VER_SOLICITUD',
          visible: (row: SolicitudRow) => !editable(row),
        },
        {
          key: 'EDITAR',
          label: 'ACTIONS.EDITAR',
          icon: 'edit',
          tooltip: 'TOOLTIPS.EDITAR_SOLICITUD',
          visible: editable,
        },
        {
          key: 'ELIMINAR',
          label: 'ACTIONS.ELIMINAR',
          icon: 'delete',
          tooltip: 'TOOLTIPS.ELIMINAR_SOLICITUD',
          color: 'warn',
          visible: (row: SolicitudRow) => row.estado === 'NO_ENV',
        },
        {
          key: 'ENVIAR',
          label: 'ACTIONS.ENVIAR',
          icon: 'send',
          tooltip: 'TOOLTIPS.ENVIAR_SOLICITUD',
          color: 'primary',
          visible: editable,
        },
      ];
    }

    return [{ key: 'GESTIONAR', label: 'ACTIONS.GESTIONAR', icon: 'manage_search', tooltip: 'TOOLTIPS.GESTIONAR_SOLICITUD' }];
  }

  onRoleChange(role: Role) {
    this.selectedRole = role;
  }

  crearSolicitud(): void {
    this.router.navigate(['/solicitudes', 'nuevo'], {
      queryParams: { role: 'DOCENTE', mode: 'EDITAR' },
    });
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
        this.translate.instant('POPUPS.ELIMINAR_SOLICITUD_MSG', { id: row.id }),
        this.translate.instant('ACTIONS.ELIMINAR'),
        this.translate.instant('ACTIONS.CANCELAR'),
      ).then((result) => {
        if (result.isConfirmed) {
          this.rows = this.rows.filter((x) => x.id !== row.id);
          this.popup.success(this.translate.instant('POPUPS.SOLICITUD_ELIMINADA', { id: row.id }));
        }
      });
      return;
    }

    if (a === 'ENVIAR') {
      this.popup.confirm(
        this.translate.instant('POPUPS.ENVIAR_SOLICITUD_MSG', { id: row.id }),
        this.translate.instant('ACTIONS.ENVIAR'),
        this.translate.instant('ACTIONS.CANCELAR'),
      ).then((result) => {
        if (result.isConfirmed) {
          row.estado = 'RAD';
          this.popup.success(this.translate.instant('POPUPS.SOLICITUD_ENVIADA', { id: row.id }));
        }
      });
      return;
    }
  }
}
