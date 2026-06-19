import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { catchError, forkJoin, of } from 'rxjs';

import { Role, resolverRolEfectivo } from '../../../models/roles.model';
import { SolicitudRow } from '../../../models/solicitud.model';
import { ColumnDef, TableAction } from '../../../shared/dynamic-table/dynamic-table.types';
import { BandejaActionKey, ROLE_TABLE_CONFIGS } from './bandeja.table-config';
import { PopUpManager } from '../../../managers/popup.manager';
import { SolicitudesService } from '../../../services/solicitudes.service';
import { getDocumento, getCorreoSesion, getRolesUsuario } from '../../../utils/auth.util';
import { mapEstadoNombreACodigo } from '../../../utils/estado-solicitud.util';
import { PermisosUtils } from '../../../utils/role-permissions';
import { AvisoCreacionComponent } from '../components/aviso-creacion/aviso-creacion.component';
import { NotificacionesService } from '../../../services/notificaciones.service';
import { DocenteInfoService } from '../../../services/docente-info.service';

/** Roles que ya tienen endpoint de bandeja (excluye ADMIN_SGA que usa su propio flujo) */
const ROLES_CON_ENDPOINT: Role[] = ['DOCENTE', 'SECRETARIA_ACADEMICA', 'SECRETARIA_GENERAL', 'DECANO'];

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

  // ADMIN_SGA
  isAdminSga = false;
  rolEmulado: Role | null = null;
  cedulaBusqueda = '';
  cedulasHistorial: string[] = [];
  readonly rolesEmulables: Role[] = ['DOCENTE', 'SECRETARIA_ACADEMICA', 'SECRETARIA_GENERAL', 'DECANO'];
  private readonly SK_ROL = 'admin_sga_rol_emulado';
  private readonly SK_CEDULA = 'admin_sga_cedula';
  private readonly SK_CEDULAS = 'admin_sga_cedulas';

  readonly opcionesPermisos = ['crear_solicitud', 'ver_filtros_tabla'];
  permisos: { [key: string]: boolean } = {};
  permisosListos = false;
  
  tieneSolicitudActiva = false;
  tieneComisionEnCurso = false;

  get bloquearCreacionSolicitud(): boolean {
    return this.tieneSolicitudActiva || this.tieneComisionEnCurso;
  }

  constructor(
    private readonly router: Router,
    private readonly dialog: MatDialog,
    private readonly popup: PopUpManager,
    private readonly translate: TranslateService,
    private readonly solicitudesService: SolicitudesService,
    private readonly permisosUtils: PermisosUtils,
    private readonly notificaciones: NotificacionesService,
    private readonly docenteInfoService: DocenteInfoService,
  ) {}

  ngOnInit(): void {
    this.roles = getRolesUsuario();
    this.selectedRole = resolverRolEfectivo(this.roles);

    if (!this.selectedRole) {
      return;
    }

    this.isAdminSga = this.selectedRole === 'ADMIN_SGA';

    if (this.isAdminSga) {
      this.cargando = false;

      // Restaurar estado de sesión anterior
      const savedRol = sessionStorage.getItem(this.SK_ROL) as Role | null;
      const savedCedula = sessionStorage.getItem(this.SK_CEDULA) || '';
      try { this.cedulasHistorial = JSON.parse(sessionStorage.getItem(this.SK_CEDULAS) || '[]'); } catch { this.cedulasHistorial = []; }

      if (savedRol && (this.rolesEmulables as string[]).includes(savedRol)) {
        this.rolEmulado = savedRol;
        this.cedulaBusqueda = savedRol === 'DOCENTE' ? savedCedula : '';
        if (savedRol !== 'DOCENTE') {
          this.cargarComoAdminSga();
        } else if (savedCedula) {
          this.cargarComoAdminSga();
        }
      }

      this.permisosUtils.obtenerPermisos(this.roles, this.opcionesPermisos).subscribe({
        next: (permisos) => { this.permisos = permisos; this.permisosListos = true; },
        error: () => { this.permisosListos = true; },
      });
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
    if (this.isAdminSga) {
      const rol = this.rolEmulado ?? 'SECRETARIA_ACADEMICA';
      return ROLE_TABLE_CONFIGS[rol].columns;
    }
    return ROLE_TABLE_CONFIGS[this.selectedRole].columns;
  }

  get actions(): TableAction<SolicitudRow>[] {
    if (this.isAdminSga) {
      return [{ key: 'VER', label: 'ACTIONS.VER', icon: 'visibility', tooltip: 'TOOLTIPS.VER_SOLICITUD' }];
    }

    if (this.selectedRole === 'DOCENTE') {
      const editable = (row: SolicitudRow) =>
        ['NO_ENV', 'CORR', 'REV_SEC_ACAD', 'SUBS_SEC_ACAD', 'SUBS_SEC_GRAL'].includes(row.estado);

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
    if (this.isAdminSga) return this.rolEmulado === 'DOCENTE';
    return this.selectedRole === 'DOCENTE';
  }

  get tieneEndpoint(): boolean {
    if (this.isAdminSga) return !!this.rolEmulado;
    return !!this.selectedRole && ROLES_CON_ENDPOINT.includes(this.selectedRole);
  }

  // ========== ADMIN_SGA ==========

  onRolEmuladoSeleccionado(rol: Role): void {
    this.rolEmulado = rol;
    this.rows = [];
    this.errorCarga = false;
    sessionStorage.setItem(this.SK_ROL, rol);

    if (rol === 'DOCENTE') {
      this.cedulaBusqueda = sessionStorage.getItem(this.SK_CEDULA) || '';
    } else {
      this.cedulaBusqueda = '';
      this.cargarComoAdminSga();
    }
  }

  buscarComoDocente(): void {
    const cedula = this.cedulaBusqueda.trim();
    if (!cedula) {
      this.popup.error(this.translate.instant('ADMIN_SGA.ERROR_SIN_CEDULA'));
      return;
    }
    sessionStorage.setItem(this.SK_CEDULA, cedula);
    if (!this.cedulasHistorial.includes(cedula)) {
      this.cedulasHistorial = [cedula, ...this.cedulasHistorial].slice(0, 5);
      sessionStorage.setItem(this.SK_CEDULAS, JSON.stringify(this.cedulasHistorial));
    }
    this.cargarComoAdminSga();
  }

  private cargarComoAdminSga(): void {
    if (!this.rolEmulado) return;

    this.cargando = true;
    this.errorCarga = false;
    this.rows = [];

    if (this.rolEmulado === 'DOCENTE') {
      forkJoin({
        mid: this.solicitudesService.listarSolicitudesDocente(this.cedulaBusqueda),
        crud: this.solicitudesService.listarSolicitudesActivasCrud(),
      }).subscribe({
        next: ({ mid, crud }) => {
          const activasCrud: any[] = crud?.Data || [];
          const idsActivos = new Set<number>(activasCrud.map((s: any) => s.Id));
          this.procesarRespuestaDocente(mid, idsActivos);
        },
        error: () => this.onErrorCarga(),
      });
      return;
    }

    const estadoPorRol: Partial<Record<Role, string>> = {
      SECRETARIA_ACADEMICA: 'REV_SEC_ACAD',
      SECRETARIA_GENERAL:   'REV_SEC_GRAL',
      DECANO:               'REV_DEC',
    };

    const estadoCodigo = estadoPorRol[this.rolEmulado];
    if (!estadoCodigo) {
      this.cargando = false;
      return;
    }

    forkJoin({
      historico: this.solicitudesService.listarHistoricoEstadoPorCodigo(estadoCodigo),
      crud: this.solicitudesService.listarSolicitudesActivasCrud(),
    }).subscribe({
      next: ({ historico, crud }) => {
        const idsActivos = new Set<number>((crud?.Data || []).map((s: any) => s.Id));
        this.procesarRespuestaHistorico(historico, idsActivos);
      },
      error: () => this.onErrorCarga(),
    });
  }

  // ========== Carga de datos ==========

  private cargarSolicitudes(): void {
    this.cargando = true;
    this.errorCarga = false;

    // SECRETARIA_GENERAL no requiere cédula (consulta CRUD sin filtro por tercero)
    if (this.selectedRole === 'SECRETARIA_GENERAL') {
      forkJoin({
        historico: this.solicitudesService.listarHistoricoEstadoPorCodigo('REV_SEC_GRAL'),
        crud: this.solicitudesService.listarSolicitudesActivasCrud(),
      }).subscribe({
        next: ({ historico, crud }) => {
          const idsActivos = new Set<number>((crud?.Data || []).map((s: any) => s.Id));
          this.procesarRespuestaHistorico(historico, idsActivos);
        },
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
    const data: any[] = Array.isArray(resp?.Data) ? resp.Data : [];

    const filasBase = data.reduce((acc: SolicitudRow[], item: any) => {
      const solicitudId = this.extraerSolicitudIdDocente(item);

      if (solicitudId === null) {
        return acc;
      }

      const estadoObj = item.esado_solicitud || item.estado_solicitud || null;
      const estadoNombre = estadoObj?.Nombre || null;

      acc.push({
        id: solicitudId,
        comisionId: this.extraerComisionIdDocente(item),
        docente: item.nombre || item.nombre_docente || '',
        idDocente: '',
        proyecto: item.programa || item.proyecto || '',
        estado: mapEstadoNombreACodigo(estadoNombre),
        fecha: this.formatFecha(item.fecha_creacion),
        tipoSolicitudCodigo: '',
        tipoSolicitudNombre: '',
      });

      return acc;
    }, []);

    this.tieneSolicitudActiva = filasBase.some((fila) =>
      idsActivos.has(fila.id)
    );
    this.tieneComisionEnCurso = false;

    if (filasBase.length === 0) {
      this.rows = [];
      this.cargando = false;
      return;
    }

    const detalleCalls: Record<
      string,
      ReturnType<SolicitudesService['obtenerDetalleSolicitud']>
    > = {};

    for (const fila of filasBase) {
      detalleCalls[String(fila.id)] =
        this.solicitudesService.obtenerDetalleSolicitud(fila.id).pipe(
          catchError(() => of(null))
        );
    }

    forkJoin(detalleCalls).subscribe({
      next: (detalles) => {
        this.tieneComisionEnCurso = filasBase.some((fila) =>
          this.esComisionEnCurso(detalles[String(fila.id)]?.Data)
        );

        this.rows = filasBase
          .filter((fila) => {
            const detalle = detalles[String(fila.id)]?.Data;

            return idsActivos.has(fila.id) ||
              this.esComisionEnCurso(detalle);
          })
          .map((fila) => {
            const detalle = detalles[String(fila.id)]?.Data;
            const codigoTipo =
              this.extraerTipoSolicitudCodigo(detalle?.Solicitud) ||
              fila.tipoSolicitudCodigo ||
              '';

            return {
              ...fila,
              comisionId:
                this.extraerComisionIdDocente(detalle) ??
                fila.comisionId,
              tipoSolicitudCodigo: codigoTipo,
              tipoSolicitudNombre: this.nombreTipoSolicitud(codigoTipo),
            };
          });

        this.cargando = false;
      },
      error: () => {
        // Si fallan los detalles, se conserva al menos la validación
        // de solicitudes activas obtenida desde el CRUD.
        this.tieneComisionEnCurso = false;
        this.rows = filasBase.filter((fila) => idsActivos.has(fila.id));
        this.cargando = false;
      },
    });
  }

  private procesarRespuestaRevisor(resp: any): void {
    const data: any[] = resp?.Data || [];

    if (data.length === 0) {
      this.rows = [];
      this.cargando = false;
      return;
    }

    const detalleCalls: Record<string, ReturnType<SolicitudesService['obtenerDetalleSolicitud']>> = {};

    for (const item of data) {
      const solicitudId = item.id;
      if (solicitudId) {
        detalleCalls[String(solicitudId)] = this.solicitudesService.obtenerDetalleSolicitud(solicitudId);
      }
    }

    forkJoin(detalleCalls).subscribe({
      next: (detalles) => {
        this.rows = data.map((item) => {
          const estadoCodigo = mapEstadoNombreACodigo(item.estado_solicitud);
          const detalle = detalles[String(item.id)]?.Data;
          const codigoTipo = this.extraerTipoSolicitudCodigo(detalle?.Solicitud);

          return {
            id: item.id,
            docente: item.nombre_docente || '',
            idDocente: item.documento_docente || '',
            proyecto: '',
            estado: estadoCodigo,
            fecha: this.formatFecha(item.fecha_creacion),
            tipoSolicitudCodigo: codigoTipo,
            tipoSolicitudNombre: this.nombreTipoSolicitud(codigoTipo),
          };
        });

        this.cargando = false;
      },
      error: () => {
        this.rows = data.map((item) => {
          const estadoCodigo = mapEstadoNombreACodigo(item.estado_solicitud);
          const codigoTipo = this.extraerTipoSolicitudCodigo(item);

          return {
            id: item.id,
            docente: item.nombre_docente || '',
            idDocente: item.documento_docente || '',
            proyecto: '',
            estado: estadoCodigo,
            fecha: this.formatFecha(item.fecha_creacion),
            tipoSolicitudCodigo: codigoTipo,
            tipoSolicitudNombre: this.nombreTipoSolicitud(codigoTipo),
          };
        });

        this.cargando = false;
      },
    });
  }

  private procesarRespuestaHistorico(resp: any, idsActivos?: Set<number>): void {
    const raw = resp?.Data;
    const data: any[] = Array.isArray(raw) ? raw : [];

    // Deduplicar por solicitud: conservar el registro más reciente
    const porSolicitud = new Map<number, any>();
    for (const item of data) {
      const solId = this.extraerSolicitudId(item);
      if (!solId) continue;
      if (idsActivos && !idsActivos.has(solId)) continue;
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
          const codigoTipo = this.extraerTipoSolicitudCodigo(detalle?.Solicitud);
          const { nombre, documento } = this.extraerDocenteDeDetalle(detalle);

          return {
            id: solId,
            docente: nombre,
            idDocente: documento,
            proyecto: '',
            estado: this.extraerEstadoCodigo(item),
            fecha: this.formatFecha(item.SolicitudId?.FechaCreacion || item.FechaCreacion),
            tipoSolicitudCodigo: codigoTipo,
            tipoSolicitudNombre: this.nombreTipoSolicitud(codigoTipo),
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
      item.Solicitud?.ComisionId?.Id,
      item.Solicitud?.ComisionId?.id,
      item.solicitud?.comision_id?.Id,
      item.solicitud?.comision_id?.id,
    ];

    for (const candidato of candidatos) {
      if (typeof candidato === 'number' && Number.isFinite(candidato)) {
        return candidato;
      }
    }

    return null;
  }

  private esComisionEnCurso(detalle: any): boolean {
    const comision =
      detalle?.Comision ||
      detalle?.comision ||
      detalle?.Solicitud?.ComisionId ||
      detalle?.solicitud?.comision_id;

    const comisionId = this.extraerComisionIdDocente(detalle);

    if (!comision || comisionId === null) {
      return false;
    }

    if (comision.Activo === false || comision.activo === false) {
      return false;
    }

    const fechaFinalRaw =
      comision.FechaFinal ||
      comision.fecha_final ||
      comision.fechaFinal;

    // Si existe una comisión activa sin fecha final, se bloquea por seguridad.
    if (!fechaFinalRaw) {
      return true;
    }

    const fechaFinal = new Date(fechaFinalRaw);

    // Una fecha no interpretable no debe permitir crear otra comisión.
    if (isNaN(fechaFinal.getTime())) {
      return true;
    }

    fechaFinal.setHours(23, 59, 59, 999);

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    return fechaFinal >= hoy;
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

  private extraerTipoSolicitudCodigo(source: any): string {
    return String(
      source?.TipoSolicitudId?.CodigoAbreviacion ||
      source?.TipoSolicitudId?.codigo_abreviacion ||
      source?.tipo_solicitud?.CodigoAbreviacion ||
      source?.tipo_solicitud?.codigo_abreviacion ||
      source?.tipo_solicitud ||
      source?.cod_abreviacion_tipo_solicitud ||
      ''
    ).trim().toUpperCase();
  }

  private nombreTipoSolicitud(codigo: string): string {
    switch (String(codigo || '').trim().toUpperCase()) {
      case 'SOL_INI':
        return 'Solicitud de comision';
      case 'SOL_PRORROGA':
        return 'Solicitud de prorroga';
      case 'SOL_CIERRE':
        return 'Solicitud de cierre';
      default:
        return codigo || '';
    }
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

    if (this.bloquearCreacionSolicitud) {
      this.popup.error(
        this.translate.instant('POPUPS.SOLICITUD_O_COMISION_ACTIVA')
      );
      return;
    }

    const cedula = getDocumento();
    if (!cedula) {
      this.popup.error(this.translate.instant('POPUPS.ERROR_SIN_IDENTIFICACION'));
      return;
    }

    const dialogRef = this.dialog.open(AvisoCreacionComponent, {
      width: '600px',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((aceptado: boolean) => {
      if (!aceptado) return;

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

          this.enviarNotificacionCreacion(String(cedula), nuevaId);

          this.router.navigate(['/solicitudes', nuevaId], {
            queryParams: { mode: 'EDITAR' },
          });
        },
        error: () => {
          this.cargando = false;
          this.popup.error(this.translate.instant('POPUPS.ERROR_GUARDAR'));
        },
      });
    });
  }

  onAction(action: string, row: SolicitudRow) {
    const a = action as BandejaActionKey;

    if (a === 'VER') {
      this.router.navigate(['/solicitudes', row.id], { queryParams: { mode: 'VER' } });
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
    }
  }

  private enviarNotificacionCreacion(cedula: string, solicitudId: number): void {
    const emailDocente = getCorreoSesion() ?? '';
    const role = this.selectedRole ?? 'DOCENTE';

    this.docenteInfoService.consultarDocentePlanta(cedula).subscribe({
      next: (info) => {
        const nombre = [info?.nombres, info?.apellidos].filter(Boolean).join(' ') || emailDocente;
        const data = {
          nombre_docente: nombre,
          id_solicitud: String(solicitudId),
          tipo_solicitud: this.notificaciones.tipoSolicitudLabel('SOL_INI'),
          instancia: this.notificaciones.instanciaLabel(role),
          observaciones: '',
          url_sistema: this.notificaciones.urlDocente(solicitudId),
          fecha: this.notificaciones.fechaActual(),
        };
        this.notificaciones.notificarSolicitudCreada(emailDocente, data);
      },
      error: () => {
        const data = {
          nombre_docente: emailDocente,
          id_solicitud: String(solicitudId),
          tipo_solicitud: this.notificaciones.tipoSolicitudLabel('SOL_INI'),
          instancia: this.notificaciones.instanciaLabel(role),
          observaciones: '',
          url_sistema: this.notificaciones.urlDocente(solicitudId),
          fecha: this.notificaciones.fechaActual(),
        };
        this.notificaciones.notificarSolicitudCreada(emailDocente, data);
      },
    });
  }
}
