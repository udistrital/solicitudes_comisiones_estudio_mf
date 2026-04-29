import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';

import { Role, resolverRolEfectivo } from '../../../models/roles.model';
import { EstadoSolicitud, EstadoDocumento } from '../../../models/estados.model';
import { PopUpManager } from '../../../managers/popup.manager';
import { estadoSolicitudClass, estadoDocumentoClass, mapEstadoNombreACodigo } from '../../../utils/estado-solicitud.util';

import { VisorDocumentosComponent } from '../components/visor-documentos/visor-documentos.component';
import { Fr010FormComponent } from '../components/fr010-form/fr010-form.component';
import { SolicitudesService } from '../../../services/solicitudes.service';
import { getDocumento, getRolesUsuario } from '../../../utils/auth.util';
import { PermisosUtils } from '../../../utils/role-permissions';

import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

type AccionEstado = 'ENVIAR' | 'RETORNAR' | 'RECHAZAR' | 'DAR_INICIO';

// Códigos de tipo documental — FR010 es fijo del frontend,
// el resto viene dinámicamente del CRUD (tipo_documento_solicitud)
type TipoDocumentalFijo = 'FR010';
type TipoDocumentalCode = TipoDocumentalFijo | string;

interface DocumentoItem {
  id: number;
  nombre: string;
  autorSoporte?: string;
  estado: EstadoDocumento;
  checked: boolean; // usado por revisores

  // campos para manejo temporal en front
  code?: TipoDocumentalCode;
  idTipoDocumento?: number;
  descripcion?: string;
  base64?: string;
  fileName?: string;
  mimeType?: string;
  metadatos?: any;
  
  enlace?: string;
  cargandoArchivo?: boolean;
  documentoSolicitudId?: number;
  documentoId?: number;
  pendienteCrear?: boolean;
  rolUsuario?: string;
  esDocumentoRolActual?: boolean;
  estadoAnteriorCheck?: EstadoDocumento;
  actualizandoEstado?: boolean;
}


interface CambioEstadoPayload {
  SolicitudId: number;
  NuevoEstado: EstadoSolicitud;
  RolUsuario: string;
  NumeroIdentificacion: string;
  Observacion: string;
  Documentos: {
    IdTipoDocumento: number | null;
    TipoDocumento: string;
    EstadoDocumento: string;
    Nombre: string;
    Metadatos: any;
    File: string | undefined;
  }[];
}


interface ObservacionItem {
  fecha: string;
  autor: string;
  texto: string;
}

type RequiredDocKind = 'FORM' | 'FILE';
interface RequiredDocOption {
  code: TipoDocumentalCode;
  name: string;
  kind: RequiredDocKind;
  idTipoDocumento?: number;
  descripcion?: string;
  rolUsuario?: string;
}

@Component({
    selector: 'app-detalle-solicitud',
    templateUrl: './detalle-solicitud.component.html',
    styleUrls: ['./detalle-solicitud.component.scss'],
    standalone: false
})
export class DetalleSolicitudComponent implements OnInit {
  @ViewChild(Fr010FormComponent) fr010Comp?: Fr010FormComponent;

  // Params
  id!: number;
  role: Role = 'DOCENTE';
  roles: string[] = [];
  mode: 'EDITAR' | 'GESTIONAR' | 'VER' = 'GESTIONAR';

  readonly opcionesPermisos = [
    'crear_solicitud',
    'editar_solicitud',
    'guardar_solicitud',
    'enviar_solicitud_docente',
    'guardar_formulario_fr010',
    'revisar_solicitud',
    'adjuntar_soporte_revision',
    'retornar_solicitud',
    'rechazar_solicitud',
    'enviar_revision',
    'dar_inicio_solicitud',
  ];
  permisos: { [key: string]: boolean } = {};
  permisosListos = false;

  // Solicitud
  radicado = '';
  estadoSolicitud: EstadoSolicitud = 'NO_ENV';
  docenteNombre = '';
  proyecto = '';

  isCreating = false;
  cargandoDetalle = false;
  identificacionDocente = 0;
  guardando = false;
  cambiandoEstado = false;

  /** Datos del formulario FR-010 recuperados del backend (para pasar al componente hijo) */
  formularioRecuperado: any = null;

  // Supervisor: fecha inicio contrato
  fechaInicioContrato: Date | null = null;
  tipoFechaSupervisor: 'INICIO' | 'PRORROGA' = 'INICIO';

  // Para saber qué documento se está cargando
  documentoEnCarga: DocumentoItem | null = null;
  documentoRolEnCarga: DocumentoItem | null = null;
  reviewerUploadCounter = 1000;


  // FR-010 siempre presente como opción fija del frontend
  private readonly FR010_OPTION: RequiredDocOption = {
    code: 'FR010', name: 'FR-010 Formulario de solicitud inicial', kind: 'FORM', idTipoDocumento: 0, descripcion: 'Formulario FR-010'
  };

  // Orden de las observaciones
  private readonly ORDEN_OBS_REVISOR: Record<string, number> = {
    COORDINADOR: 1,
    SECRETARIA_ACADEMICA: 2,
    ADMIN_SGA: 3,
    SECRETARIA_GENERAL: 3,
    DECANO: 4,
    DECANATURA: 4,
  };

  // Orden subida documentos
  private readonly ORDEN_ROL_DOCUMENTAL: Record<string, number> = {
    DOCENTE: 0,
    COORDINADOR: 1,
    SECRETARIA_ACADEMICA: 2,
    SECRETARIA_GENERAL: 3,
    DECANATURA: 4,
  };

  // Tipos documentales: FR-010 fijo + los que vengan del CRUD
  requiredDocs: RequiredDocOption[] = [this.FR010_OPTION];
  cargandoTiposDoc = false;

  selectedRequiredDoc: RequiredDocOption = this.FR010_OPTION;

  // Tabla docs — se reconstruye cuando llegan los tipos del CRUD
  documentos: DocumentoItem[] = this.buildDocumentos(this.requiredDocs);

  // Observaciones
  observacionDocente = '';
  observacionRevision = '';

  observacionesSubsanacion: ObservacionItem[] = [];

  fr010Json: any = null;

  private documentosDesactivarIds: number[] = [];
  private detalleSolicitudActual: any = null;

  private readonly ESTADOS_SOLICITUD_SUBSANACION: EstadoSolicitud[] = [
    'SUBS_PROY',
    'SUBS_SEC_ACAD',
    'SUBS_SEC_GRAL',
    'SUBS_DEC',
  ];

  private readonly ESTADOS_DOCUMENTO_APROBADOS: EstadoDocumento[] = [
    'APROB',
    'APROB_PROY',
    'APROB_SEC_ACAD',
    'APROB_SEC_GRAL',
    'APROB_DEC',
  ];

  private readonly ESTADOS_DOCUMENTO_SUBSANACION: EstadoDocumento[] = [
    'SUBS',
    'SUBS_PROY',
    'SUBS_SEC_ACAD',
    'SUBS_SEC_GRAL',
    'SUBS_DEC',
  ];

  private readonly ESTADO_DOCUMENTO_APROBADO_POR_ROL: Record<Role, EstadoDocumento> = {
    DOCENTE: 'APROB',
    COORDINADOR: 'APROB_PROY',
    SECRETARIA_ACADEMICA: 'APROB_SEC_ACAD',
    SECRETARIA_GENERAL: 'APROB_SEC_GRAL',
    DECANO: 'APROB_DEC',
  };

  private readonly ESTADO_DOCUMENTO_SIGUIENTE_POR_ROL: Partial<Record<Role, EstadoDocumento>> = {
    COORDINADOR: 'ENV_REV_SEC_ACAD',
    SECRETARIA_ACADEMICA: 'ENV_REV_SEC_GRAL',
    SECRETARIA_GENERAL: 'ENV_REV_DEC',
    DECANO: 'APROB',
  };

  private readonly ESTADO_DOCUMENTO_SUBSANACION_POR_ROL: Partial<Record<Role, EstadoDocumento>> = {
    COORDINADOR: 'SUBS_PROY',
    SECRETARIA_ACADEMICA: 'SUBS_SEC_ACAD',
    SECRETARIA_GENERAL: 'SUBS_SEC_GRAL',
    DECANO: 'SUBS_DEC',
  };

  private readonly ESTADO_DOCUMENTO_PREVIO_APROBACION: Partial<Record<EstadoDocumento, EstadoDocumento>> = {
    APROB_PROY: 'ENV_REV_PROY',
    APROB_SEC_ACAD: 'ENV_REV_SEC_ACAD',
    APROB_SEC_GRAL: 'ENV_REV_SEC_GRAL',
    APROB_DEC: 'ENV_REV_DEC',
    APROB: 'ENV_REV_DEC',
  };

  private readonly DESTINO_DOCENTE_POR_ESTADO: Record<string, { solicitud: EstadoSolicitud; documento: EstadoDocumento }> = {
    NO_ENV: { solicitud: 'REV_PROY', documento: 'ENV_REV_PROY' },
    CORR: { solicitud: 'REV_PROY', documento: 'ENV_REV_PROY' },
    SUBS_PROY: { solicitud: 'REV_PROY', documento: 'ENV_REV_PROY' },
    SUBS_SEC_ACAD: { solicitud: 'REV_SEC_ACAD', documento: 'ENV_REV_SEC_ACAD' },
    SUBS_SEC_GRAL: { solicitud: 'REV_SEC_GRAL', documento: 'ENV_REV_SEC_GRAL' },
    SUBS_DEC: { solicitud: 'REV_DEC', documento: 'ENV_REV_DEC' },
  };

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly dialog: MatDialog,
    private readonly popup: PopUpManager,
    private readonly translate: TranslateService,
    private readonly solicitudesService: SolicitudesService,
    private readonly permisosUtils: PermisosUtils,
  ) {}

  ngOnInit(): void {
    this.identificacionDocente = Number(getDocumento()) || 0;

    const rawId = this.route.snapshot.paramMap.get('id');

    this.roles = getRolesUsuario();
    this.role = resolverRolEfectivo(this.roles) ?? 'DOCENTE';
    this.mode = (this.route.snapshot.queryParamMap.get('mode') as any) || 'GESTIONAR';

    // Permisos: en paralelo, controlan visibilidad de secciones y acciones
    forkJoin(
      this.opcionesPermisos.map(op => this.permisosUtils.tienePermiso(this.roles, op))
    ).subscribe({
      next: (results) => {
        this.opcionesPermisos.forEach((op, i) => { this.permisos[op] = results[i]; });
        this.permisosListos = true;
        // console.log('[Detalle] Permisos resueltos:', JSON.stringify(this.permisos));
        // console.log('[Detalle] estadoSolicitud:', this.estadoSolicitud, '| isCreating:', this.isCreating, '| isDocente:', this.isDocente);
        // console.log('[Detalle] isDocenteEditable:', this.isDocenteEditable, '| isDocenteReadOnly:', this.isDocenteReadOnly);
      },
      error: () => {
        this.permisosListos = true;
      },
    });

    if (rawId === 'nuevo') {
      // Modo creación
      this.isCreating = true;
      this.id = 0;
      this.estadoSolicitud = 'NO_ENV';
      this.radicado = '';
      this.docenteNombre = '';
      this.observacionDocente = '';
      this.observacionesSubsanacion = [];
    } else {
      this.isCreating = false;
      this.id = Number(rawId);
      this.cargarDetalleSolicitud(this.id);
    }

    this.selectedRequiredDoc = this.requiredDocs[0];

    this.cargarTiposDocumentoCrud();
  }


  private cargarTiposDocumentoCrud(): void {
    this.cargandoTiposDoc = true;
    this.solicitudesService.listarTiposDocumentoSolicitud().subscribe({
      next: (resp: any) => {
        const data: any[] = resp?.Data || [];
        const activos = data.filter((d: any) => d.Activo === true);

        const docsCrud: RequiredDocOption[] = activos.map((d: any) => ({
          code: (d.CodigoAbreviacion || d.Nombre) as TipoDocumentalCode,
          name: d.Nombre,
          kind: 'FILE' as RequiredDocKind,
          idTipoDocumento: d.Id,
          descripcion: d.Descripcion ?? d.Nombre,
          rolUsuario: this.obtenerRolUsuarioDocumento(d),
        }));

        const rolesVisibles = this.obtenerRolesDocumentalesVisibles();

        const docsVisibles = docsCrud
          .filter((d) => rolesVisibles.includes(d.rolUsuario ?? 'DOCENTE'))
          .sort((a, b) => {
            const ordenA = this.ORDEN_ROL_DOCUMENTAL[a.rolUsuario ?? 'DOCENTE'];
            const ordenB = this.ORDEN_ROL_DOCUMENTAL[b.rolUsuario ?? 'DOCENTE'];
            return ordenA - ordenB;
          });

        this.requiredDocs = this.role === 'DOCENTE'
          ? [this.FR010_OPTION, ...docsCrud.filter((d) => d.rolUsuario === 'DOCENTE')]
          : [this.FR010_OPTION, ...docsVisibles];

        this.documentos = this.buildDocumentos(this.requiredDocs);
        this.selectedRequiredDoc = this.requiredDocs[0];

        if (this.detalleSolicitudActual) {
          this.poblarDocumentosDesdeDetalle(this.detalleSolicitudActual);
        }

        this.cargandoTiposDoc = false;
      },
      error: () => {
        this.cargandoTiposDoc = false;
        this.popup.error(this.translate.instant('POPUPS.ERROR_CARGAR_TIPOS_DOC'));
      },
    });
  }

  // ========== Carga de detalle de solicitud existente ==========

  private cargarDetalleSolicitud(id: number): void {
    this.cargandoDetalle = true;

    this.solicitudesService.obtenerDetalleSolicitud(id).subscribe({
      next: (resp: any) => {
        const data = resp?.Data;
        if (!data) {
          this.cargandoDetalle = false;
          this.popup.error(this.translate.instant('POPUPS.ERROR_CARGAR_DETALLE'));
          return;
        }
        this.detalleSolicitudActual = data;
        this.poblarDesdeDetalle(data);
        this.observacionesSubsanacion = this.extraerObservacionesDesdeDetalle(data);
        this.cargandoDetalle = false;
      },
      error: () => {
        this.cargandoDetalle = false;
        this.popup.error(this.translate.instant('POPUPS.ERROR_CARGAR_DETALLE'));
      },
    });
  }

  private poblarDesdeDetalle(data: any): void {
    // --- Solicitud ---
    const sol = data.Solicitud || {};
    this.id = sol.Id || this.id;
    this.radicado = sol.Id ? `SOL-${sol.Id}` : '';
    this.identificacionDocente = sol.TerceroId || this.identificacionDocente;

    // ObservacionCierre como observación del docente si existe
    if (sol.ObservacionCierre) {
      this.observacionDocente = sol.ObservacionCierre;
    }

    // --- Estado ---
    const estado =
      data?.EstadoSolicitud
      || data?.estado_solicitud
      || data?.Solicitud?.EstadoSolicitudId
      || null;

    const codigoEstado =
      estado?.CodigoAbreviacion
      || estado?.codigo_abreviacion
      || null;

    const nombreEstado =
      estado?.Nombre
      || estado?.nombre
      || null;

    if (codigoEstado) {
      this.estadoSolicitud = codigoEstado as EstadoSolicitud;
    } else if (nombreEstado) {
      this.estadoSolicitud = mapEstadoNombreACodigo(nombreEstado) as EstadoSolicitud;
    }

    // --- Formulario (viene como string JSON) ---
    if (data.Formulario && typeof data.Formulario === 'string') {
      try {
        const parsed = JSON.parse(data.Formulario);
        this.formularioRecuperado = parsed;

        // Guardar como fr010Json para que construirPayloadCrearSolicitud() lo use
        this.fr010Json = {
          meta: { codigo: 'GD-PR-013-FR-010', version: '02' },
          fr010: parsed,
        };

        console.log('[detalle] Formulario parseado:', parsed);
      } catch (e) {
        console.error('[detalle] Error parseando Formulario:', e);
      }
    }

    // --- Observaciones ---
    this.observacionesSubsanacion = this.extraerObservacionesDesdeDetalle(data);
    // --- Documentos ---
    this.poblarDocumentosDesdeDetalle(data);
  }

  private extraerObservacionesDesdeDetalle(data: any): ObservacionItem[] {
    const source: any[] = Array.isArray(data?.Observaciones) ? data.Observaciones : [];

    return source
      .map((item: any, idx: number) => ({
        rol: String(item?.Rol || item?.rol || '').toUpperCase(),
        texto: String(item?.Descripcion || item?.descripcion || '').trim(),
        idx,
      }))
      .filter((x) => !!x.texto && this.ORDEN_OBS_REVISOR[x.rol] != null)
      .sort((a, b) => {
        const pa = this.ORDEN_OBS_REVISOR[a.rol];
        const pb = this.ORDEN_OBS_REVISOR[b.rol];
        return pa - pb || a.idx - b.idx;
      })
      .map((x) => ({
        fecha: '',
        autor: this.obtenerNombreRol(x.rol),
        texto: x.texto,
      }));
  }

  private buildDocumentos(docs: RequiredDocOption[]): DocumentoItem[] {
    return docs.map((d, i) => ({
      id: i + 1,
      nombre: d.name,
      autorSoporte: d.rolUsuario === 'DOCENTE'? 'Docente': this.obtenerNombreRol(d.rolUsuario),
      estado: 'PENDIENTE' as EstadoDocumento,
      checked: false,
      code: d.code,
      idTipoDocumento: d.idTipoDocumento,
      descripcion: d.descripcion,
      rolUsuario: d.rolUsuario,
      esDocumentoRolActual: this.role !== 'DOCENTE' && d.rolUsuario === this.rolDocumentalActual(),
      pendienteCrear: false,
    }));
  }

  // ========== Helpers de UI ==========
  get isDocente(): boolean {
    return this.role === 'DOCENTE';
  }

  get isReadOnly(): boolean {
    return this.mode === 'VER';
  }

  get isSupervisor(): boolean {
    if (!this.permisosListos) return false;
    return this.permisos['dar_inicio_solicitud'] === true;
  }

  /** Docente editable: creación (crear_solicitud) o edición NO_ENV/CORR (editar_solicitud) */
  get isDocenteEditable(): boolean {
    if (!this.permisosListos) return false;
    if (!this.isDocente) return false;

    if (this.isCreating) {
      return this.permisos['crear_solicitud'] === true;
    }

    return this.permisos['editar_solicitud'] === true
      && (
        this.estadoSolicitud === 'NO_ENV'
        || this.estadoSolicitud === 'CORR'
        || this.esSolicitudEnSubsanacion()
      );
  }

  /** Docente en modo solo lectura (cualquier estado no editable) */
  get isDocenteReadOnly(): boolean {
    if (!this.permisosListos) return false;
    return this.isDocente && !this.isDocenteEditable;
  }

  get allDocsChecked(): boolean {
    return this.documentos
      .filter((d) => !d.esDocumentoRolActual)
      .every((d) => {
        if (d.code === 'FR010') {
          return d.checked === true;
        }
        return d.checked
      });
  }

  get observacionesOrdenDesc(): ObservacionItem[] {
    return this.observacionesSubsanacion;
  }

  get estadoClass(): string {
    return estadoSolicitudClass(this.estadoSolicitud);
  }

  get estadoLabel(): string {
    return `ESTADOS.${this.estadoSolicitud}`;
  }

   get documentosRolActual(): DocumentoItem[] {
    return this.documentos.filter((d) => d.esDocumentoRolActual);
  }

  get hayDocumentosRolActualPendientes(): boolean {
    return this.documentosRolActual.some((d) => !d.enlace && !d.base64);
  }

  get puedeContinuarRevisor(): boolean {
    return !this.hayDocumentosRolActualPendientes;
  }

  get puedeEnviarDocente(): boolean {
    if (!this.id || !this.fr010Json || !this.identificacionDocente || this.cambiandoEstado || this.guardando) {
      return false;
    }
    // Todos los documentos requeridos del docente deben estar cargados (no PENDIENTE)
    const docsDocente = this.documentos.filter((d) => d.rolUsuario === 'DOCENTE');
    return docsDocente.length > 0 && docsDocente.every((d) => this.documentoListoParaEnvioDocente(d));
  }

  get requiredDocsDocenteDisponibles(): RequiredDocOption[] {
    if (!this.isDocente || !this.esSolicitudEnSubsanacion()) {
      return this.requiredDocs;
    }

    return this.requiredDocs.filter((doc) => {
      if (doc.code === 'FR010') return true;
      const actual = this.documentos.find((item) => item.code === doc.code);
      return actual ? this.puedeEditarDocumentoDocente(actual) : true;
    });
  }

  puedeEliminarDocumentoDocente(doc: DocumentoItem): boolean {
    return doc.code !== 'FR010' && this.puedeEditarDocumentoDocente(doc);
  }

  private esSolicitudEnSubsanacion(): boolean {
    return this.ESTADOS_SOLICITUD_SUBSANACION.includes(this.estadoSolicitud);
  }

  private obtenerEstadoDocumentoSubsanacionActual(): EstadoDocumento | null {
    switch (this.estadoSolicitud) {
      case 'SUBS_PROY': return 'SUBS_PROY';
      case 'SUBS_SEC_ACAD': return 'SUBS_SEC_ACAD';
      case 'SUBS_SEC_GRAL': return 'SUBS_SEC_GRAL';
      case 'SUBS_DEC': return 'SUBS_DEC';
      default: return null;
    }
  }

  private obtenerDestinoEnvioDocente(): { solicitud: EstadoSolicitud; documento: EstadoDocumento } {
    return this.DESTINO_DOCENTE_POR_ESTADO[this.estadoSolicitud] ?? {
      solicitud: 'REV_PROY',
      documento: 'ENV_REV_PROY',
    };
  }

  private esDocumentoAprobado(doc: DocumentoItem): boolean {
    return this.ESTADOS_DOCUMENTO_APROBADOS.includes(doc.estado);
  }

  private esDocumentoEnSubsanacion(doc: DocumentoItem): boolean {
    return this.ESTADOS_DOCUMENTO_SUBSANACION.includes(doc.estado);
  }

  private puedeEditarDocumentoDocente(doc: DocumentoItem): boolean {
    if (doc.code === 'FR010') return true;
    if (doc.rolUsuario !== 'DOCENTE') return false;
    if (!this.esSolicitudEnSubsanacion()) return true;
    return !this.esDocumentoAprobado(doc);
  }

  private documentoListoParaEnvioDocente(doc: DocumentoItem): boolean {
    if (!this.puedeEditarDocumentoDocente(doc)) return true;
    return doc.estado !== 'PENDIENTE' && !this.esDocumentoEnSubsanacion(doc);
  }

  private resolverEstadoDocumentoAlEliminar(doc: DocumentoItem): EstadoDocumento {
    if (this.isDocente && this.esSolicitudEnSubsanacion() && doc.rolUsuario === 'DOCENTE' && doc.code !== 'FR010') {
      return this.obtenerEstadoDocumentoSubsanacionActual() ?? 'PENDIENTE';
    }
    return 'PENDIENTE';
  }

  private obtenerEstadoAprobacionRolActual(): EstadoDocumento {
    return this.ESTADO_DOCUMENTO_APROBADO_POR_ROL[this.role];
  }

  private resolverEstadoPrevioDocumento(doc: DocumentoItem): EstadoDocumento {
    const estadoActual = doc.estado;

    const candidatos: EstadoDocumento[] = [
      doc.estadoAnteriorCheck,
      this.ESTADO_DOCUMENTO_PREVIO_APROBACION[estadoActual],
      this.obtenerEstadoEnvioSegunDocumento(doc),
      'CARG',
    ].filter((estado): estado is EstadoDocumento => !!estado);

    const estadoPrevio = candidatos.find((estado) => estado !== estadoActual);

    return estadoPrevio ?? 'CARG';
  }

  private debeIniciarChequeado(estado: EstadoDocumento): boolean {
    return estado === this.obtenerEstadoAprobacionRolActual();
  }

  private construirEstadoRevision(estado: EstadoDocumento): Pick<DocumentoItem, 'checked' | 'estadoAnteriorCheck'> {
    const checked = this.debeIniciarChequeado(estado);
    return {
      checked,
      estadoAnteriorCheck: checked ? this.ESTADO_DOCUMENTO_PREVIO_APROBACION[estado] : undefined,
    };
  }

  documentoChipClass(d: DocumentoItem): string {
    return estadoDocumentoClass(d.estado);
  }

  documentoChip(d: DocumentoItem): string {
    return `DOC_ESTADOS.${d.estado}`;
  }

  isFR010Selected(): boolean {
    return this.selectedRequiredDoc?.code === 'FR010';
  }

  /** El doc seleccionado ya tiene un archivo cargado (debe eliminarse antes de subir otro) */
  isDocYaCargado(): boolean {
    if (!this.selectedRequiredDoc || this.selectedRequiredDoc.kind === 'FORM') return false;
    const doc = this.documentos.find((d) => d.nombre === this.selectedRequiredDoc.name);
    return !!doc && doc.estado !== 'PENDIENTE';
  }

  // ========== Checkbox → estado de documento ==========
  onDocCheckedChange(doc: DocumentoItem): void {
    if (doc.esDocumentoRolActual) {
      return;
    }

    if (doc.code === 'FR010') {
      const checked = doc.checked;
      const estadoAnterior = doc.estado;

      if (checked) {
        doc.estadoAnteriorCheck = estadoAnterior;
        doc.estado = this.obtenerEstadoAprobacionRolActual();
      } else {
        doc.estado = this.resolverEstadoPrevioDocumento(doc);
        doc.estadoAnteriorCheck = undefined;
      }

      this.documentos = [...this.documentos];
      return;
    }

    if (!doc.documentoSolicitudId) {
      doc.checked = false;
      this.documentos = [...this.documentos];
      this.popup.error(this.translate.instant('POPUPS.DOC_NO_ENCONTRADO'));
      return;
    }

    const checked = doc.checked;
    const estadoAnterior = doc.estado;
    const estadoDestino = checked
      ? this.obtenerEstadoAprobacionRolActual()
      : this.resolverEstadoPrevioDocumento(doc);

    if (checked) {
      doc.estadoAnteriorCheck = estadoAnterior;
    }

    doc.actualizandoEstado = true;
    doc.estado = estadoDestino;
    this.documentos = [...this.documentos];

    this.solicitudesService.actualizarEstadoDocumento({
      DocumentoSolicitudId: doc.documentoSolicitudId,
      EstadoDocumentoCodigo: estadoDestino,
    }).subscribe({
      next: () => {
        doc.actualizandoEstado = false;
        if (!checked) {
          doc.estadoAnteriorCheck = undefined;
        }
        this.documentos = [...this.documentos];
      },
      error: () => {
        doc.actualizandoEstado = false;
        doc.checked = !checked;
        doc.estado = estadoAnterior;
        this.documentos = [...this.documentos];
        this.popup.error(this.translate.instant('POPUPS.ERROR_CAMBIAR_ESTADO'));
      },
    });
  }

  private obtenerEstadoEnvioSegunDocumento(doc: DocumentoItem): EstadoDocumento {
    if (doc.estado === 'APROB_PROY') return 'ENV_REV_PROY';
    if (doc.estado === 'APROB_SEC_ACAD') return 'ENV_REV_SEC_ACAD';
    if (doc.estado === 'APROB_SEC_GRAL') return 'ENV_REV_SEC_GRAL';
    if (doc.estado === 'APROB_DEC') return 'ENV_REV_DEC';
    if (doc.estado === 'APROB') return 'ENV_REV_DEC';
    return 'CARG';
  }
  
  // ========== Acciones docente ==========
  guardarDocente(): void {
    if (this.permisosListos && !this.permisos['guardar_solicitud']) {
      this.popup.error(this.translate.instant('GLOBAL.acceso_denegado'));
      return;
    }

    if (this.guardando) return;

    this.persistirEdicionDocente('POPUPS.SOLICITUD_GUARDADA');
  }

  enviarDocente(): void {
    if (this.permisosListos && !this.permisos['enviar_solicitud_docente']) { this.popup.error(this.translate.instant('GLOBAL.acceso_denegado')); return; }
    this.popup.confirm(
      this.translate.instant('POPUPS.CONFIRMAR_ENVIO'),
      this.translate.instant('ACTIONS.ENVIAR'),
      this.translate.instant('ACTIONS.CANCELAR'),
    ).then((result) => {
      if (result.isConfirmed) {
        this.ejecutarCambioEstado('ENVIAR', this.observacionDocente, 'POPUPS.SOLICITUD_ENVIADA_OK');
      }
    });
  }

  adjuntarDocumento(fileInput: HTMLInputElement): void {
    if (!this.selectedRequiredDoc) return;

    if (this.selectedRequiredDoc.kind === 'FORM') {
      this.popup.error(this.translate.instant('POPUPS.FR010_USE_GUARDAR'));
      return;
    }

    const doc = this.documentos.find((d) => d.nombre === this.selectedRequiredDoc.name);
    if (!doc) return;

    if (!this.puedeEditarDocumentoDocente(doc)) {
      this.popup.alertError('Este documento ya fue aprobado por el revisor y no debe modificarse durante la subsanación.');
      return;
    }

    this.documentoEnCarga = doc;
    fileInput.value = '';
    fileInput.click();
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!this.documentoEnCarga) {
      this.popup.error(this.translate.instant('POPUPS.DOC_NO_ENCONTRADO'));
      input.value = '';
      return;
    }

    if (file.type !== 'application/pdf') {
      this.popup.error(this.translate.instant('POPUPS.SOLO_PDF'));
      input.value = '';
      return;
    }

    try {
      const docActual = this.documentoEnCarga;

      const debeDesactivarDocumentoActual =
        !this.isCreating
        && !!this.id
        && !docActual.pendienteCrear
        && !!docActual.documentoSolicitudId;

      if (debeDesactivarDocumentoActual) {
        this.agregarDocumentoAEliminar(docActual.documentoSolicitudId);
      }

      const base64 = await this.fileToBase64(file);

      docActual.base64 = base64;
      docActual.fileName = file.name;
      docActual.mimeType = file.type;
      docActual.autorSoporte = 'Docente';
      docActual.estado = 'CARG';
      docActual.pendienteCrear = true;
      docActual.enlace = undefined;
      docActual.documentoSolicitudId = undefined;
      docActual.documentoId = undefined;
      docActual.metadatos = {
        documento_requerido: docActual.nombre,
        codigo: docActual.code,
        cargadoPor: 'DOCENTE',
        fechaCarga: new Date().toISOString(),
      };

      this.documentos = [...this.documentos];

      if (!this.isCreating && this.id){
        this.persistirEdicionDocente('POPUPS.DOC_ADJUNTADO')
        return;
      }

      this.popup.success(
        this.translate.instant('POPUPS.DOC_ADJUNTADO', {
          nombre: this.documentoEnCarga.nombre,
        }),
      );
    } catch (error) {
      this.popup.error(this.translate.instant('POPUPS.ERROR_PROCESAR_ARCHIVO'));
    } finally {
      this.documentoEnCarga = null;
      input.value = '';
    }
  }

  eliminarDocumento(doc: DocumentoItem): void {

    if (this.isDocente && !this.puedeEliminarDocumentoDocente(doc)) {
      this.popup.alertError('Este documento ya fue aprobado por el revisor y no debe modificarse durante la subsanación.');
      return;
    }

    this.popup.confirm(
      this.translate.instant('POPUPS.ELIMINAR_DOC_MSG', { nombre: doc.nombre ?? doc.fileName ?? 'documento' }),
      this.translate.instant('ACTIONS.ELIMINAR'),
      this.translate.instant('ACTIONS.CANCELAR'),
    ).then((result) => {
      if (!result.isConfirmed) return;

      const debeDesactivarDocumentoPersistido =
        !this.isCreating
        && !!this.id
        && !doc.pendienteCrear
        && !!doc.documentoSolicitudId;

      if (debeDesactivarDocumentoPersistido) {
        this.agregarDocumentoAEliminar(doc.documentoSolicitudId);
      }

      doc.estado = this.resolverEstadoDocumentoAlEliminar(doc);
      doc.estadoAnteriorCheck = undefined;
      doc.checked = false;
      doc.base64 = undefined;
      doc.fileName = undefined;
      doc.mimeType = undefined;
      doc.metadatos = undefined;
      doc.enlace = undefined;
      doc.pendienteCrear = false;
      doc.documentoSolicitudId = undefined;
      doc.documentoId = undefined;

      this.documentos = [...this.documentos];

      if (!this.isCreating && this.id) {
        this.persistirEdicionDocente('POPUPS.DOC_ELIMINADO');
        return;
      }

      this.popup.success(
        this.translate.instant('POPUPS.DOC_ELIMINADO', {
          nombre: doc.nombre ?? doc.fileName ?? 'documento',
        }),
      );
    });
  }

  verDocumento(doc: DocumentoItem): void {
    // FR-010: abrir formulario en modo solo lectura (no es PDF)
    if (doc.code === 'FR010') {
      const formData = this.formularioRecuperado || this.fr010Json?.fr010;
      if (!formData) {
        this.popup.error(this.translate.instant('POPUPS.DOC_NO_DISPONIBLE'));
        return;
      }
      this.dialog.open(VisorDocumentosComponent, {
        width: '1100px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        data: {
          nombre: doc.nombre,
          estado: doc.estado,
          autor: doc.autorSoporte,
          isFR010: true,
          formData,
        },
      });
      return;
    }

    if (!doc.base64) {
      this.popup.error(this.translate.instant('POPUPS.DOC_NO_DISPONIBLE'));
      return;
    }

    this.dialog.open(VisorDocumentosComponent, {
      width: '900px',
      maxWidth: '95vw',
      data: {
        nombre: doc.fileName ?? doc.nombre,
        mimeType: doc.mimeType ?? 'application/pdf',
        base64: doc.base64,
        estado: doc.estado,
        autor: doc.autorSoporte,
      },
    });
  }

  guardarFR010(): void {
    if (this.permisosListos && !this.permisos['guardar_formulario_fr010']) { this.popup.error(this.translate.instant('GLOBAL.acceso_denegado')); return; }
    if (!this.fr010Comp) {
      this.popup.error(this.translate.instant('POPUPS.FR010_NO_LISTO'));
      return;
    }
    this.fr010Comp.save();
  }

  onFr010Saved(payload: any): void {
    this.fr010Json = payload;
    console.log('[FR-010 JSON]', payload);

    const fr = this.documentos.find((d) => d.code === 'FR010');
    if (fr) {
      fr.estado = 'CARG';
      fr.autorSoporte = 'Docente';
      fr.metadatos = {
        documento_requerido: fr.nombre,
        codigo: fr.code,
        cargadoPor: 'DOCENTE',
        fechaCarga: new Date().toISOString(),
        origen: 'FORMULARIO_DIGITAL',
      };
    }

    this.documentos = [...this.documentos];
    this.formularioRecuperado = payload?.fr010 || payload;

    if(!this.isCreating && this.id){
      if (this.guardando) return;
      this.persistirEdicionDocente('POPUPS.FR010_GUARDADO')
      return;
    }
    
    this.popup.success('POPUPS.FR010_GUARDADO');
  }

  // ========== Mapeo q13 → tipo_solicitud_id ==========
  private readonly TIPO_ESTUDIO_MAP: Record<string, number> = {
    DOCTORADO: 2,
    MAESTRIA: 3,
    POSTDOCTORADO: 4,
  };

  private resolverTipoSolicitudId(): number | null {
    const q13 = this.fr010Json?.fr010?.solicitud?.q13_tipo_estudio;
    if (!q13 || !this.TIPO_ESTUDIO_MAP[q13]) return null;
    return this.TIPO_ESTUDIO_MAP[q13];
  }

  // ========== Cambio de estado — mapeos y payload ==========

  private readonly ESTADO_ENVIAR: Record<Role, EstadoSolicitud> = {
    DOCENTE: 'REV_PROY',
    COORDINADOR: 'REV_SEC_ACAD',
    SECRETARIA_ACADEMICA: 'REV_SEC_GRAL',
    SECRETARIA_GENERAL: 'REV_DEC',
    DECANO: 'APROB_EJEC',
  };

  private readonly ESTADO_RETORNAR: Partial<Record<Role, EstadoSolicitud>> = {
    COORDINADOR: 'SUBS_PROY',
    SECRETARIA_ACADEMICA: 'SUBS_SEC_ACAD',
    SECRETARIA_GENERAL: 'SUBS_SEC_GRAL',
    DECANO: 'SUBS_DEC',
  };

  private readonly ROL_USUARIO_MAP: Record<Role, string> = {
    DOCENTE: 'DOCENTE',
    COORDINADOR: 'COORDINADOR',
    SECRETARIA_ACADEMICA: 'SECRETARIA_ACADEMICA',
    SECRETARIA_GENERAL: 'SECRETARIA_GENERAL',
    DECANO: 'DECANATURA',
  };

  private resolverNuevoEstado(accion: AccionEstado): EstadoSolicitud | null {
    switch (accion) {
      case 'ENVIAR':
        if (this.role === 'DOCENTE') {
          return this.obtenerDestinoEnvioDocente().solicitud;
        }
        return this.ESTADO_ENVIAR[this.role];
      case 'DAR_INICIO':
        return this.ESTADO_ENVIAR[this.role];
      case 'RETORNAR':
        return this.ESTADO_RETORNAR[this.role] ?? null;
      case 'RECHAZAR':
        return 'NO_APROB';
      default:
        return null;
    }
  }

  private construirActualizacionesDocumentoPorAccion(accion: AccionEstado): Array<{ doc: DocumentoItem; estado: EstadoDocumento }> {
    switch (accion) {
      case 'ENVIAR':
        return this.isDocente
          ? this.construirActualizacionesEnvioDocente()
          : this.construirActualizacionesEnvioRevisor();
      case 'RETORNAR':
        return this.construirActualizacionesRetornoRevisor();
      case 'DAR_INICIO':
        return this.construirActualizacionesAprobacionFinal();
      default:
        return [];
    }
  }

  private construirActualizacionesEnvioDocente(): Array<{ doc: DocumentoItem; estado: EstadoDocumento }> {
    const destino = this.obtenerDestinoEnvioDocente().documento;

    return this.documentos
      .filter((d) =>
        d.code !== 'FR010'
        && d.rolUsuario === 'DOCENTE'
        && !!d.documentoSolicitudId
        && this.puedeEditarDocumentoDocente(d)
      )
      .map((doc) => ({ doc, estado: destino }));
  }

  private construirActualizacionesEnvioRevisor(): Array<{ doc: DocumentoItem; estado: EstadoDocumento }> {
    const destino = this.ESTADO_DOCUMENTO_SIGUIENTE_POR_ROL[this.role];
    if (!destino) return [];

    return this.documentos
      .filter((d) => !d.esDocumentoRolActual && d.checked && !!d.documentoSolicitudId)
      .map((doc) => ({ doc, estado: destino }));
  }

  private construirActualizacionesRetornoRevisor(): Array<{ doc: DocumentoItem; estado: EstadoDocumento }> {
    const destino = this.ESTADO_DOCUMENTO_SUBSANACION_POR_ROL[this.role];
    if (!destino) return [];

    return this.documentos
      .filter((d) => !d.esDocumentoRolActual && !d.checked && !!d.documentoSolicitudId)
      .map((doc) => ({ doc, estado: destino }));
  }

  private construirActualizacionesAprobacionFinal(): Array<{ doc: DocumentoItem; estado: EstadoDocumento }> {
    return this.documentos
      .filter((d) => !d.esDocumentoRolActual && d.checked && !!d.documentoSolicitudId)
      .map((doc) => ({ doc, estado: 'APROB' }));
  }

  private construirPayloadCambioEstado(nuevoEstado: EstadoSolicitud, observacion: string): CambioEstadoPayload | null {
    const documentosRevisor = this.documentos.filter((d) => 
      d.esDocumentoRolActual &&
      d.base64 &&
      d.pendienteCrear &&
      d.code !== 'FR010'
    );

    const documentosMapeados = documentosRevisor.map((d) => ({
      IdTipoDocumento: d.idTipoDocumento ?? null,
      TipoDocumento: String(d.code ?? ''),
      EstadoDocumento: 'CARG',
      Nombre: d.nombre,
      Metadatos: {},
      File: d.base64,
    }));

    return {
      SolicitudId: this.id,
      NuevoEstado: nuevoEstado,
      RolUsuario: this.ROL_USUARIO_MAP[this.role],
      NumeroIdentificacion: getDocumento() ?? '',
      Observacion: observacion?.trim() ?? '',
      Documentos: documentosMapeados,
    };
  }

  private ejecutarCambioEstado(accion: AccionEstado, observacion: string, mensajeExito: string): void {
    const nuevoEstado = this.resolverNuevoEstado(accion);
    if (!nuevoEstado) return;

    const payload = this.construirPayloadCambioEstado(nuevoEstado, observacion);
    if (!payload) return;

    const actualizacionesDocumento = this.construirActualizacionesDocumentoPorAccion(accion);

    const ejecutarCambioSolicitud = () => {
      this.solicitudesService.cambiarEstadoSolicitud(payload).subscribe({
        next: () => {
          this.cambiandoEstado = false;
          this.popup.alertSuccess(this.translate.instant(mensajeExito));
          this.router.navigate(['/solicitudes'], { queryParams: { role: this.role } });
        },
        error: () => {
          this.cambiandoEstado = false;
          this.cargarDetalleSolicitud(this.id);
          this.popup.error(this.translate.instant('POPUPS.ERROR_CAMBIAR_ESTADO'));
        },
      });
    };

    this.cambiandoEstado = true;

    if (!actualizacionesDocumento.length) {
      ejecutarCambioSolicitud();
      return;
    }

    forkJoin(
      actualizacionesDocumento.map(({ doc, estado }) =>
        this.solicitudesService.actualizarEstadoDocumento({
          DocumentoSolicitudId: doc.documentoSolicitudId!,
          EstadoDocumentoCodigo: estado,
        })
      )
    ).subscribe({
      next: () => ejecutarCambioSolicitud(),
      error: () => {
        this.cambiandoEstado = false;
        this.cargarDetalleSolicitud(this.id);
        this.popup.error(this.translate.instant('POPUPS.ERROR_CAMBIAR_ESTADO'));
      },
    });
  }

  // ========== Construcción del payload para el MID ==========
  construirPayloadCrearSolicitud(): any {
    // Validar identificación
    if (!this.identificacionDocente) {
      this.popup.error(this.translate.instant('POPUPS.ERROR_SIN_IDENTIFICACION'));
      return null;
    }

    // Obtener tipo_solicitud_id desde q13
    const tipoSolicitudId = this.resolverTipoSolicitudId();

    // Construir formulario desde FR-010 si existe
    const fr010Data = this.fr010Json?.fr010 || {};
    const formulario: any = {
      solicitante: fr010Data.solicitante || {},
      solicitud: fr010Data.solicitud || {},
      formulario_completado: !!this.fr010Json,
    };
    // Incluir secciones adicionales si existen
    if (fr010Data.financiacion_colombia) formulario.financiacion_colombia = fr010Data.financiacion_colombia;
    if (fr010Data.financiacion_exterior) formulario.financiacion_exterior = fr010Data.financiacion_exterior;
    if (fr010Data.beca) formulario.beca = fr010Data.beca;

    // Documentos adjuntos: solo los que tienen archivo cargado (no FR-010, no placeholders)
    const documentosParaCrear = this.documentos.filter(
      (d) => d.base64 && d.code !== 'FR010' && !d.documentoSolicitudId && !d.enlace
    );

    const documentoSinTipo = documentosParaCrear.find((d) => !d.idTipoDocumento || d.idTipoDocumento <= 0);
    if (documentoSinTipo) {
      this.popup.error(this.translate.instant('POPUPS.ERROR_TIPO_DOC_NO_RESUELTO'));
      return null;
    }

    const documentoSolicitud = documentosParaCrear.map((d) => ({
      IdTipoDocumento: d.idTipoDocumento,
      TipoDocumento: String(d.code ?? ''),
      EstadoDocumento: 'CARG',
      Nombre: d.fileName ?? d.nombre,
      Descripcion: d.descripcion ?? d.nombre,
      Metadatos: d.metadatos ?? {},
      File: d.base64,
    }));

    return {
      identificacion: this.identificacionDocente,
      tipo_solicitud_id: tipoSolicitudId ?? 2,
      formulario,
      observacion: this.observacionDocente?.trim() || '',
      cod_abreviacion_rol: 'PROFE',
      documento_solicitud: documentoSolicitud,
    };
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };

      reader.onerror = () => {
        reject(reader.error ?? new Error('Error leyendo el archivo'));
      };
      reader.readAsDataURL(file);
    });
  }

  private construirPayloadEditarSolicitud(): any | null {
    if (!this.id) {
      this.popup.error(this.translate.instant('POPUPS.ERROR_GUARDAR'));
      return null;
    }

    const tipoSolicitudId = this.resolverTipoSolicitudId();

    const fr010Data = this.fr010Json?.fr010 || this.formularioRecuperado || {};
    const formulario: any = {
      solicitante: fr010Data.solicitante || {},
      solicitud: fr010Data.solicitud || {},
      formulario_completado: !!this.fr010Json || !!this.formularioRecuperado,
    };

    if (fr010Data.financiacion_colombia) {
      formulario.financiacion_colombia = fr010Data.financiacion_colombia;
    }

    if (fr010Data.financiacion_exterior) {
      formulario.financiacion_exterior = fr010Data.financiacion_exterior;
    }

    if (fr010Data.beca) {
      formulario.beca = fr010Data.beca;
    }

    const documentosParaCrear = this.documentos.filter(
      (d) => d.pendienteCrear === true && d.base64 && d.code !== 'FR010'
    );

    const documentoSinTipo = documentosParaCrear.find((d) => !d.idTipoDocumento || d.idTipoDocumento <= 0);
    if (documentoSinTipo) {
      this.popup.error(this.translate.instant('POPUPS.ERROR_TIPO_DOC_NO_RESUELTO'));
      return null;
    }

    const documentosNuevos = documentosParaCrear.map((d) => ({
      IdTipoDocumento: d.idTipoDocumento,
      TipoDocumento: String(d.code ?? ''),
      EstadoDocumento: 'CARG',
      Nombre: d.fileName ?? d.nombre,
      Descripcion: d.descripcion ?? d.nombre,
      Metadatos: d.metadatos || {},
      File: d.base64,
    }));

    const documentosDesactivar = [...new Set(
      this.documentosDesactivarIds.filter((id) => !!id && id > 0)
    )];

    return {
      tipo_solicitud_id: tipoSolicitudId ?? 2,
      formulario,
      observacion: this.observacionDocente?.trim() || '',
      documentos_nuevos: documentosNuevos,
      documentos_desactivar: documentosDesactivar,
    };
  }

  private persistirEdicionDocente(mensajeExito: string, redirigir = false): void {
    const payload = this.construirPayloadEditarSolicitud();
    if (!payload) return;

    this.guardando = true;
    this.solicitudesService.editarSolicitud(this.id, payload).subscribe({
      next: () => {
        this.guardando = false;
        this.documentosDesactivarIds = [];
        this.documentos
          .filter((d) => d.pendienteCrear)
          .forEach((d) => {
            d.pendienteCrear = false;
          });
        if (!this.isCreating && this.id) {
          this.cargarDetalleSolicitud(this.id);
        }

        this.popup.success(this.translate.instant(mensajeExito));

        if (redirigir) {
          this.router.navigate(['/solicitudes'], { queryParams: { role: this.role } });
        }
      },
      error: () => {
        this.guardando = false;
        this.popup.error(this.translate.instant('POPUPS.ERROR_GUARDAR'));
      },
    });
  }

// Manejo documentos
  private poblarDocumentosDesdeDetalle(data: any): void {
    if (!data?.Documentos || !Array.isArray(data.Documentos)) {
      return;
    }

    const docsBackend = data.Documentos;

    const documentosBase: DocumentoItem[] = this.documentos.map((baseDoc) => {
      if (baseDoc.code === 'FR010') {
        if (this.formularioRecuperado || this.fr010Json?.fr010) {
          return {
            ...baseDoc,
            estado: 'CARG',
            checked: false,
            estadoAnteriorCheck: undefined,
            autorSoporte: 'Docente',
          };
        }

        return baseDoc;
      }

      const match = docsBackend.find((doc: any) => {
        const backendTipoId = this.extraerTipoDocumentoId(doc);
        return backendTipoId && backendTipoId === baseDoc.idTipoDocumento;
      });

      if (!match) {
        return baseDoc;
      }

      const estado = this.extraerEstadoDocumento(match);
      const estadoRevision = this.construirEstadoRevision(estado);

      return {
        ...baseDoc,
        nombre: baseDoc.nombre,
        estado,
        checked: estadoRevision.checked,
        estadoAnteriorCheck: estadoRevision.estadoAnteriorCheck,
        autorSoporte: baseDoc.rolUsuario === 'DOCENTE'
          ? 'Docente': this.obtenerNombreRol(baseDoc.rolUsuario),
        enlace: match?.Enlace,
        fileName: match?.Nombre || baseDoc.nombre,
        mimeType: 'application/pdf',
        documentoSolicitudId: this.extraerDocumentoSolicitudId(match),
        documentoId: this.extraerDocumentoId(match),
        cargandoArchivo: false,
        pendienteCrear: false,
      };
    });

    const idsBase = new Set(
      documentosBase
        .map((d) => d.idTipoDocumento)
        .filter((id): id is number => !!id)
    );

    const documentosAdicionales = docsBackend
      .filter((doc: any) => {
        const tipoId = this.extraerTipoDocumentoId(doc);
        return !!tipoId && !idsBase.has(tipoId);
      })
      .map((doc: any, index: number) => {
        const estado = this.extraerEstadoDocumento(doc);
        const estadoRevision = this.construirEstadoRevision(estado);
        const rolUsuario = this.obtenerRolUsuarioDocumento(doc);

        return {
          id: 10000 + index,
          nombre: doc?.Nombre || 'Documento',
          autorSoporte: this.extraerAutorSoporte(doc),
          estado,
          checked: estadoRevision.checked,
          estadoAnteriorCheck: estadoRevision.estadoAnteriorCheck,
          code: this.extraerTipoDocumentoCodigo(doc),
          idTipoDocumento: this.extraerTipoDocumentoId(doc),
          descripcion: doc?.Descripcion || doc?.Nombre || 'Documento',
          enlace: doc?.Enlace,
          fileName: doc?.Nombre || 'Documento',
          mimeType: 'application/pdf',
          documentoSolicitudId: this.extraerDocumentoSolicitudId(doc),
          documentoId: this.extraerDocumentoId(doc),
          cargandoArchivo: false,
          pendienteCrear: false,
          rolUsuario,
          esDocumentoRolActual: rolUsuario === this.rolDocumentalActual(),
        }
      });

    this.documentos = [...documentosBase, ...documentosAdicionales];
    this.cargarBase64DocumentosGuardados();
  }

  private rolDocumentalActual(): string {
    return this.role === 'DECANO' ? 'DECANATURA' : this.role;
  }

  private obtenerRolesDocumentalesVisibles(): string[] {
    const rolActual = this.rolDocumentalActual();
    const ordenActual = this.ORDEN_ROL_DOCUMENTAL[rolActual] ?? 0;

    return Object.entries(this.ORDEN_ROL_DOCUMENTAL)
      .filter(([, orden]) => orden <= ordenActual)
      .sort((a, b) => a[1] - b[1])
      .map(([rol]) => rol);
  }

  private normalizarRolUsuario(value: any): string {
    return String(value ?? 'DOCENTE').trim().toUpperCase();
  }

  private obtenerRolUsuarioDocumento(d: any): string {
    return this.normalizarRolUsuario(d.RolUsuario ?? d.rol_usuario ?? 'DOCENTE');
  }

  private agregarDocumentoAEliminar(id: number | undefined): void {
    if (!id || this.documentosDesactivarIds.includes(id)) return;
    this.documentosDesactivarIds.push(id);
  }

  private toNumber(value: any): number | undefined {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }

  private extraerDocumentoSolicitudId(doc: any): number | undefined {
    return this.toNumber(
      doc?.DocumentoSolicitudId
      || doc?.DocumentoSolicitud?.Id
      || doc?.documento_solicitud_id
      || doc?.Id
      || doc?.id
    );
  }

  private extraerDocumentoId(doc: any): number | undefined {
    return this.toNumber(
      doc?.IdDocumento
      || doc?.DocumentoId
      || doc?.Documento?.Id
      || doc?.id_documento
    );
  }

  private extraerTipoDocumentoId(doc: any): number | undefined {
    return doc?.Tipo?.Id
      || doc?.TipoDocumentoId?.Id
      || doc?.TipoDocumentoId
      || doc?.tipo_documento_id;
  }

  private extraerTipoDocumentoCodigo(doc: any): string | undefined {
    return doc?.TipoDocumento
      || doc?.Tipo?.CodigoAbreviacion
      || doc?.TipoDocumentoId?.CodigoAbreviacion
      || doc?.tipo_documento;
  }


  private extraerAutorSoporte(doc: any): string {
    const metadatosRaw = doc?.Metadatos || doc?.metadatos;
    let metadatos: any = null;

    if (metadatosRaw && typeof metadatosRaw === 'object') {
      metadatos = metadatosRaw;
    } else if (typeof metadatosRaw === 'string') {
      try { metadatos = JSON.parse(metadatosRaw); } catch { metadatos = null; }
    }

    const rolRaw =
      doc?.Rol
      || doc?.rol
      || metadatos?.cargadoPor
      || metadatos?.cargadoPorLabel
      || doc?.RolUsuario
      || doc?.rol_usuario
      || doc?.UsuarioRol
      || doc?.usuario_rol;

    return this.obtenerNombreRol(rolRaw);
  }

  private obtenerNombreRol(rol: string | undefined | null): string {
    const key = String(rol || '').toUpperCase();
    switch (key) {
      case 'COORDINADOR': return 'Coordinador';
      case 'SECRETARIA_ACADEMICA': return 'Secretaría Académica';
      case 'SECRETARIA_ACADEMICA': return 'Secretaría Académica';
      case 'SECRETARIA_GENERAL': return 'Secretaría General';
      case 'ADMIN_SGA': return 'Secretaría General';
      case 'DECANATURA':
      case 'DECANO': return 'Decanatura';
      case 'DOCENTE': return 'Docente';
      case 'PROFE': return 'Docente';
      default: return key || '-';
    }
  }

  private extraerEstadoDocumento(doc: any): EstadoDocumento {
    const codigoRaw = String(
      doc?.Estado?.CodigoAbreviacion
      || doc?.EstadoDocumentoId?.CodigoAbreviacion
      || doc?.estado
      || ''
    ).trim().toUpperCase();

    const normalizados: Record<string, EstadoDocumento> = {
      PENDIENTE: 'PENDIENTE',
      CARG: 'CARG',
      APROB: 'APROB',
      NO_APROB: 'NO_APROB',
      RECH: 'NO_APROB',
      CORR: 'CORR',
      SUBS: 'SUBS',
      SUBS_PROY: 'SUBS_PROY',
      SUBS_SEC_ACAD: 'SUBS_SEC_ACAD',
      SUBS_SEC_GRAL: 'SUBS_SEC_GRAL',
      SUBS_DEC: 'SUBS_DEC',
      ANUL: 'ANUL',
      ENV_REV_PROY: 'ENV_REV_PROY',
      ENV_REV_SEC_ACAD: 'ENV_REV_SEC_ACAD',
      ENV_REV_SEC_GRAL: 'ENV_REV_SEC_GRAL',
      ENV_REV_DEC: 'ENV_REV_DEC',
      APROB_PROY: 'APROB_PROY',
      APROB_SEC_ACAD: 'APROB_SEC_ACAD',
      APROB_SEC_GRAL: 'APROB_SEC_GRAL',
      APROB_DEC: 'APROB_DEC',
    };

    return normalizados[codigoRaw] ?? 'CARG';
  }

  private extraerBase64Gestor(resp: any): string | null {
    return resp?.Data?.file
      || resp?.file
      || null;
  }

  private cargarBase64DocumentosGuardados(): void {
    const documentosConEnlace = this.documentos.filter(
      (d) => d.code !== 'FR010' && d.enlace && !d.base64
    );

    if (!documentosConEnlace.length) {
      return;
    }

    const peticiones = documentosConEnlace.map((doc) => {
      doc.cargandoArchivo = true;

      return this.solicitudesService.obtenerDocumentoPorEnlace(doc.enlace!).pipe(
        map((resp: any) => {
          const base64 = this.extraerBase64Gestor(resp);
          return { doc, base64 };
        }),
        catchError(() => of({ doc, base64: null }))
      );
    });

    forkJoin(peticiones).subscribe((resultados) => {
      resultados.forEach(({ doc, base64 }) => {
        doc.cargandoArchivo = false;

        if (base64) {
          doc.base64 = base64;
          doc.mimeType = doc.mimeType || 'application/pdf';
          doc.estado = doc.estado || 'CARG';
        }
      });

      this.documentos = [...this.documentos];
    });
  }

  // ========== Acciones revisor ==========
  adjuntarSoporteRevisor(doc: DocumentoItem, fileInput: HTMLInputElement): void {
    if (this.permisosListos && !this.permisos['adjuntar_soporte_revision']) { this.popup.error(this.translate.instant('GLOBAL.acceso_denegado')); return; }
    
    this.documentoRolEnCarga = doc;
    fileInput.value = '';
    fileInput.click();
  }

  async onReviewerFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!this.documentoRolEnCarga) {
      this.popup.error(this.translate.instant('POPUPS.DOC_NO_ENCONTRADO'));
      input.value = '';
      return;
    }

    if (file.type !== 'application/pdf') {
      this.popup.error(this.translate.instant('POPUPS.SOLO_PDF'));
      input.value = '';
      return;
    }

    try {
      const docActual = this.documentoRolEnCarga;

      const debeDesactivarDocumentoActual =
        !this.isCreating &&
        !!this.id &&
        !docActual.pendienteCrear &&
        !!docActual.documentoSolicitudId;

      if (debeDesactivarDocumentoActual) {
        this.agregarDocumentoAEliminar(docActual.documentoSolicitudId);
      }
      
      const base64 = await this.fileToBase64(file);

      docActual.base64 = base64;
      docActual.fileName = file.name;
      docActual.mimeType = file.type;
      docActual.estado = 'CARG';
      docActual.pendienteCrear = true;
      docActual.enlace = undefined;
      docActual.documentoSolicitudId = undefined;
      docActual.documentoId = undefined;
      docActual.metadatos = {};

      this.documentos = [...this.documentos];

      this.popup.success(this.translate.instant('POPUPS.DOC_ADJUNTADO', {nombre: docActual.nombre,}),);
    } catch (error) {
      this.popup.error(this.translate.instant('POPUPS.ERROR_PROCESAR_ARCHIVO'));
    } finally {
      this.documentoRolEnCarga = null;
      input.value = '';
    }
  }
  
  retornarSolicitud() {
    if (this.permisosListos && !this.permisos['retornar_solicitud']) { this.popup.error(this.translate.instant('GLOBAL.acceso_denegado')); return; }
    this.popup.confirm(
      this.translate.instant('POPUPS.RETORNAR_MSG'),
      this.translate.instant('ACTIONS.RETORNAR'),
      this.translate.instant('ACTIONS.CANCELAR'),
    ).then((result) => {
      if (result.isConfirmed) {
        this.ejecutarCambioEstado('RETORNAR', this.observacionRevision, 'POPUPS.SOLICITUD_RETORNADA_OK');
      }
    });
  }

  rechazarSolicitud() {
    if (this.permisosListos && !this.permisos['rechazar_solicitud']) { this.popup.error(this.translate.instant('GLOBAL.acceso_denegado')); return; }
    this.popup.confirm(
      this.translate.instant('POPUPS.RECHAZAR_MSG'),
      this.translate.instant('ACTIONS.RECHAZAR'),
      this.translate.instant('ACTIONS.CANCELAR'),
    ).then((result) => {
      if (result.isConfirmed) {
        this.ejecutarCambioEstado('RECHAZAR', this.observacionRevision, 'POPUPS.SOLICITUD_RECHAZADA_OK');
      }
    });
  }

  enviarRevisor() {
    if (this.permisosListos && !this.permisos['enviar_revision']) { this.popup.error(this.translate.instant('GLOBAL.acceso_denegado')); return; }
    if (!this.allDocsChecked) {
      this.popup.alertError(this.translate.instant('POPUPS.DOCS_NO_VALIDOS'));
      return;
    }

    this.popup.confirm(
      this.translate.instant('POPUPS.AVALAR_MSG'),
      this.translate.instant('ACTIONS.ENVIAR'),
      this.translate.instant('ACTIONS.CANCELAR'),
    ).then((result) => {
      if (result.isConfirmed) {
        this.ejecutarCambioEstado('ENVIAR', this.observacionRevision, 'POPUPS.SOLICITUD_AVALADA_OK');
      }
    });
  }

  // ========== Acciones Supervisor / Decanatura ==========
  darInicioComision() {
    if (this.permisosListos && !this.permisos['dar_inicio_solicitud']) { this.popup.error(this.translate.instant('GLOBAL.acceso_denegado')); return; }
    if (!this.fechaInicioContrato) {
      this.popup.alertError(this.translate.instant('POPUPS.INICIO_FECHA_REQUIRED'));
      return;
    }

    this.popup.confirm(
      this.translate.instant('POPUPS.INICIO_MSG'),
      this.translate.instant('ACTIONS.ACEPTAR'),
      this.translate.instant('ACTIONS.CANCELAR'),
    ).then((result) => {
      if (result.isConfirmed) {
        const fechaStr = this.fechaInicioContrato!.toISOString().slice(0, 10);
        const tipoLabel = this.tipoFechaSupervisor === 'INICIO' ? 'Fecha inicio contrato' : 'Fecha fin prórroga';
        const obs = this.observacionRevision?.trim()
          ? `${this.observacionRevision.trim()} | ${tipoLabel}: ${fechaStr}`
          : `${tipoLabel}: ${fechaStr}`;

        this.ejecutarCambioEstado('DAR_INICIO', obs, 'POPUPS.INICIO_REGISTRADO_OK');
      }
    });
  }

  regresar() {
    this.router.navigate(['/solicitudes'], { queryParams: { role: this.role } });
  }
}
