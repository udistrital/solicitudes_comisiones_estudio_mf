import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';

import { Role, resolverRolEfectivo } from '../../../models/roles.model';
import { SolicitudRow } from '../../../models/solicitud.model';
import { ColumnDef, TableAction } from '../../../shared/dynamic-table/dynamic-table.types';
import { BandejaActionKey, ROLE_TABLE_CONFIGS } from './bandeja.table-config';
import { PopUpManager } from '../../../managers/popup.manager';
import { SolicitudesService } from '../../../services/solicitudes.service';
import { getDocumento, getRolesUsuario } from '../../../utils/auth.util';
import { mapEstadoNombreACodigo } from '../../../utils/estado-solicitud.util';
import { PermisosUtils } from '../../../utils/role-permissions';

/** Roles que ya tienen endpoint de bandeja */
const ROLES_CON_ENDPOINT: Role[] = ['DOCENTE', 'COORDINADOR', 'SECRETARIA_ACADEMICA', 'SECRETARIA_GENERAL', 'DECANO'];

@Component({
    selector: 'app-bandeja',
    templateUrl: './bandeja.component.html',
    styleUrls: ['./bandeja.component.scss'],
    standalone: false
})
export class BandejaComponent implements OnInit {
  selectedRole: Role | null = null;
  roles: string[] = [];
  rows: SolicitudRow[] = [];
  cargando = false;
  sinIntegracion = false;
  errorCarga = false;

  readonly opcionesPermisos = ['crear_solicitud', 'ver_filtros_tabla'];
  permisos: { [key: string]: boolean } = {};
  permisosListos = false;

  constructor(
    private readonly router: Router,
    private readonly popup: PopUpManager,
    private readonly translate: TranslateService,
    private readonly solicitudesService: SolicitudesService,
    private readonly permisosUtils: PermisosUtils,
  ) {}

  ngOnInit(): void {
    this.roles = getRolesUsuario();
    this.selectedRole = resolverRolEfectivo(this.roles);

    if (!this.selectedRole) {
      return;
    }

    // Carga de datos: inmediata, independiente de permisos
    if (!ROLES_CON_ENDPOINT.includes(this.selectedRole)) {
      this.sinIntegracion = true;
    } else {
      this.cargarSolicitudes();
    }

    // Permisos: una sola consulta bulk, solo controlan visibilidad de botones
    this.permisosUtils.obtenerPermisos(this.roles, this.opcionesPermisos).subscribe({
      next: (permisos) => {
        this.permisos = permisos;
        this.permisosListos = true;
      },
      error: () => {
        this.permisosListos = true;
      },
    });
  }

  // ========== Getters UI ==========

  get title(): string {
    if (!this.selectedRole) return 'BANDEJA.TITLE_SIN_ROL';
    return ROLE_TABLE_CONFIGS[this.selectedRole].title;
  }

  get columnDefs(): ColumnDef<SolicitudRow>[] {
    if (!this.selectedRole) return [];
    return ROLE_TABLE_CONFIGS[this.selectedRole].columns;
  }

  get actions(): TableAction<SolicitudRow>[] {
    if (this.selectedRole === 'DOCENTE') {
      const editable = (row: SolicitudRow) =>
        ['NO_ENV', 'CORR', 'REV_PROY', 'REV_SEC_ACAD', 'SUBS_PROY', 'SUBS_SEC_ACAD', 'SUBS_SEC_GRAL'].includes(row.estado);

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
      ];
    }

    return [{ key: 'GESTIONAR', label: 'ACTIONS.GESTIONAR', icon: 'manage_search', tooltip: 'TOOLTIPS.GESTIONAR_SOLICITUD' }];
  }

  get isDocente(): boolean {
    return this.selectedRole === 'DOCENTE';
  }

  get tieneEndpoint(): boolean {
    return !!this.selectedRole && ROLES_CON_ENDPOINT.includes(this.selectedRole);
  }

  // ========== Carga de datos ==========

  private cargarSolicitudes(): void {
    this.cargando = true;
    this.errorCarga = false;

    // SECRETARIA_GENERAL no requiere cédula (consulta CRUD sin filtro por tercero)
    if (this.selectedRole === 'SECRETARIA_GENERAL') {
      this.solicitudesService.listarHistoricoEstadoPorCodigo('REV_SEC_GRAL').subscribe({
        next: (resp) => this.procesarRespuestaHistorico(resp),
        error: () => this.onErrorCarga(),
      });
      return;
    }

    const cedula = getDocumento();
    if (!cedula) {
      this.errorCarga = true;
      this.cargando = false;
      return;
    }

    switch (this.selectedRole) {
      case 'DOCENTE':
        forkJoin({
          mid: this.solicitudesService.listarSolicitudesDocente(cedula),
          crud: this.solicitudesService.listarSolicitudesActivasCrud(),
        }).subscribe({
          next: ({ mid, crud }) => {
            const activasCrud: any[] = crud?.Data || [];
            const idsActivos = new Set<number>(activasCrud.map((s: any) => s.Id));
            this.procesarRespuestaDocente(mid, idsActivos);
          },
          error: () => this.onErrorCarga(),
        });
        break;

      case 'COORDINADOR':
        this.solicitudesService.listarPendientesCoordinador(cedula).subscribe({
          next: (resp) => this.procesarRespuestaRevisor(resp),
          error: () => this.onErrorCarga(),
        });
        break;

      case 'SECRETARIA_ACADEMICA':
        this.solicitudesService.listarPendientesSecretaria(cedula).subscribe({
          next: (resp) => this.procesarRespuestaRevisor(resp),
          error: () => this.onErrorCarga(),
        });
        break;

      case 'DECANO':
        this.solicitudesService.listarPendientesDecano(cedula).subscribe({
          next: (resp) => this.procesarRespuestaRevisor(resp),
          error: () => this.onErrorCarga(),
        });
        break;

    }
  }

  private procesarRespuestaDocente(resp: any, idsActivos: Set<number>): void {
    const data: any[] = (resp?.Data || []).filter((item: any) => {
      const solicitudId = this.extraerSolicitudIdDocente(item);
      const comisionId = this.extraerComisionIdDocente(item);

      return (solicitudId !== null && idsActivos.has(solicitudId)) || comisionId !== null;
    });

    this.rows = data.reduce((acc: SolicitudRow[], item: any) => {
      const solicitudId = this.extraerSolicitudIdDocente(item);
      if (solicitudId === null) {
        return acc;
      }

      const estadoObj = item.esado_solicitud || item.estado_solicitud || null;
      const estadoNombre = estadoObj?.Nombre || null;
      const estadoCodigo = mapEstadoNombreACodigo(estadoNombre);

      acc.push({
        id: solicitudId,
        comisionId: this.extraerComisionIdDocente(item),
        docente: item.nombre || item.nombre_docente || '',
        idDocente: '',
        proyecto: item.programa || item.proyecto || '',
        estado: estadoCodigo,
        fecha: this.formatFecha(item.fecha_creacion),
      });

      return acc;
    }, []);

    this.cargando = false;
  }

  private procesarRespuestaRevisor(resp: any): void {
    const data: any[] = resp?.Data || [];
    this.rows = data.map((item) => {
      const estadoCodigo = mapEstadoNombreACodigo(item.estado_solicitud);

      return {
        id: item.id,
        docente: item.nombre_docente || '',
        idDocente: item.documento_docente || '',
        proyecto: '',
        estado: estadoCodigo,
        fecha: this.formatFecha(item.fecha_creacion),
      };
    });
    this.cargando = false;
  }

  private procesarRespuestaHistorico(resp: any): void {
    const raw = resp?.Data;
    const data: any[] = Array.isArray(raw) ? raw : [];

    // Deduplicar por solicitud: conservar el registro más reciente
    const porSolicitud = new Map<number, any>();
    for (const item of data) {
      const solId = this.extraerSolicitudId(item);
      if (!solId) continue;
      const existente = porSolicitud.get(solId);
      if (!existente || (item.FechaCreacion > existente.FechaCreacion)) {
        porSolicitud.set(solId, item);
      }
    }

    const items = Array.from(porSolicitud.values());
    if (items.length === 0) {
      this.rows = [];
      this.cargando = false;
      return;
    }

    // Obtener detalle de cada solicitud para resolver nombre y cédula del docente
    const detalleCalls: Record<string, ReturnType<SolicitudesService['obtenerDetalleSolicitud']>> = {};
    for (const item of items) {
      const solId = this.extraerSolicitudId(item)!;
      detalleCalls[String(solId)] = this.solicitudesService.obtenerDetalleSolicitud(solId);
    }

    forkJoin(detalleCalls).subscribe({
      next: (detalles) => {
        this.rows = items.map((item) => {
          const solId = this.extraerSolicitudId(item)!;
          const detalle = detalles[String(solId)]?.Data;
          const { nombre, documento } = this.extraerDocenteDeDetalle(detalle);

          return {
            id: solId,
            docente: nombre,
            idDocente: documento,
            proyecto: '',
            estado: this.extraerEstadoCodigo(item),
            fecha: this.formatFecha(item.SolicitudId?.FechaCreacion || item.FechaCreacion),
          };
        });
        this.cargando = false;
      },
      error: () => {
        // Si falla la consulta de detalles, mostrar filas sin datos de docente
        this.rows = items.map((item) => {
          const solId = this.extraerSolicitudId(item)!;
          return {
            id: solId,
            docente: '',
            idDocente: item.SolicitudId?.TerceroId ? String(item.SolicitudId.TerceroId) : '',
            proyecto: '',
            estado: this.extraerEstadoCodigo(item),
            fecha: this.formatFecha(item.SolicitudId?.FechaCreacion || item.FechaCreacion),
          };
        });
        this.cargando = false;
      },
    });
  }

  /** Extrae el ID de solicitud sin importar si SolicitudId es un objeto o un entero */
  private extraerSolicitudId(item: any): number | null {
    if (!item) return null;
    const raw = item.SolicitudId;
    if (typeof raw === 'number') return raw;
    if (typeof raw === 'object' && raw?.Id) return raw.Id;
    return null;
  }

  /** Extrae el código de estado del histórico, manejando objeto o entero */
  private extraerEstadoCodigo(item: any): string {
    const estado = item.EstadoSolicitudId;
    if (typeof estado === 'object' && estado?.CodigoAbreviacion) {
      return estado.CodigoAbreviacion;
    }
    return 'REV_SEC_GRAL';
  }

  private extraerSolicitudIdDocente(item: any): number | null {
    if (!item) return null;

    const candidatos = [
      item.solicitud_id,
      item.solicitudId,
      item.id_solicitud,
      item.SolicitudId?.Id,
      item.SolicitudId?.id,
      item.solicitud?.Id,
      item.solicitud?.id,
      item.id,
    ];

    for (const candidato of candidatos) {
      if (typeof candidato === 'number' && Number.isFinite(candidato)) {
        return candidato;
      }
    }

    return null;
  }

  private extraerComisionIdDocente(item: any): number | null {
    if (!item) return null;

    const candidatos = [
      item.comision_id,
      item.comisionId,
      item.ComisionId?.Id,
      item.ComisionId?.id,
      item.comision?.Id,
      item.comision?.id,
    ];

    for (const candidato of candidatos) {
      if (typeof candidato === 'number' && Number.isFinite(candidato)) {
        return candidato;
      }
    }

    return null;
  }

  private extraerDocenteDeDetalle(data: any): { nombre: string; documento: string } {
    if (!data) return { nombre: '', documento: '' };

    // Intentar extraer del Formulario (JSON string con datos del FR-010)
    if (data.Formulario && typeof data.Formulario === 'string') {
      try {
        const parsed = JSON.parse(data.Formulario);
        const sol = parsed.solicitante || {};
        const nombre = sol.q3_nombres_apellidos || '';
        const documento = sol.q4_documento_identificacion || '';
        if (nombre || documento) {
          return { nombre, documento };
        }
      } catch { /* fallback abajo */ }
    }

    // Fallback: TerceroId de la solicitud
    const terceroId = data.Solicitud?.TerceroId;
    return { nombre: '', documento: terceroId ? String(terceroId) : '' };
  }

  private onErrorCarga(): void {
    this.cargando = false;
    this.errorCarga = true;
    this.popup.error(this.translate.instant('BANDEJA.ERROR_CARGAR'));
  }

  private formatFecha(raw: string | null | undefined): string {
    if (!raw) return '';
    // Backend: "2026-03-20 09:13:44.51431 +0000 +0000" → extraer YYYY-MM-DD
    return raw.split(' ')[0] || '';
  }

  // ========== Acciones ==========

  crearSolicitud(): void {
    if (this.permisosListos && !this.permisos['crear_solicitud']) {
      this.popup.error(this.translate.instant('GLOBAL.acceso_denegado'));
      return;
    }

    const cedula = getDocumento();
    if (!cedula) {
      this.popup.error(this.translate.instant('POPUPS.ERROR_SIN_IDENTIFICACION'));
      return;
    }

    this.cargando = true;

    const payload = {
      identificacion: Number(cedula),
      cod_abreviacion_tipo_solicitud: 'SOL_INI',
      observacion: '',
      cod_abreviacion_rol: 'DOCENTE',
      documento_solicitud: [],
    };

    this.solicitudesService.crearSolicitud(payload).subscribe({
      next: (resp: any) => {
        this.cargando = false;

        const nuevaId =
          resp?.Data?.Id ||
          resp?.Data?.id ||
          resp?.Data?.Solicitud?.Id ||
          resp?.Data?.solicitud?.Id;

        if (!nuevaId) {
          this.popup.error('La solicitud se creó, pero no fue posible obtener el ID.');
          return;
        }

        this.router.navigate(['/solicitudes', nuevaId], {
          queryParams: { mode: 'EDITAR' },
        });
      },
      error: () => {
        this.cargando = false;
        this.popup.error(this.translate.instant('POPUPS.ERROR_GUARDAR'));
      },
    });
  }

  onAction(action: string, row: SolicitudRow) {
    const a = action as BandejaActionKey;

    if (a === 'VER') {
      this.router.navigate(['/solicitudes', row.id], {
        queryParams: { mode: 'VER' },
      });
      return;
    }

    if (a === 'EDITAR') {
      this.router.navigate(['/solicitudes', row.id], {
        queryParams: { mode: 'EDITAR' },
      });
      return;
    }

    if (a === 'GESTIONAR') {
      this.router.navigate(['/solicitudes', row.id], {
        queryParams: { mode: 'GESTIONAR' },
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
          this.cargando = true;
          this.solicitudesService.eliminarSolicitudDocente(row.id).subscribe({
            next: () => {
              this.rows = this.rows.filter((x) => x.id !== row.id);
              this.cargando = false;
              this.popup.success(this.translate.instant('POPUPS.SOLICITUD_ELIMINADA', { id: row.id }));
            },
            error: () => {
              this.cargando = false;
              this.popup.error(this.translate.instant('POPUPS.ERROR_ELIMINAR'));
            },
          });
        }
      });
      return;
    }

  }
}
