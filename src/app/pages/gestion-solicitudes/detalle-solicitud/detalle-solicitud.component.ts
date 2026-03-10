import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';

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
    private popup: PopUpManager
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
    switch (d.estado) {
      case 'PENDIENTE': return 'Pendiente';
      case 'ADJUNTO': return 'Adjunto';
      case 'VALIDO': return 'Válido';
      case 'NO_VALIDO': return 'No válido';
      default: return d.estado;
    }
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
    this.popup.success('Guardado (demo)');
  }

  enviarDocente() {
    this.popup.confirm(
      'Usted confirma que desea enviar la solicitud. Una vez enviada, no podrá editarla.',
      'Enviar',
      'Cancelar'
    ).then((result) => {
      if (result.isConfirmed) {
        this.estadoSolicitud = 'RADICADA';
        this.popup.success('Solicitud enviada (demo)');
        this.router.navigate(['/solicitudes'], { queryParams: { role: this.role } });
      }
    });
  }

  adjuntarDocumento() {
    if (!this.selectedRequiredDoc) return;

    if (this.selectedRequiredDoc.kind === 'FORM') {
      this.popup.error('Para FR-010 usa "Guardar formulario". (demo)');
      return;
    }

    const doc = this.documentos.find((d) => d.nombre === this.selectedRequiredDoc.name);
    if (!doc) return;

    doc.estado = 'ADJUNTO';
    doc.autorSoporte = 'Docente';
    this.documentos = [...this.documentos];
    this.popup.success(`Documento adjuntado: ${doc.nombre} (demo)`);
  }

  eliminarDocumento(doc: DocumentoItem) {
    this.popup.confirm(
      `¿Desea eliminar el documento <b>${doc.nombre}</b>?`,
      'Eliminar',
      'Cancelar'
    ).then((result) => {
      if (result.isConfirmed) {
        doc.estado = 'PENDIENTE';
        doc.checked = false;
        this.documentos = [...this.documentos];
        this.popup.success(`Documento eliminado: ${doc.nombre} (demo)`);
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
      this.popup.error('El formulario FR-010 no está listo para guardarse');
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
    this.popup.success('FR-010 guardado (demo)');
  }

  // ========== Acciones revisor ==========
  adjuntarSoporteRevisor() {
    this.popup.success('Adjuntar documentos (demo)');
  }

  retornarSolicitud() {
    this.popup.confirm(
      'Usted confirma que desea retornar la solicitud para subsanación.',
      'Retornar',
      'Cancelar'
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
        this.popup.alertError('Solicitud retornada para subsanación (demo)');
      }
    });
  }

  rechazarSolicitud() {
    this.popup.confirm(
      'Usted confirma que desea <b>rechazar</b> esta solicitud. Esta acción no se puede deshacer.',
      'Rechazar',
      'Cancelar'
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
        this.popup.alertError('Solicitud rechazada (demo)');
      }
    });
  }

  enviarRevisor() {
    if (!this.allDocsChecked) {
      this.popup.alertError('Alguno de los documentos no es válido. Retorna la solicitud para subsanación. (demo)');
      return;
    }

    this.popup.confirm(
      'Usted confirma que desea avalar todos los documentos y enviar la solicitud.',
      'Enviar',
      'Cancelar'
    ).then((result) => {
      if (result.isConfirmed) {
        this.estadoSolicitud = 'AVALADA';
        this.popup.alertSuccess('Todos los documentos están avalados (demo).');
        this.router.navigate(['/solicitudes'], { queryParams: { role: this.role } });
      }
    });
  }

  // ========== Acciones Supervisor / Decanatura ==========
  darInicioComision() {
    if (!this.fechaInicioContrato) {
      this.popup.alertError('Debe ingresar la fecha de inicio del contrato.');
      return;
    }

    this.popup.confirm(
      'Usted confirma que desea dar inicio a la ejecución de la comisión.',
      'Aceptar',
      'Cancelar'
    ).then((result) => {
      if (result.isConfirmed) {
        this.popup.alertSuccess('Inicio de comisión registrado (demo).');
        this.router.navigate(['/solicitudes'], { queryParams: { role: this.role } });
      }
    });
  }

  regresar() {
    this.router.navigate(['/solicitudes'], { queryParams: { role: this.role } });
  }
}
