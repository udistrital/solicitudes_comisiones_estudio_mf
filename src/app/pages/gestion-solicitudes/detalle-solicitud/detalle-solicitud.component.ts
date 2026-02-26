import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';

import { Role } from '../../../models/roles.model';
import { EstadoSolicitud } from '../../../models/estados.model';
import { PopUpManager } from '../../../managers/popup.manager';

import { ModalAccionComponent } from '../components/modal-accion/modal-accion.component';
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
  styleUrls: ['./detalle-solicitud.component.css'],
})
export class DetalleSolicitudComponent implements OnInit {
  // Referencia al componente del formulario (solo existe si DOCENTE + FR010 seleccionado)
  @ViewChild(Fr010FormComponent) fr010Comp?: Fr010FormComponent;

  // Params
  id!: number;
  role: Role = 'DOCENTE';
  mode: 'EDITAR' | 'GESTIONAR' = 'GESTIONAR';

  // Solicitud (demo)
  radicado = 'SOL-2026-0001';
  estadoSolicitud: EstadoSolicitud = 'BORRADOR';
  docenteNombre = 'María Pérez';
  proyecto = 'Ingeniería de Sistemas';

  // Docs requeridos (para el desplegable)
  requiredDocs: RequiredDocOption[] = [
    { code: 'FR010', name: 'FR-010 Formulario de solicitud inicial', kind: 'FORM' },
    { code: 'CARTA', name: 'Carta de motivación', kind: 'FILE' },
    { code: 'PLAN', name: 'Plan de trabajo', kind: 'FILE' },
    { code: 'AVAL', name: 'Aval del proyecto curricular', kind: 'FILE' },
  ];

  // Por defecto FR010
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
  observacionRevision = ''; // editable para revisores

  observacionesSubsanacion: ObservacionItem[] = [
    { fecha: '2026-02-10 10:00', autor: 'COORDINACION', texto: 'Falta anexar plan de trabajo.' },
    { fecha: '2026-02-11 08:30', autor: 'SECRETARIA_ACADEMICA', texto: 'Verificar formato del FR-010.' },
  ];

  // Aquí se guarda el JSON completo del FR-010 (demo) cuando se guarda
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

    // asegura default FR010
    this.selectedRequiredDoc = this.requiredDocs[0];
  }

  // ========== Helpers de UI ==========
  get isDocente(): boolean {
    return this.role === 'DOCENTE';
  }

  get allDocsChecked(): boolean {
    return this.documentos.every((d) => d.checked);
  }

  get observacionesOrdenDesc(): ObservacionItem[] {
    return [...this.observacionesSubsanacion].reverse();
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

  // ========== Acciones docente ==========
  guardarDocente() {
    this.popup.success('Guardado (demo)');
  }

  enviarDocente() {
    this.estadoSolicitud = 'RADICADA';
    this.popup.success('Solicitud enviada (demo)');
    this.router.navigate(['/solicitudes'], { queryParams: { role: this.role } });
  }

  // Adjuntar solo aplica a FILE (no FR010)
  adjuntarDocumento() {
    if (!this.selectedRequiredDoc) return;

    if (this.selectedRequiredDoc.kind === 'FORM') {
      // FR010 se “guarda” por el formulario, no como archivo
      this.popup.error('Para FR-010 usa "Guardar formulario". (demo)');
      return;
    }

    const doc = this.documentos.find((d) => d.nombre === this.selectedRequiredDoc.name);
    if (!doc) return;

    doc.estado = 'ADJUNTO';
    doc.autorSoporte = 'Docente';
    this.popup.success(`Documento adjuntado: ${doc.nombre} (demo)`);
  }

  eliminarDocumento(doc: DocumentoItem) {
    doc.estado = 'PENDIENTE';
    doc.checked = false;
    this.popup.success(`Documento eliminado: ${doc.nombre} (demo)`);
  }

  verDocumento(doc: DocumentoItem) {
    this.dialog.open(VisorDocumentosComponent, {
      width: '720px',
      data: { nombre: doc.nombre, estado: doc.estado, autor: doc.autorSoporte },
    });
  }

  // FR010: guardar formulario => genera JSON y marca doc como ADJUNTO (demo)
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

    // marcar FR010 como adjunto en la tabla
    const fr = this.documentos.find((d) => d.nombre.startsWith('FR-010'));
    if (fr) {
      fr.estado = 'ADJUNTO';
      fr.autorSoporte = 'Docente';
    }

    this.popup.success('FR-010 guardado (demo)');
  }

  // ========== Acciones revisor ==========
  adjuntarSoporteRevisor() {
    this.popup.success('Adjuntar documentos (demo)');
  }

  retornarSolicitud() {
    this.estadoSolicitud = 'POR_SUBSANAR';
    if (this.observacionRevision.trim()) {
      this.observacionesSubsanacion.push({
        fecha: new Date().toISOString().slice(0, 16).replace('T', ' '),
        autor: this.role,
        texto: this.observacionRevision.trim(),
      });
      this.observacionRevision = '';
    }
    this.popup.error('Solicitud retornada para subsanación (demo)');
  }

  rechazarSolicitud() {
    this.estadoSolicitud = 'RECHAZADA';
    if (this.observacionRevision.trim()) {
      this.observacionesSubsanacion.push({
        fecha: new Date().toISOString().slice(0, 16).replace('T', ' '),
        autor: this.role,
        texto: `[RECHAZO] ${this.observacionRevision.trim()}`,
      });
      this.observacionRevision = '';
    }
    this.popup.error('Solicitud rechazada (demo)');
  }

  enviarRevisor() {
    if (!this.allDocsChecked) {
      this.popup.error('Alguno de los documentos no es válido. Retorna la solicitud para subsanación. (demo)');
      return;
    }

    this.estadoSolicitud = 'AVALADA';
    this.popup.success('Todos los documentos están avalados (demo).');
    this.router.navigate(['/solicitudes'], { queryParams: { role: this.role } });
  }

  regresar() {
    this.router.navigate(['/solicitudes'], { queryParams: { role: this.role } });
  }
}