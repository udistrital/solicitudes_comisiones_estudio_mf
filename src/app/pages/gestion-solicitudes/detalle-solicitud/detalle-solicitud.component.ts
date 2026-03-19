import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';

import { Role } from '../../../models/roles.model';
import { EstadoSolicitud } from '../../../models/estados.model';
import { PopUpManager } from '../../../managers/popup.manager';
import { estadoSolicitudClass } from '../../../utils/estado-solicitud.util';

import { VisorDocumentosComponent } from '../components/visor-documentos/visor-documentos.component';
import { Fr010FormComponent } from '../components/fr010-form/fr010-form.component';

type DocumentoEstado = 'PENDIENTE' | 'ADJUNTO' | 'VALIDO' | 'NO_VALIDO';

interface DocumentoItem {
  id: number;
  nombre: string;
  autorSoporte?: string;
  estado: DocumentoEstado;
  checked: boolean; // usado por revisores
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
  estadoSolicitud: EstadoSolicitud = 'BORRADOR';
  docenteNombre = 'María Pérez';
  proyecto = 'Ingeniería de Sistemas';

  // Supervisor: fecha inicio contrato
  fechaInicioContrato: Date | null = null;
  tipoFechaSupervisor: 'INICIO' | 'PRORROGA' = 'INICIO';

  // Docs requeridos (para el desplegable)
  requiredDocs: RequiredDocOption[] = [
    { code: 'FR010', name: 'FR-010 Formulario de solicitud inicial', kind: 'FORM' },
    { code: 'CARTA', name: 'Carta de motivación', kind: 'FILE' },
    { code: 'PLAN', name: 'Plan de trabajo', kind: 'FILE' },
    { code: 'AVAL', name: 'Aval del proyecto curricular', kind: 'FILE' },
  ];

  selectedRequiredDoc: RequiredDocOption = this.requiredDocs[0];

  // Tabla docs (demo)
  documentos: DocumentoItem[] = [
    { id: 1, nombre: 'FR-010 Formulario de solicitud inicial', autorSoporte: 'Docente', estado: 'PENDIENTE', checked: false },
    { id: 2, nombre: 'Carta de motivación', autorSoporte: 'Docente', estado: 'PENDIENTE', checked: false },
    { id: 3, nombre: 'Plan de trabajo', autorSoporte: 'Docente', estado: 'PENDIENTE', checked: false },
    { id: 4, nombre: 'Aval del proyecto curricular', autorSoporte: 'Docente', estado: 'PENDIENTE', checked: false },
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
  ) {}

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));

    const qp = this.route.snapshot.queryParamMap;
    this.role = (qp.get('role') as Role) || 'DOCENTE';
    this.mode = (qp.get('mode') as any) || 'GESTIONAR';

    // si es revisor (no docente), simula que ya está en revisión
    if (this.role !== 'DOCENTE') {
      this.estadoSolicitud = 'EN_REVISION';
    }

    // Docente VER → muestra estado real de la solicitud (demo: AVALADA)
    if (this.role === 'DOCENTE' && this.mode === 'VER') {
      this.estadoSolicitud = 'AVALADA';
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
  guardarDocente() {
    this.popup.success(this.translate.instant('POPUPS.GUARDADO'));
  }

  enviarDocente() {
    this.popup.confirm(
      this.translate.instant('POPUPS.CONFIRMAR_ENVIO'),
      this.translate.instant('ACTIONS.ENVIAR'),
      this.translate.instant('ACTIONS.CANCELAR'),
    ).then((result) => {
      if (result.isConfirmed) {
        this.estadoSolicitud = 'RADICADA';
        this.popup.success(this.translate.instant('POPUPS.SOLICITUD_ENVIADA_OK'));
        this.router.navigate(['/solicitudes'], { queryParams: { role: this.role } });
      }
    });
  }

  adjuntarDocumento() {
    if (!this.selectedRequiredDoc) return;

    if (this.selectedRequiredDoc.kind === 'FORM') {
      this.popup.error(this.translate.instant('POPUPS.FR010_USE_GUARDAR'));
      return;
    }

    const doc = this.documentos.find((d) => d.nombre === this.selectedRequiredDoc.name);
    if (!doc) return;

    doc.estado = 'ADJUNTO';
    doc.autorSoporte = 'Docente';
    this.documentos = [...this.documentos];
    this.popup.success(this.translate.instant('POPUPS.DOC_ADJUNTADO', { nombre: doc.nombre }));
  }

  eliminarDocumento(doc: DocumentoItem) {
    this.popup.confirm(
      this.translate.instant('POPUPS.ELIMINAR_DOC_MSG', { nombre: doc.nombre }),
      this.translate.instant('ACTIONS.ELIMINAR'),
      this.translate.instant('ACTIONS.CANCELAR'),
    ).then((result) => {
      if (result.isConfirmed) {
        doc.estado = 'PENDIENTE';
        doc.checked = false;
        this.documentos = [...this.documentos];
        this.popup.success(this.translate.instant('POPUPS.DOC_ELIMINADO', { nombre: doc.nombre }));
      }
    });
  }

  verDocumento(doc: DocumentoItem) {
    this.dialog.open(VisorDocumentosComponent, {
      width: '720px',
      data: { nombre: doc.nombre, estado: doc.estado, autor: doc.autorSoporte },
    });
  }

  guardarFR010() {
    if (!this.fr010Comp) {
      this.popup.error(this.translate.instant('POPUPS.FR010_NO_LISTO'));
      return;
    }
    this.fr010Comp.save();
  }

  onFr010Saved(payload: any) {
    this.fr010Json = payload;
    console.log('[FR-010 JSON]', payload);

    const fr = this.documentos.find((d) => d.nombre.startsWith('FR-010'));
    if (fr) {
      fr.estado = 'ADJUNTO';
      fr.autorSoporte = 'Docente';
    }
    this.documentos = [...this.documentos];
    this.popup.success(this.translate.instant('POPUPS.FR010_GUARDADO'));
  }

  // ========== Acciones revisor ==========
  adjuntarSoporteRevisor() {
    this.popup.success(this.translate.instant('POPUPS.ADJUNTAR_DOCS'));
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
