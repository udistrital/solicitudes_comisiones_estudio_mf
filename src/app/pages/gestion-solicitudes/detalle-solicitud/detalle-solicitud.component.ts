import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';

import { Role, resolverRolEfectivo } from '../../../models/roles.model';
import { EstadoSolicitud, EstadoDocumento } from '../../../models/estados.model';
import { PopUpManager } from '../../../managers/popup.manager';
import { estadoSolicitudClass, estadoDocumentoClass } from '../../../utils/estado-solicitud.util';

import { VisorDocumentosComponent } from '../components/visor-documentos/visor-documentos.component';
import { Fr010FormComponent } from '../components/fr010-form/fr010-form.component';
import { SolicitudesService } from '../../../services/solicitudes.service';
import { getDocumento, getRolesUsuario } from '../../../utils/auth.util';

import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

type AccionEstado = 'ENVIAR' | 'RETORNAR' | 'RECHAZAR' | 'DAR_INICIO';

// Códigos de tipo documental — FR010 y SOPORTE_REVISOR son fijos del frontend,
// el resto viene dinámicamente del CRUD (tipo_documento_solicitud)
type TipoDocumentalFijo = 'FR010' | 'SOPORTE_REVISOR';

type TipoDocumentalCode =
  | TipoDocumentalFijo
  | (string & {});

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
  esSoporteRevisor?: boolean;
  nombreTemporal?: string;

  enlace?: string;
  cargandoArchivo?: boolean;
  documentoSolicitudId?: number;
  documentoId?: number;
  pendienteCrear?: boolean;
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
}

@Component({
  selector: 'app-detalle-solicitud',
  templateUrl: './detalle-solicitud.component.html',
  styleUrls: ['./detalle-solicitud.component.scss'],
})
export class DetalleSolicitudComponent implements OnInit {
  @ViewChild(Fr010FormComponent) fr010Comp?: Fr010FormComponent;

  // Params
  id!: number;
  role: Role = 'DOCENTE';
  mode: 'EDITAR' | 'GESTIONAR' | 'VER' = 'GESTIONAR';

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
  reviewerUploadCounter = 1000;
  MIN_NOMBRE_SOPORTE_REVISOR = 12;

  /** Id del tipo documental DE_SOL_COM resuelto desde documento_crud */
  private idTipoDocumentoSoporte: number | null = null;

  // FR-010 siempre presente como opción fija del frontend
  private readonly FR010_OPTION: RequiredDocOption = {
    code: 'FR010', name: 'FR-010 Formulario de solicitud inicial', kind: 'FORM', idTipoDocumento: 0, descripcion: 'Formulario FR-010'
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

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly dialog: MatDialog,
    private readonly popup: PopUpManager,
    private readonly translate: TranslateService,
    private readonly solicitudesService: SolicitudesService,
  ) {}

  ngOnInit(): void {
    this.identificacionDocente = Number(getDocumento()) || 0;

    const rawId = this.route.snapshot.paramMap.get('id');

    this.role = resolverRolEfectivo(getRolesUsuario()) ?? 'DOCENTE';
    this.mode = (this.route.snapshot.queryParamMap.get('mode') as any) || 'GESTIONAR';

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
      this.id = Number(rawId);
      this.cargarDetalleSolicitud(this.id);
    }

    this.selectedRequiredDoc = this.requiredDocs[0];

    this.cargarTiposDocumentoCrud();
    this.cargarIdTipoDocumentoSoporte();
  }

  private cargarIdTipoDocumentoSoporte(): void {
    this.solicitudesService.obtenerTipoDocumentoPorCodigo('DE_SOL_COM').subscribe({
      next: (resp: any) => {
        const data: any[] = Array.isArray(resp) ? resp : resp?.Data || [];
        const match = data.find((d: any) => d.CodigoAbreviacion === 'DE_SOL_COM');
        if (match?.Id != null) {
          this.idTipoDocumentoSoporte = match.Id;
        }
      },
      error: () => {
        // Se maneja en ejecutarCambioEstado si hay soportes del revisor
      },
    });
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
          descripcion: d.Descripcion || d.Nombre,
        }));

        this.requiredDocs = [this.FR010_OPTION, ...docsCrud];
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
    const estado = data.EstadoSolicitud || {};
    if (estado.CodigoAbreviacion) {
      this.estadoSolicitud = estado.CodigoAbreviacion as EstadoSolicitud;
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

    // --- Documentos ---
    this.poblarDocumentosDesdeDetalle(data);
  }

  private buildDocumentos(docs: RequiredDocOption[]): DocumentoItem[] {
    return docs.map((d, i) => ({
      id: i + 1,
      nombre: d.name,
      autorSoporte: 'Docente',
      estado: 'PENDIENTE' as EstadoDocumento,
      checked: false,
      code: d.code,
      idTipoDocumento: d.idTipoDocumento,
      descripcion: d.descripcion,
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
    return this.role === 'DECANO';
  }

  /** Docente editable solo en NO_ENV o CORR */
  get isDocenteEditable(): boolean {
    return this.isDocente
      && (this.estadoSolicitud === 'NO_ENV' || this.estadoSolicitud === 'CORR');
  }

  /** Docente en modo solo lectura (cualquier estado no editable) */
  get isDocenteReadOnly(): boolean {
    return this.isDocente && !this.isDocenteEditable;
  }

  get allDocsChecked(): boolean {
    return this.documentos.every((d) => d.checked);
  }

  get observacionesOrdenDesc(): ObservacionItem[] {
    return [...this.observacionesSubsanacion].reverse();
  }

  get estadoClass(): string {
    return estadoSolicitudClass(this.estadoSolicitud);
  }

  get estadoLabel(): string {
    return `ESTADOS.${this.estadoSolicitud}`;
  }

   get soportesRevisor(): DocumentoItem[] {
    return this.documentos.filter((d) => d.esSoporteRevisor);
  }

  get haySoportesRevisorInvalidos(): boolean {
    return this.soportesRevisor.some(
      (d) => !d.nombre || d.nombre.trim().length < this.MIN_NOMBRE_SOPORTE_REVISOR
    );
  }

  get puedeContinuarRevisor(): boolean {
    return !this.haySoportesRevisorInvalidos;
  }

  get puedeEnviarDocente(): boolean {
    return !!this.id && !!this.fr010Json && !!this.identificacionDocente && !this.cambiandoEstado;
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

  // ========== Checkbox → estado de documento ==========
  onDocCheckedChange(doc: DocumentoItem): void {
    doc.estado = doc.checked ? 'APROB' : 'PENDIENTE';
    // Refresh dataSource reference for mat-table
    this.documentos = [...this.documentos];
  }

  // ========== Acciones docente ==========
  guardarDocente(): void {
    if (this.guardando) return;
    
    if (this.isCreating){
      const payload = this.construirPayloadCrearSolicitud();
      if (!payload) return;

      console.log('[crear_solicitud] identificacionDocente:', this.identificacionDocente);
      console.log('[crear_solicitud] fr010Json:', this.fr010Json);
      console.log('[crear_solicitud] documentos:', this.documentos);
      console.log('[crear_solicitud] Payload enviado:', JSON.stringify(payload, null, 2));

      this.guardando = true;
      this.solicitudesService.crearSolicitud(payload).subscribe({
        next: () => {
          this.guardando = false;
          this.popup.success(this.translate.instant('POPUPS.SOLICITUD_GUARDADA'));
          this.router.navigate(['/solicitudes']);
        },
        error: () => {
          this.guardando = false;
          this.popup.error(this.translate.instant('POPUPS.ERROR_GUARDAR'));
        },
      });
      return;
    }

    this.persistirEdicionDocente('POPUPS.SOLICITUD_GUARDADA');
  }

  enviarDocente(): void {
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
    this.popup.confirm(
      this.translate.instant('POPUPS.ELIMINAR_DOC_MSG', { nombre: doc.nombre ?? doc.fileName ?? 'documento' }),
      this.translate.instant('ACTIONS.ELIMINAR'),
      this.translate.instant('ACTIONS.CANCELAR'),
    ).then((result) => {
      if (!result.isConfirmed) return;

      if (doc.esSoporteRevisor) {
        this.documentos = this.documentos.filter((d) => d.id !== doc.id);
        this.popup.success(
          this.translate.instant('POPUPS.DOC_ELIMINADO', {
            nombre: doc.nombre ?? doc.fileName ?? 'documento',
          }),
        );
        return;
      }

      const debeDesactivarDocumentoPersistido =
        !this.isCreating
        && !!this.id
        && !doc.pendienteCrear
        && !!doc.documentoSolicitudId;

      if (debeDesactivarDocumentoPersistido) {
        this.agregarDocumentoAEliminar(doc.documentoSolicitudId);
      }

      doc.estado = 'PENDIENTE';
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
    ADMINISTRADOR: 'REV_SEC_GRAL',
    ADMIN_SGA: 'REV_DEC',
    DECANO: 'APROB_EJEC',
  };

  private readonly ESTADO_RETORNAR: Partial<Record<Role, EstadoSolicitud>> = {
    COORDINADOR: 'SUBS_PROY',
    ADMINISTRADOR: 'SUBS_SEC_ACAD',
    ADMIN_SGA: 'SUBS_SEC_GRAL',
    DECANO: 'SUBS_DEC',
  };

  private readonly ROL_USUARIO_MAP: Record<Role, string> = {
    DOCENTE: 'DOCENTE',
    COORDINADOR: 'COORDINADOR',
    ADMINISTRADOR: 'ADMINISTRADOR',
    ADMIN_SGA: 'ADMIN_SGA',
    DECANO: 'DECANATURA',
  };

  private resolverNuevoEstado(accion: AccionEstado): EstadoSolicitud | null {
    switch (accion) {
      case 'ENVIAR':
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

  private construirPayloadCambioEstado(nuevoEstado: EstadoSolicitud, observacion: string): CambioEstadoPayload | null {
    const documentosRevisor = this.documentos
      .filter((d) => d.esSoporteRevisor && d.base64);

    // Si hay soportes del revisor, el id de tipo documental debe estar resuelto
    if (documentosRevisor.length > 0 && !this.idTipoDocumentoSoporte) {
      this.popup.error(this.translate.instant('POPUPS.ERROR_TIPO_DOC_NO_RESUELTO'));
      return null;
    }

    const documentosMapeados = documentosRevisor.map((d) => ({
      IdTipoDocumento: this.idTipoDocumentoSoporte,
      TipoDocumento: 'OTRO_SOP',
      EstadoDocumento: 'CARG',
      Nombre: d.fileName || d.nombre,
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

    this.cambiandoEstado = true;
    this.solicitudesService.cambiarEstadoSolicitud(payload).subscribe({
      next: () => {
        this.cambiandoEstado = false;
        this.popup.alertSuccess(this.translate.instant(mensajeExito));
        this.router.navigate(['/solicitudes'], { queryParams: { role: this.role } });
      },
      error: () => {
        this.cambiandoEstado = false;
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
      TipoDocumento: String(d.code || ''),
      EstadoDocumento: 'CARG',
      Nombre: d.fileName ?? d.nombre,
      Descripcion: d.descripcion ?? d.nombre,
      Metadatos: d.metadatos ?? {},
      File: d.base64,
    }));

    return {
      identificacion: this.identificacionDocente,
      tipo_solicitud_id: tipoSolicitudId || 2,
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
      TipoDocumento: String(d.code || ''),
      EstadoDocumento: 'CARG',
      Nombre: d.fileName || d.nombre,
      Descripcion: d.descripcion || d.nombre,
      Metadatos: d.metadatos || {},
      File: d.base64,
    }));

    const documentosDesactivar = [...new Set(
      this.documentosDesactivarIds.filter((id) => !!id && id > 0)
    )];

    return {
      tipo_solicitud_id: tipoSolicitudId || 2,
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

    this.documentos = this.documentos.map((baseDoc) => {
      if (baseDoc.code === 'FR010') {
        if (this.formularioRecuperado || this.fr010Json?.fr010) {
          return {
            ...baseDoc,
            estado: 'CARG',
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

      return {
        ...baseDoc,
        nombre: baseDoc.nombre,
        estado: this.extraerEstadoDocumento(match),
        autorSoporte: 'Docente',
        enlace: match?.Enlace,
        fileName: match?.Nombre || baseDoc.nombre,
        mimeType: 'application/pdf',
        documentoSolicitudId: this.extraerDocumentoSolicitudId(match),
        documentoId: this.extraerDocumentoId(match),
        cargandoArchivo: false,
        pendienteCrear: false,
      };
    });

    this.cargarBase64DocumentosPersistidos();
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

  private extraerEstadoDocumento(doc: any): EstadoDocumento {
    const codigo = doc?.Estado?.CodigoAbreviacion
      || doc?.EstadoDocumentoId?.CodigoAbreviacion
      || doc?.estado;

    if (codigo === 'APROB' || codigo === 'RECH' || codigo === 'PENDIENTE') {
      return codigo as EstadoDocumento;
    }

    return 'CARG';
  }

  private extraerBase64Gestor(resp: any): string | null {
    return resp?.Data?.file
      || resp?.file
      || null;
  }

  private cargarBase64DocumentosPersistidos(): void {
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
  adjuntarSoporteRevisor(fileInput: HTMLInputElement): void {
    fileInput.value = '';
    fileInput.click();
  }

  async onReviewerFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (file.type !== 'application/pdf') {
      this.popup.error(this.translate.instant('POPUPS.SOLO_PDF'));
      input.value = '';
      return;
    }

    try {
      const base64 = await this.fileToBase64(file);

      const nuevoDoc: DocumentoItem = {
        id: this.reviewerUploadCounter++,
        nombre: '',
        nombreTemporal: file.name.replace(/\.pdf$/i, ''),
        autorSoporte: this.role,
        estado: 'CARG',
        checked: false,
        code: 'SOPORTE_REVISOR',
        descripcion: 'Soporte cargado por revisor',
        base64,
        fileName: file.name,
        mimeType: file.type,
        esSoporteRevisor: true,
        metadatos: {
          cargadoPor: this.role,
          fechaCarga: new Date().toISOString(),
          origen: 'REVISOR',
        },
      };

      this.documentos = [...this.documentos, nuevoDoc];

      this.popup.success(this.translate.instant('POPUPS.SOPORTE_REVISOR_AGREGADO'));
    } catch (error) {
      this.popup.error(this.translate.instant('POPUPS.ERROR_PROCESAR_ARCHIVO'));
    } finally {
      input.value = '';
    }
  }

  NombreSoporteRevisorValido(doc: DocumentoItem): boolean {
    if (!doc.esSoporteRevisor) {
      return true;
    }
    return !!doc.nombre && doc.nombre.trim().length >= this.MIN_NOMBRE_SOPORTE_REVISOR;
  }

  actualizarNombreSoporteRevisor(doc: DocumentoItem, value: string): void {
    doc.nombre = value;
    this.documentos = [...this.documentos];
  }
  
  retornarSolicitud() {
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
