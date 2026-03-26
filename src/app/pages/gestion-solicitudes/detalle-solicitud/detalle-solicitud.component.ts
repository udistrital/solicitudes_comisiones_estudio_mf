import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';

import { Role } from '../../../models/roles.model';
import { EstadoSolicitud, EstadoDocumento } from '../../../models/estados.model';
import { PopUpManager } from '../../../managers/popup.manager';
import { estadoSolicitudClass, estadoDocumentoClass } from '../../../utils/estado-solicitud.util';

import { VisorDocumentosComponent } from '../components/visor-documentos/visor-documentos.component';
import { Fr010FormComponent } from '../components/fr010-form/fr010-form.component';
import { SolicitudesService } from '../../../services/solicitudes.service';

// Códigos de tipo documental — FR010 y SOPORTE_REVISOR son fijos del frontend,
// el resto viene dinámicamente del CRUD (tipo_documento_solicitud)
type TipoDocumentalCode = 'FR010' | 'SOPORTE_REVISOR' | string;

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

  // Solicitud (demo)
  radicado = 'SOL-2026-0001';
  estadoSolicitud: EstadoSolicitud = 'NO_ENV';
  docenteNombre = 'María Pérez';
  proyecto = 'Ingeniería de Sistemas';

  identificacionDocente = 86064919;
  tipoSolicitudId = 2;
  guardando = false;

  // Supervisor: fecha inicio contrato
  fechaInicioContrato: Date | null = null;
  tipoFechaSupervisor: 'INICIO' | 'PRORROGA' = 'INICIO';

  // Para saber qué documento se está cargando
  documentoEnCarga: DocumentoItem | null = null;
  reviewerUploadCounter = 1000;
  MIN_NOMBRE_SOPORTE_REVISOR = 12;

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
  observacionDocente = 'Aquí el docente describe su solicitud... (demo)';
  observacionRevision = '';

  observacionesSubsanacion: ObservacionItem[] = [
    { fecha: '2026-02-10 10:00', autor: 'COORDINACION', texto: 'Falta anexar carta de intención.' },
    { fecha: '2026-02-11 08:30', autor: 'SECRETARIA_ACADEMICA', texto: 'Verificar certificado de evaluación docente.' },
  ];

  fr010Json: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private popup: PopUpManager,
    private translate: TranslateService,
    private solicitudesService: SolicitudesService,
  ) {}

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));

    const qp = this.route.snapshot.queryParamMap;
    this.role = (qp.get('role') as Role) || 'DOCENTE';
    this.mode = (qp.get('mode') as any) || 'GESTIONAR';

    // si es revisor (no docente), simula que ya está en revisión
    if (this.role !== 'DOCENTE') {
      this.estadoSolicitud = 'REV_PROY';
    }

    // Docente VER → muestra estado real de la solicitud (demo: APROB_EJEC)
    if (this.role === 'DOCENTE' && this.mode === 'VER') {
      this.estadoSolicitud = 'APROB_EJEC';
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
          descripcion: d.Descripcion || d.Nombre,
        }));

        this.requiredDocs = [this.FR010_OPTION, ...docsCrud];
        this.documentos = this.buildDocumentos(this.requiredDocs);
        this.selectedRequiredDoc = this.requiredDocs[0];
        this.cargandoTiposDoc = false;
      },
      error: () => {
        this.cargandoTiposDoc = false;
        this.popup.error(this.translate.instant('POPUPS.ERROR_CARGAR_TIPOS_DOC'));
      },
    });
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
    const payload = this.construirPayloadCrearSolicitud();
    console.log('[PAYLOAD GUARDAR BORRADOR]', payload)
    // Si vas a guardar borrador en el MID, aquí sería:
    // this.solicitudesMidService.crearSolicitud(payload).subscribe(...);

    this.popup.success(this.translate.instant('POPUPS.GUARDADO'));
  }

  enviarDocente(): void {
    this.popup.confirm(
      this.translate.instant('POPUPS.CONFIRMAR_ENVIO'),
      this.translate.instant('ACTIONS.ENVIAR'),
      this.translate.instant('ACTIONS.CANCELAR'),
    ).then((result) => {
      if (!result.isConfirmed) {
        return;
      }

      const payload = this.construirPayloadCrearSolicitud();
      console.log('[PAYLOAD ENVIAR SOLICITUD]', payload);

      // cuando se tenga la conexion con el mid aqui se haria el POST real:
      // this.solicitudesMidService.crearSolicitud(payload).subscribe({
      //   next: (resp) => {
      //     this.estadoSolicitud = 'RAD';
      //     this.popup.success(this.translate.instant('POPUPS.SOLICITUD_ENVIADA_OK'));
      //     this.router.navigate(['/solicitudes'], { queryParams: { role: this.role } });
      //   },
      //   error: () => {
      //     this.popup.alertError(this.translate.instant('POPUPS.ERROR_ENVIAR_SOLICITUD'));
      //   }
      // });

      // Temporal mientras se conecta con el mid:
      this.estadoSolicitud = 'RAD';
      this.popup.success(this.translate.instant('POPUPS.SOLICITUD_ENVIADA_OK'));
      this.router.navigate(['/solicitudes'], { queryParams: { role: this.role } });
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
      const base64 = await this.fileToBase64(file);

      this.documentoEnCarga.base64 = base64;
      this.documentoEnCarga.fileName = file.name;
      this.documentoEnCarga.mimeType = file.type;
      this.documentoEnCarga.autorSoporte = 'Docente';
      this.documentoEnCarga.estado = 'CARG';
      this.documentoEnCarga.metadatos = {
        documento_requerido: this.documentoEnCarga.nombre,
        codigo: this.documentoEnCarga.code,
        cargadoPor: 'DOCENTE',
        fechaCarga: new Date().toISOString(),
      };

      this.documentos = [...this.documentos];

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

  eliminarDocumento(doc: DocumentoItem) {
    this.popup.confirm(
      this.translate.instant('POPUPS.ELIMINAR_DOC_MSG', { nombre: doc.nombre || doc.fileName || 'documento' }),
      this.translate.instant('ACTIONS.ELIMINAR'),
      this.translate.instant('ACTIONS.CANCELAR'),
    ).then((result) => {
      if (result.isConfirmed) {
        if (doc.esSoporteRevisor) {
          this.documentos = this.documentos.filter((d) => d.id !== doc.id);
        } else {
          doc.estado = 'PENDIENTE';
          doc.checked = false;
          doc.base64 = undefined;
          doc.fileName = undefined;
          doc.mimeType = undefined;
          doc.metadatos = undefined;
        }

        this.documentos = [...this.documentos];
        this.popup.success(this.translate.instant('POPUPS.DOC_ELIMINADO', { nombre: doc.nombre || doc.fileName || 'documento' }));
      }
    });
  }

  verDocumento(doc: DocumentoItem): void {
    if (!doc.base64) {
      this.popup.error(this.translate.instant('POPUPS.DOC_NO_DISPONIBLE'));
      return;
    }

    this.dialog.open(VisorDocumentosComponent, {
    width: '900px',
    maxWidth: '95vw',
    data: {
      nombre: doc.fileName || doc.nombre,
      mimeType: doc.mimeType || 'application/pdf',
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
    this.popup.success(this.translate.instant('POPUPS.FR010_GUARDADO'));
  }

  // ========== Construcción del payload para el MID ==========
  construirPayloadCrearSolicitud(): any {
    const documentosAdjuntos = this.documentos
      .filter((d) => d.base64)
      .map((d) => ({
        IdTipoDocumento: d.idTipoDocumento,
        nombre: d.fileName || d.nombre,
        descripcion: d.descripcion || d.nombre,
        metadatos: {
          ...(d.metadatos || {}),
          nombreDocumentoRequerido: d.nombre,
          tipoMime: d.mimeType,
        },
        file: d.base64,
      }));

    return {
      Identificacion: this.identificacionDocente,
      TipoSolicitudId: this.tipoSolicitudId,
      DetalleSolicitud: {
        observacionDocente: this.observacionDocente,
        proyecto: this.proyecto,
        docenteNombre: this.docenteNombre,
        fr010: this.fr010Json,
        documentosResumen: this.documentos.map((d) => ({
          id: d.id,
          nombre: d.nombre,
          estado: d.estado,
          fileName: d.fileName || null,
          mimeType: d.mimeType || null,
          tieneArchivo: !!d.base64,
          code: d.code,
        })),
      },

      // Como en el MID hoy está como string,
      // aquí enviamos la lista serializada
      DocumentoSolicitud: JSON.stringify(documentosAdjuntos),
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

      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
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
        this.estadoSolicitud = 'CORR';
        if (this.observacionRevision.trim()) {
          this.observacionesSubsanacion.push({
            fecha: new Date().toISOString().slice(0, 16).replace('T', ' '),
            autor: this.role,
            texto: this.observacionRevision.trim(),
          });
          this.observacionRevision = '';
        }
        this.popup.alertError(this.translate.instant('POPUPS.SOLICITUD_RETORNADA'));
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
        this.estadoSolicitud = 'NO_APROB';
        if (this.observacionRevision.trim()) {
          this.observacionesSubsanacion.push({
            fecha: new Date().toISOString().slice(0, 16).replace('T', ' '),
            autor: this.role,
            texto: `[RECHAZO] ${this.observacionRevision.trim()}`,
          });
          this.observacionRevision = '';
        }
        this.popup.alertError(this.translate.instant('POPUPS.SOLICITUD_NO_APROBADA'));
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
        this.estadoSolicitud = 'APROB_EJEC';
        this.popup.alertSuccess(this.translate.instant('POPUPS.DOCS_AVALADOS'));
        this.router.navigate(['/solicitudes'], { queryParams: { role: this.role } });
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
        this.popup.alertSuccess(this.translate.instant('POPUPS.INICIO_REGISTRADO'));
        this.router.navigate(['/solicitudes'], { queryParams: { role: this.role } });
      }
    });
  }

  regresar() {
    this.router.navigate(['/solicitudes'], { queryParams: { role: this.role } });
  }
}
