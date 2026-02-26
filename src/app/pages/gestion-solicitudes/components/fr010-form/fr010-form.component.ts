import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-fr010-form',
  templateUrl: './fr010-form.component.html',
  styleUrls: ['./fr010-form.component.css'],
})
export class Fr010FormComponent implements OnInit {
  @Output() saved = new EventEmitter<any>();

  form!: FormGroup;

  // 13 (multi)
  tipoEstudioOptions = ['Maestría', 'Doctorado', 'PostDoctorado'];

  // 22 (multi)
  tipoApoyoOptions = [
    'Comisión de Estudios en el exterior',
    'Comisión en Colombia Fuera de Bogotá',
    'Comisión de Estudios en Bogotá',
    'Comisión en Modalidad Semipresencial',
    'Apoyo Económico Representado en Descarga Académica y Pago de Matrícula',
    'Apoyo Económico Representado en Descarga Académica',
  ];

  // Info del docente quemada (1–12): Simula lo que vendrá de terceros.
  private terceroSolicitante = {
    q1_fecha: '2026-02-16',
    q2_facultad: 'Facultad Tecnológica',
    q3_nombres_apellidos: 'María Pérez',
    q4_documento_identificacion: 'CC 1032490151',
    q5_edad: '32',
    q6_correo: 'maria.perez@udistrital.edu.co',
    q7_proyecto: 'Ingeniería de Sistemas',
    q8_telefono: '6010000000',
    q9_celular: '3000000000',
    q10_fecha_ingreso_universidad: '2019-02-15',
    q10_resolucion_rh: '1234-2019',
    q11_categoria_ingreso: 'Asistente',
    q12_categoria_actual: 'Asociado',
  };

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      // =======================
      // IDENTIFICACIÓN SOLICITANTE (1-12) - SOLO LECTURA
      // =======================
      solicitante: this.fb.group({
        q1_fecha: [{ value: this.terceroSolicitante.q1_fecha, disabled: true }],
        q2_facultad: [{ value: this.terceroSolicitante.q2_facultad, disabled: true }],
        q3_nombres_apellidos: [{ value: this.terceroSolicitante.q3_nombres_apellidos, disabled: true }],
        q4_documento_identificacion: [{ value: this.terceroSolicitante.q4_documento_identificacion, disabled: true }],
        q5_edad: [{ value: this.terceroSolicitante.q5_edad, disabled: true }],
        q6_correo: [{ value: this.terceroSolicitante.q6_correo, disabled: true }],
        q7_proyecto: [{ value: this.terceroSolicitante.q7_proyecto, disabled: true }],
        q8_telefono: [{ value: this.terceroSolicitante.q8_telefono, disabled: true }],
        q9_celular: [{ value: this.terceroSolicitante.q9_celular, disabled: true }],
        q10_fecha_ingreso_universidad: [{ value: this.terceroSolicitante.q10_fecha_ingreso_universidad, disabled: true }],
        q10_resolucion_rh: [{ value: this.terceroSolicitante.q10_resolucion_rh, disabled: true }],
        q11_categoria_ingreso: [{ value: this.terceroSolicitante.q11_categoria_ingreso, disabled: true }],
        q12_categoria_actual: [{ value: this.terceroSolicitante.q12_categoria_actual, disabled: true }],
      }),

      // =======================
      // IDENTIFICACIÓN DE LA SOLICITUD (13-26)
      // =======================
      solicitud: this.fb.group({
        q13_tipo_estudio: [[]], // multi
        q14_nombre_programa: [''],
        q15_titulo_aspira: [''],
        q16_universidad: [''],
        q17_pais: [''],
        q18_ciudad: [''],
        q19_fecha_aceptacion: [''],
        q20_num_semestres: [''],
        // (No existe la 21 en el formato)
        q22_tipo_apoyo_requerido: [[]], // multi
        q23_fecha_inicio_estudios: [''],
        q24_fecha_culminacion_estudios: [''],
        q25_tiempo_requerido_culminacion: [''],
        q26_costo_total_requerido: [''],
      }),

      // =======================
      // FINANCIACIÓN Y COSTOS REQUERIDOS
      // Comisiones Bogotá/Colombia fuera/Modalidad semipresencial (27-32)
      // =======================
      financiacion_colombia: this.fb.group({
        q27_pago_matricula_valor: [''],
        q28_pago_matricula_total: [''],
        q29_tiquetes: [''],
        q30_descarga_academica_horas: [''],
        q31_descarga_academica_valor_total: [''],
        q32_costo_reemplazo_docente: [''],
      }),

      // =======================
      // Comisiones en el Exterior (33-39)
      // =======================
      financiacion_exterior: this.fb.group({
        q33_valor_salario_tiempo_comision: [''],
        q34_pago_matricula_valor: [''],
        q35_pago_total_matricula: [''],
        q36_tiquetes: [''],
        q37_seguro_medico: [''],
        q38_gastos_instalacion: [''],
        q39_costo_reemplazo_docente: [''],
      }),

      // =======================
      // Diligenciar cuando se gana una beca (40-43)
      // =======================
      beca: this.fb.group({
        q40_cubrimiento_beca: [''],
        q41_institucion_otorga: [''],
        q42_tipo_financiacion_monto: [''],
        q43_duracion_beca: [''],
      }),

      // Observaciones (campo adicional del formato)
      observaciones: [''],
    });
  }

  // Se llama desde el padre (detalle)
  public save(): void {
    // getRawValue incluye los disabled (importante para 1–12)
    const raw = this.form.getRawValue();

    const payload = {
      meta: {
        codigo: 'GD-PR-013-FR-010',
        version: '02',
      },
      fr010: raw,
    };

    console.log('[FR-010 JSON]', payload);
    this.saved.emit(payload);
  }
}