import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { DocenteInfoService } from 'src/app/services/docente-info.service';
import { DocenteInfo } from 'src/app/models/docente-info.model';
import { getDocumento, getCorreoSesion } from 'src/app/utils/auth.util';
import { PopUpManager } from 'src/app/managers/popup.manager';

@Component({
  selector: 'app-fr010-form',
  templateUrl: './fr010-form.component.html',
  styleUrls: ['./fr010-form.component.scss'],
})
export class Fr010FormComponent implements OnInit {
  @Output() saved = new EventEmitter<any>();

  form!: FormGroup;

  // 13
  tipoEstudioOptions = [
    { value: 'MAESTRIA', label: 'FR010.OPT_MAESTRIA' },
    { value: 'DOCTORADO', label: 'FR010.OPT_DOCTORADO' },
    { value: 'POSTDOCTORADO', label: 'FR010.OPT_POSTDOCTORADO' },
  ];

  // 22
  tipoApoyoOptions = [
    { value: 'COMISION_EXTERIOR', label: 'FR010.OPT_COMISION_EXTERIOR' },
    { value: 'COMISION_COLOMBIA_FUERA', label: 'FR010.OPT_COMISION_COLOMBIA_FUERA' },
    { value: 'COMISION_BOGOTA', label: 'FR010.OPT_COMISION_BOGOTA' },
    { value: 'COMISION_SEMIPRESENCIAL', label: 'FR010.OPT_COMISION_SEMIPRESENCIAL' },
    { value: 'APOYO_DESCARGA_MATRICULA', label: 'FR010.OPT_APOYO_DESCARGA_MATRICULA' },
    { value: 'APOYO_DESCARGA', label: 'FR010.OPT_APOYO_DESCARGA' },
  ];

  loadingSolicitante = true;

  /** Campos que el servicio de docente planta debe proveer */
  private readonly camposEsperados: (keyof DocenteInfo)[] = [
    'nombres', 'apellidos', 'documento', 'tipoDocumento',
    'facultad', 'proyecto', 'celular', 'telefono',
  ];

  constructor(
    private fb: FormBuilder,
    private translate: TranslateService,
    private docenteInfoService: DocenteInfoService,
    private popup: PopUpManager,
  ) {}

  ngOnInit(): void {
    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    this.form = this.fb.group({
      solicitante: this.fb.group({
        q1_fecha: [{ value: todayIso, disabled: true }],
        q2_facultad: [{ value: '', disabled: true }],
        q3_nombres_apellidos: [{ value: '', disabled: true }],
        q4_documento_identificacion: [{ value: '', disabled: true }],
        q5_edad: [{ value: '', disabled: true }],
        q6_correo: [{ value: '', disabled: true }],
        q7_proyecto: [{ value: '', disabled: true }],
        q8_telefono: [{ value: '', disabled: true }],
        q9_celular: [{ value: '', disabled: true }],
        q10_fecha_ingreso_universidad: [{ value: null, disabled: true }],
        q10_resolucion_rh: [{ value: '', disabled: true }],
        q11_categoria_ingreso: [{ value: '', disabled: true }],
        q12_categoria_actual: [{ value: '', disabled: true }],
      }),

      solicitud: this.fb.group(
        {
          q13_tipo_estudio: [null, [Validators.required]],
          q14_nombre_programa: [
            '',
            [
              Validators.required,
              this.noWhitespaceValidator(),
              Validators.minLength(5),
              Validators.maxLength(120),
            ],
          ],
          q15_titulo_aspira: [
            '',
            [
              Validators.required,
              this.noWhitespaceValidator(),
              Validators.minLength(3),
              Validators.maxLength(120),
            ],
          ],
          q16_universidad: [
            '',
            [
              Validators.required,
              this.noWhitespaceValidator(),
              Validators.minLength(3),
              Validators.maxLength(120),
            ],
          ],
          q17_pais: [
            '',
            [
              Validators.required,
              this.noWhitespaceValidator(),
              this.onlyLettersValidator(),
              Validators.minLength(3),
              Validators.maxLength(60),
            ],
          ],
          q18_ciudad: [
            '',
            [
              Validators.required,
              this.noWhitespaceValidator(),
              this.onlyLettersValidator(),
              Validators.minLength(3),
              Validators.maxLength(60),
            ],
          ],
          q19_fecha_aceptacion: [null, [Validators.required, this.dateValueValidator()]],
          q20_num_semestres: ['', [Validators.required, this.integerRangeValidator(1, 4)]],
          q22_tipo_apoyo_requerido: [null, [Validators.required]],
          q23_fecha_inicio_estudios: [null, [Validators.required, this.dateValueValidator()]],
          q24_fecha_culminacion_estudios: [null, [Validators.required, this.dateValueValidator()]],
          q25_tiempo_requerido_culminacion: [
            '',
            [Validators.required, this.durationValidator()],
          ],
          q26_costo_total_requerido: [
            '',
            [Validators.required, this.moneyValidator()],
          ],
        },
        {
          validators: [this.solicitudDatesValidator()],
        }
      ),

      financiacion_colombia: this.fb.group({
        q27_pago_matricula_valor: [''],
        q28_pago_matricula_total: [''],
        q29_tiquetes: [''],
        q30_descarga_academica_horas: [''],
        q31_descarga_academica_valor_total: [''],
        q32_costo_reemplazo_docente: [''],
      }),

      financiacion_exterior: this.fb.group({
        q33_valor_salario_tiempo_comision: [''],
        q34_pago_matricula_valor: [''],
        q35_pago_total_matricula: [''],
        q36_tiquetes: [''],
        q37_seguro_medico: [''],
        q38_gastos_instalacion: [''],
        q39_costo_reemplazo_docente: [''],
      }),

      beca: this.fb.group({
        q40_cubrimiento_beca: [''],
        q41_institucion_otorga: [''],
        q42_tipo_financiacion_monto: [''],
        q43_duracion_beca: [''],
      }),

      observaciones: ['', [Validators.maxLength(500)]],
    });

    this.configureConditionalValidators();
    this.loadDocenteInfo();
  }

  // ── Carga de datos del docente ─────────────────────────────────────

  private loadDocenteInfo(): void {
    const cedula = getDocumento();
    const correo = getCorreoSesion();

    if (!cedula) {
      this.handleServiceFailure(correo);
      return;
    }

    this.docenteInfoService.consultarDocentePlanta(cedula).subscribe({
      next: (info) => {
        if (info && this.isResponseComplete(info)) {
          this.populateFromService(info, correo);
        } else {
          this.handleServiceFailure(correo);
        }
      },
      error: () => this.handleServiceFailure(correo),
    });
  }

  private isResponseComplete(info: DocenteInfo): boolean {
    return this.camposEsperados.every(
      (field) => info[field] !== null && info[field] !== '',
    );
  }

  private populateFromService(info: DocenteInfo, correoSesion: string | null): void {
    const sol = this.form.get('solicitante') as FormGroup;

    // Campos resueltos por el servicio → valor + readonly
    sol.get('q2_facultad')?.setValue(info.facultad);
    sol.get('q3_nombres_apellidos')?.setValue(
      [info.nombres, info.apellidos].filter(Boolean).join(' '),
    );
    sol.get('q4_documento_identificacion')?.setValue(
      [this.abreviarTipoDoc(info.tipoDocumento), info.documento].filter(Boolean).join(' '),
    );
    sol.get('q7_proyecto')?.setValue(info.proyecto);
    sol.get('q8_telefono')?.setValue(info.telefono);
    sol.get('q9_celular')?.setValue(info.celular);

    // Correo: viene de la sesión, no del servicio
    sol.get('q6_correo')?.setValue(correoSesion ?? '');
    if (!correoSesion) {
      sol.get('q6_correo')?.enable();
    }

    // Campos que nunca vienen del servicio → editables
    ['q5_edad', 'q10_fecha_ingreso_universidad', 'q10_resolucion_rh',
     'q11_categoria_ingreso', 'q12_categoria_actual'].forEach(
      (key) => sol.get(key)?.enable(),
    );

    this.loadingSolicitante = false;
  }

  private handleServiceFailure(correoSesion: string | null): void {
    const sol = this.form.get('solicitante') as FormGroup;

    // Habilitar todos los campos excepto q1_fecha (fecha del sistema)
    Object.keys(sol.controls).forEach((key) => {
      if (key !== 'q1_fecha') sol.get(key)?.enable();
    });

    // Pre-llenar correo de sesión si existe
    if (correoSesion) {
      sol.get('q6_correo')?.setValue(correoSesion);
    }

    this.loadingSolicitante = false;
    this.popup.error(this.translate.instant('FR010.ERROR_CARGA_DATOS'));
  }

  private abreviarTipoDoc(tipo: string | null): string {
    if (!tipo) return '';
    const mapa: Record<string, string> = {
      'CÉDULA DE CIUDADANÍA': 'CC',
      'CEDULA DE CIUDADANIA': 'CC',
      'TARJETA DE IDENTIDAD': 'TI',
      'CÉDULA DE EXTRANJERÍA': 'CE',
      'CEDULA DE EXTRANJERIA': 'CE',
      'PASAPORTE': 'PA',
    };
    return mapa[tipo.toUpperCase()] ?? tipo;
  }

  // ── Validators condicionales ───────────────────────────────────────

  private configureConditionalValidators(): void {
    this.form.get('solicitud.q22_tipo_apoyo_requerido')?.valueChanges.subscribe(() => {
      this.applyConditionalValidators();
    });

    this.form.get('beca')?.valueChanges.subscribe(() => {
      this.applyBecaValidators();
    });

    this.applyConditionalValidators();
    this.applyBecaValidators();
  }

  private applyConditionalValidators(): void {
    const tipoApoyo = this.form.get('solicitud.q22_tipo_apoyo_requerido')?.value;
    const isExterior = tipoApoyo === 'COMISION_EXTERIOR';
    const isColombia = !!tipoApoyo && !isExterior;

    const colombiaConfig: Record<string, ValidatorFn[]> = {
      'financiacion_colombia.q27_pago_matricula_valor': [this.moneyValidator()],
      'financiacion_colombia.q28_pago_matricula_total': [this.moneyValidator()],
      'financiacion_colombia.q29_tiquetes': [this.moneyValidator()],
      'financiacion_colombia.q30_descarga_academica_horas': [this.integerRangeValidator(1, 40)],
      'financiacion_colombia.q31_descarga_academica_valor_total': [this.moneyValidator()],
      'financiacion_colombia.q32_costo_reemplazo_docente': [this.moneyValidator()],
    };

    const exteriorConfig: Record<string, ValidatorFn[]> = {
      'financiacion_exterior.q33_valor_salario_tiempo_comision': [this.moneyValidator()],
      'financiacion_exterior.q34_pago_matricula_valor': [this.moneyValidator()],
      'financiacion_exterior.q35_pago_total_matricula': [this.moneyValidator()],
      'financiacion_exterior.q36_tiquetes': [this.moneyValidator()],
      'financiacion_exterior.q37_seguro_medico': [this.moneyValidator()],
      'financiacion_exterior.q38_gastos_instalacion': [this.moneyValidator()],
      'financiacion_exterior.q39_costo_reemplazo_docente': [this.moneyValidator()],
    };

    Object.entries(colombiaConfig).forEach(([path, validators]) => {
      this.setControlValidators(
        path,
        isColombia ? [Validators.required, ...validators] : validators
      );
    });

    Object.entries(exteriorConfig).forEach(([path, validators]) => {
      this.setControlValidators(
        path,
        isExterior ? [Validators.required, ...validators] : validators
      );
    });
  }

  private applyBecaValidators(): void {
    const becaGroup = this.form.get('beca') as FormGroup;
    if (!becaGroup) return;

    const hasAnyValue = Object.values(becaGroup.getRawValue()).some((value) =>
      String(value ?? '').trim().length > 0
    );

    const becaConfig: Record<string, ValidatorFn[]> = {
      'beca.q40_cubrimiento_beca': [
        this.noWhitespaceValidator(),
        Validators.minLength(3),
        Validators.maxLength(150),
      ],
      'beca.q41_institucion_otorga': [
        this.noWhitespaceValidator(),
        Validators.minLength(3),
        Validators.maxLength(120),
      ],
      'beca.q42_tipo_financiacion_monto': [
        this.noWhitespaceValidator(),
        Validators.minLength(5),
        Validators.maxLength(150),
      ],
      'beca.q43_duracion_beca': [this.durationValidator()],
    };

    Object.entries(becaConfig).forEach(([path, validators]) => {
      this.setControlValidators(
        path,
        hasAnyValue ? [Validators.required, ...validators] : validators
      );
    });
  }

  private setControlValidators(path: string, validators: ValidatorFn[]): void {
    const control = this.form.get(path);
    if (!control) return;

    control.setValidators(validators);
    control.updateValueAndValidity({ emitEvent: false });
  }

  private noWhitespaceValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = String(control.value ?? '');
      if (!value.length) return null;
      return value.trim().length === 0 ? { whitespace: true } : null;
    };
  }

  private onlyLettersValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = String(control.value ?? '').trim();
      if (!value) return null;

      return /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s'.-]+$/.test(value)
        ? null
        : { lettersOnly: true };
    };
  }

  private integerRangeValidator(min: number, max: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = String(control.value ?? '').trim();
      if (!value) return null;

      if (!/^\d+$/.test(value)) return { digitsOnly: true };

      const numericValue = Number(value);

      if (numericValue < min) return { minValue: { min, actual: numericValue } };
      if (numericValue > max) return { maxValue: { max, actual: numericValue } };

      return null;
    };
  }

  private moneyValidator(max = 999999999999): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = String(control.value ?? '').trim();
      if (!value) return null;

      if (!/^\d+$/.test(value)) return { digitsOnly: true };

      const numericValue = Number(value);

      if (numericValue <= 0) return { positiveValue: true };
      if (numericValue > max) return { maxValue: { max, actual: numericValue } };

      return null;
    };
  }

  private durationValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = String(control.value ?? '').trim();
      if (!value) return null;

      return /^\d+\s+(día|días|semana|semanas|mes|meses|año|años|day|days|week|weeks|month|months|year|years)$/i.test(value)
        ? null
        : { invalidDuration: true };
    };
  }

  private dateValueValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const parsedDate = this.parseDateValue(control.value);
      return parsedDate ? null : { invalidDate: true };
    };
  }

  private solicitudDatesValidator(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const fechaAceptacion = this.parseDateValue(group.get('q19_fecha_aceptacion')?.value);
      const fechaInicio = this.parseDateValue(group.get('q23_fecha_inicio_estudios')?.value);
      const fechaFin = this.parseDateValue(group.get('q24_fecha_culminacion_estudios')?.value);

      const errors: Record<string, boolean> = {};

      if (fechaAceptacion && fechaInicio && fechaAceptacion.getTime() > fechaInicio.getTime()) {
        errors['acceptanceAfterStart'] = true;
      }

      if (fechaInicio && fechaFin && fechaFin.getTime() < fechaInicio.getTime()) {
        errors['endBeforeStart'] = true;
      }

      return Object.keys(errors).length ? errors : null;
    };
  }

  private parseDateValue(value: any): Date | null {
    if (!value) return null;

    if (value instanceof Date && !isNaN(value.getTime())) {
      return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }

    const raw = String(value).trim();

    const matchDdMmYyyy = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (matchDdMmYyyy) {
      const day = Number(matchDdMmYyyy[1]);
      const month = Number(matchDdMmYyyy[2]);
      const year = Number(matchDdMmYyyy[3]);

      const date = new Date(year, month - 1, day);
      const isValid =
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day;

      return isValid ? date : null;
    }

    const matchIso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (matchIso) {
      const year = Number(matchIso[1]);
      const month = Number(matchIso[2]);
      const day = Number(matchIso[3]);

      const date = new Date(year, month - 1, day);
      const isValid =
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day;

      return isValid ? date : null;
    }

    const genericDate = new Date(raw);
    if (!isNaN(genericDate.getTime())) {
      return new Date(
        genericDate.getFullYear(),
        genericDate.getMonth(),
        genericDate.getDate()
      );
    }

    return null;
  }

  private formatDate(value: any): string {
    const date = this.parseDateValue(value);
    if (!date) return '';

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  }

  public onlyDigits(event: Event, path: string, maxLength = 12): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');

    if (maxLength) {
      value = value.slice(0, maxLength);
    }

    input.value = value;
    this.form.get(path)?.setValue(value);
  }

  public normalizeText(path: string): void {
    const control = this.form.get(path);
    if (!control) return;

    const normalized = String(control.value ?? '')
      .replace(/\s+/g, ' ')
      .trim();

    control.setValue(normalized, { emitEvent: false });
    control.updateValueAndValidity({ emitEvent: false });
  }

  public isInvalid(path: string): boolean {
    const control = this.form.get(path);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  public hasSolicitudGroupError(errorKey: string): boolean {
    const group = this.form.get('solicitud');
    if (!group) return false;

    const touched =
      group.get('q19_fecha_aceptacion')?.touched ||
      group.get('q23_fecha_inicio_estudios')?.touched ||
      group.get('q24_fecha_culminacion_estudios')?.touched;

    return !!group.hasError(errorKey) && !!touched;
  }

  public getError(path: string): string {
    const control = this.form.get(path);
    if (!control?.errors) return '';

    if (control.errors['required']) return this.translate.instant('VALIDATIONS.REQUIRED');
    if (control.errors['whitespace']) return this.translate.instant('VALIDATIONS.WHITESPACE');
    if (control.errors['lettersOnly']) return this.translate.instant('VALIDATIONS.LETTERS_ONLY');
    if (control.errors['invalidDate']) return this.translate.instant('VALIDATIONS.INVALID_DATE');
    if (control.errors['digitsOnly']) return this.translate.instant('VALIDATIONS.DIGITS_ONLY');
    if (control.errors['positiveValue']) return this.translate.instant('VALIDATIONS.POSITIVE_VALUE');
    if (control.errors['invalidDuration']) return this.translate.instant('VALIDATIONS.INVALID_DURATION');
    if (control.errors['minlength']) {
      return this.translate.instant('VALIDATIONS.MIN_LENGTH', { requiredLength: control.errors['minlength'].requiredLength });
    }
    if (control.errors['maxlength']) {
      return this.translate.instant('VALIDATIONS.MAX_LENGTH', { requiredLength: control.errors['maxlength'].requiredLength });
    }
    if (control.errors['minValue']) {
      return this.translate.instant('VALIDATIONS.MIN_VALUE', { min: control.errors['minValue'].min });
    }
    if (control.errors['maxValue']) {
      return this.translate.instant('VALIDATIONS.MAX_VALUE', { max: control.errors['maxValue'].max });
    }

    return this.translate.instant('VALIDATIONS.INVALID_FIELD');
  }

  public isFormularioCompleto(): boolean {
    if (this.form.invalid) return false;

    const sol = this.form.getRawValue().solicitante;
    const camposClave = [
      'q2_facultad', 'q3_nombres_apellidos', 'q4_documento_identificacion',
      'q6_correo', 'q7_proyecto',
    ];
    return camposClave.every(
      (key) => String((sol as any)[key] ?? '').trim().length > 0,
    );
  }

  public getFormData(): any {
    const raw = this.form.getRawValue();
    return {
      solicitante: {
        ...raw.solicitante,
        q10_fecha_ingreso_universidad: this.formatDate(raw.solicitante.q10_fecha_ingreso_universidad),
      },
      solicitud: {
        ...raw.solicitud,
        q13_tipo_estudio: raw.solicitud.q13_tipo_estudio || [],
        q19_fecha_aceptacion: this.formatDate(raw.solicitud.q19_fecha_aceptacion),
        q22_tipo_apoyo_requerido: raw.solicitud.q22_tipo_apoyo_requerido || [],
        q23_fecha_inicio_estudios: this.formatDate(raw.solicitud.q23_fecha_inicio_estudios),
        q24_fecha_culminacion_estudios: this.formatDate(raw.solicitud.q24_fecha_culminacion_estudios),
      },
      financiacion_colombia: raw.financiacion_colombia,
      financiacion_exterior: raw.financiacion_exterior,
      beca: raw.beca,
      observaciones: raw.observaciones,
    };
  }

  public save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = {
      meta: {
        codigo: 'GD-PR-013-FR-010',
        version: '02',
      },
      fr010: this.getFormData(),
    };

    console.log('[FR-010 JSON]', payload);
    this.saved.emit(payload);
  }
}