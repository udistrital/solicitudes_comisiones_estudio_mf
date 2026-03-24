import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';

import { Role } from '../../../models/roles.model';
import { EstadoSolicitud } from '../../../models/estados.model';
import { PopUpManager } from '../../../managers/popup.manager';
import { estadoSolicitudClass } from '../../../utils/estado-solicitud.util';
import { SolicitudesService } from '../../../services/solicitudes.service';
import { getDocumento } from '../../../utils/auth.util';

import { VisorDocumentosComponent } from '../components/visor-documentos/visor-documentos.component';
import { Fr010FormComponent } from '../components/fr010-form/fr010-form.component';

type DocumentoEstado = 'PENDIENTE' | 'ADJUNTO' | 'VALIDO' | 'NO_VALIDO';

interface DocumentoItem {
  id: number;
  nombre: string;
  autorSoporte?: string;
  estado: DocumentoEstado;
  checked: boolean; // usado por revisores

  // nuevos campos para manejo temporal en front
  code?: 'FR010' | 'CARTA' | 'PLAN' | 'AVAL' | 'SOPORTE_REVISOR';
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
  code: 'FR010' | 'CARTA' | 'PLAN' | 'AVAL';
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

  // Modo creación
  isCreating = false;
  guardando = false;

  // Solicitud (demo)
  radicado = 'SOL-2026-0001';
  estadoSolicitud: EstadoSolicitud = 'BORRADOR';
  docenteNombre = 'María Pérez';
  proyecto = 'Ingeniería de Sistemas';

  identificacionDocente = 86064919;
  tipoSolicitudId = 2;

  formularioCompletado = false;
  
  // Supervisor: fecha inicio contrato
  fechaInicioContrato: Date | null = null;
  tipoFechaSupervisor: 'INICIO' | 'PRORROGA' = 'INICIO';

  // Para saber qué documento se está cargando
  documentoEnCarga: DocumentoItem | null = null;
  reviewerUploadCounter = 1000;
  MIN_NOMBRE_SOPORTE_REVISOR = 12;

  // Docs requeridos (para el desplegable)
  requiredDocs: RequiredDocOption[] = [
    { code: 'FR010', name: 'FR-010 Formulario de solicitud inicial', kind: 'FORM', idTipoDocumento: 1, descripcion: 'Formulario FR-010' },
    { code: 'CARTA', name: 'Carta de motivación', kind: 'FILE', idTipoDocumento: 2, descripcion: 'Carta de motivación'  },
    { code: 'PLAN', name: 'Plan de trabajo', kind: 'FILE', idTipoDocumento: 3, descripcion: 'Plan de trabajo' },
    { code: 'AVAL', name: 'Aval del proyecto curricular', kind: 'FILE', idTipoDocumento: 4, descripcion: 'Aval del proyecto curricular' },
  ];

  selectedRequiredDoc: RequiredDocOption = this.requiredDocs[0];

  // Tabla docs (demo)
  documentos: DocumentoItem[] = [
    { id: 1, nombre: 'FR-010 Formulario de solicitud inicial', autorSoporte: 'Docente', estado: 'PENDIENTE', checked: false, code: 'FR010', idTipoDocumento: 1, descripcion: 'Formulario FR-010'},
    { id: 2, nombre: 'Carta de motivación', autorSoporte: 'Docente', estado: 'PENDIENTE', checked: false, code: 'CARTA', idTipoDocumento: 2, descripcion: 'Carta de motivación' },
    { id: 3, nombre: 'Plan de trabajo', autorSoporte: 'Docente', estado: 'PENDIENTE', checked: false, code: 'PLAN', idTipoDocumento: 3, descripcion: 'Plan de trabajo' },
    { id: 4, nombre: 'Aval del proyecto curricular', autorSoporte: 'Docente', estado: 'PENDIENTE', checked: false, code: 'AVAL', idTipoDocumento: 4, descripcion: 'Aval del proyecto curricular' },
  ];

  // Observaciones
  observacionDocente = 'Aquí el docente describe su solicitud... (demo)';
  observacionRevision = '';

  observacionesSubsanacion: ObservacionItem[] = [
    { fecha: '2026-02-10 10:00', autor: 'COORDINACION', texto: 'Falta anexar plan de trabajo.' },
    { fecha: '2026-02-11 08:30', autor: 'SECRETARIA_ACADEMICA', texto: 'Verificar formato del FR-010.' },
  ];

  fr010Json: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private popup: PopUpManager,
    private translate: TranslateService,
<<<<<<< HEAD
    private solicitudesService: SolicitudesService,
=======
>>>>>>> origin/develop
  ) {}

  ngOnInit(): void {
    const rawId = this.route.snapshot.paramMap.get('id');
    this.isCreating = rawId === 'nuevo';
    this.id = this.isCreating ? 0 : Number(rawId);

    const qp = this.route.snapshot.queryParamMap;
    this.role = (qp.get('role') as Role) || 'DOCENTE';
    this.mode = (qp.get('mode') as any) || 'GESTIONAR';

    if (this.isCreating) {
      this.estadoSolicitud = 'BORRADOR';
      this.radicado = this.translate.instant('DETALLE.NUEVA_SOLICITUD');
      this.observacionDocente = '';
      this.observacionesSubsanacion = [];
      const doc = getDocumento();
      if (doc) this.identificacionDocente = Number(doc) || 0;
    } else {
      // si es revisor (no docente), simula que ya está en revisión
      if (this.role !== 'DOCENTE') {
        this.estadoSolicitud = 'EN_REVISION';
      }

      // Docente VER → muestra estado real de la solicitud (demo: AVALADA)
      if (this.role === 'DOCENTE' && this.mode === 'VER') {
        this.estadoSolicitud = 'AVALADA';
      }
    }

    this.selectedRequiredDoc = this.requiredDocs[0];
  }

  // ========== Helpers de UI ==========
  get isDocente(): boolean {
    return this.role === 'DOCENTE';
  }

  get isReadOnly(): boolean {
    return this.mode === 'VER';
  }

  get isSupervisor(): boolean {
    return this.role === 'SUPERVISION';
  }

  /** Docente editable solo en BORRADOR o POR_SUBSANAR */
  get isDocenteEditable(): boolean {
    return this.isDocente
      && (this.estadoSolicitud === 'BORRADOR' || this.estadoSolicitud === 'POR_SUBSANAR');
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
    const map: Record<DocumentoEstado, string> = {
      PENDIENTE: 'doc-chip--pendiente',
      ADJUNTO: 'doc-chip--adjunto',
      VALIDO: 'doc-chip--valido',
      NO_VALIDO: 'doc-chip--no_valido',
    };
    return map[d.estado] || '';
  }

  documentoChip(d: DocumentoItem): string {
    return `DOC_ESTADOS.${d.estado}`;
  }

  isFR010Selected(): boolean {
    return this.selectedRequiredDoc?.code === 'FR010';
  }

  // ========== Checkbox → estado de documento ==========
  onDocCheckedChange(doc: DocumentoItem): void {
    doc.estado = doc.checked ? 'VALIDO' : 'PENDIENTE';
    // Refresh dataSource reference for mat-table
    this.documentos = [...this.documentos];
  }

  // ========== Acciones docente ==========
  guardarDocente(): void {
    if (this.guardando) return;

    const payload = this.construirPayloadCrearSolicitud();
    console.log('[PAYLOAD GUARDAR BORRADOR]', payload);

    this.guardando = true;
    this.solicitudesService.crearSolicitud(payload).subscribe({
      next: (resp) => {
        this.guardando = false;
        if (this.isCreating && resp?.Data?.Id) {
          this.id = resp.Data.Id;
          this.isCreating = false;
        }
        this.popup.success(this.translate.instant('POPUPS.SOLICITUD_GUARDADA'));
      },
      error: () => {
        this.guardando = false;
        this.popup.error(this.translate.instant('POPUPS.ERROR_GUARDAR'));
      },
    });
  }

  enviarDocente(): void {
    this.popup.confirm(
      this.translate.instant('POPUPS.CONFIRMAR_ENVIO'),
      this.translate.instant('ACTIONS.ENVIAR'),
      this.translate.instant('ACTIONS.CANCELAR'),
    ).then((result) => {
      if (!result.isConfirmed) return;

      if (this.guardando) return;

      const payload = this.construirPayloadCrearSolicitud();
      console.log('[PAYLOAD ENVIAR SOLICITUD]', payload);

      this.guardando = true;
      this.solicitudesService.crearSolicitud(payload).subscribe({
        next: () => {
          this.guardando = false;
          this.estadoSolicitud = 'RADICADA';
          this.popup.success(this.translate.instant('POPUPS.SOLICITUD_ENVIADA_OK'));
          this.router.navigate(['/solicitudes'], { queryParams: { role: this.role } });
        },
        error: () => {
          this.guardando = false;
          this.popup.error(this.translate.instant('POPUPS.ERROR_ENVIAR'));
        },
      });
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
      this.documentoEnCarga.estado = 'ADJUNTO';
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
    this.formularioCompletado = this.fr010Comp?.isFormularioCompleto() ?? false;
    console.log('[FR-010 JSON]', payload, '| completado:', this.formularioCompletado);

    const fr = this.documentos.find((d) => d.code === 'FR010');
    if (fr) {
      fr.estado = 'ADJUNTO';
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
    // FR-010: datos frescos del componente si está visible, o último guardado
    let fr010Data = this.fr010Json?.fr010 || null;
    if (this.fr010Comp) {
      fr010Data = this.fr010Comp.getFormData();
      this.formularioCompletado = this.fr010Comp.isFormularioCompleto();
    }

    const identificacion = Number(getDocumento()) || this.identificacionDocente;

    const formulario: any = {
      formulario_completado: this.formularioCompletado,
    };

    if (fr010Data) {
      formulario.solicitante = fr010Data.solicitante;
      formulario.solicitud = fr010Data.solicitud;
      formulario.financiacion_colombia = fr010Data.financiacion_colombia;
      formulario.financiacion_exterior = fr010Data.financiacion_exterior;
      formulario.beca = fr010Data.beca;
    }

    const documento_solicitud = this.documentos
      .filter((d) => d.base64)
      .map((d) => ({
        IdTipoDocumento: d.idTipoDocumento,
        Nombre: d.fileName || d.nombre,
        Descripcion: d.descripcion || d.nombre,
        Metadatos: d.metadatos || {},
        File: d.base64,
      }));

    return {
      identificacion,
      tipo_solicitud_id: this.tipoSolicitudId,
      formulario,
      observacion: this.observacionDocente || '',
      cod_abreviacion_rol: 'PROFE',
      documento_solicitud,
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
        estado: 'ADJUNTO',
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
        this.estadoSolicitud = 'POR_SUBSANAR';
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
        this.estadoSolicitud = 'RECHAZADA';
        if (this.observacionRevision.trim()) {
          this.observacionesSubsanacion.push({
            fecha: new Date().toISOString().slice(0, 16).replace('T', ' '),
            autor: this.role,
            texto: `[RECHAZO] ${this.observacionRevision.trim()}`,
          });
          this.observacionRevision = '';
        }
        this.popup.alertError(this.translate.instant('POPUPS.SOLICITUD_RECHAZADA'));
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
        this.estadoSolicitud = 'AVALADA';
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

