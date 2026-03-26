import { EstadoDocumento } from '../models/estados.model';

/**
 * Mapea un estado de solicitud a su clase CSS para chips.
 * Acepta string libre para compatibilidad con datos del backend.
 */
export function estadoSolicitudClass(estado: string): string {
  switch (estado) {
    case 'NO_ENV':        return 'st-no-env';
    case 'RAD':           return 'st-rad';
    case 'REV_PROY':
    case 'REV_SEC_ACAD':
    case 'REV_SEC_GRAL':
    case 'REV_DEC':       return 'st-revision';
    case 'CORR':          return 'st-corr';
    case 'SUBS_PROY':
    case 'SUBS_SEC_ACAD':
    case 'SUBS_SEC_GRAL':
    case 'SUBS_DEC':      return 'st-subsanar';
    case 'APROB_EJEC':    return 'st-aprob';
    case 'NO_APROB':      return 'st-no-aprob';
    default:              return 'st-no-env';
  }
}

/**
 * Mapea un estado de documento a su clase CSS para chips.
 */
export function estadoDocumentoClass(estado: EstadoDocumento): string {
  switch (estado) {
    case 'PENDIENTE':       return 'doc-chip--pendiente';
    case 'CARG':
    case 'ENV_REV_PROY':
    case 'ENV_REV_SEC_ACAD':
    case 'ENV_REV_SEC_GRAL':
    case 'ENV_REV_DEC':     return 'doc-chip--carg';
    case 'APROB':
    case 'APROB_PROY':
    case 'APROB_SEC_ACAD':
    case 'APROB_SEC_GRAL':
    case 'APROB_DEC':       return 'doc-chip--aprob';
    case 'CORR':
    case 'SUBS':            return 'doc-chip--corr';
    case 'NO_APROB':
    case 'ANUL':            return 'doc-chip--no-aprob';
    default:                return '';
  }
}

/**
 * Mapeo inverso: nombre legible del estado (como viene del backend) → código normalizado.
 * Usa lowercase para comparación tolerante a tildes/capitalización.
 */
const ESTADO_NOMBRE_TO_CODE: Record<string, string> = {
  'no enviada':                                'NO_ENV',
  'radicada':                                  'RAD',
  'en gestion de proyecto curricular':         'REV_PROY',
  'en gestión de proyecto curricular':         'REV_PROY',
  'en gestion de secretaria academica':        'REV_SEC_ACAD',
  'en gestión de secretaria academica':        'REV_SEC_ACAD',
  'en gestión de secretaría académica':        'REV_SEC_ACAD',
  'en gestion de secretaria general':          'REV_SEC_GRAL',
  'en gestión de secretaria general':          'REV_SEC_GRAL',
  'en gestión de secretaría general':          'REV_SEC_GRAL',
  'en revision por decanatura':                'REV_DEC',
  'en revisión por decanatura':                'REV_DEC',
  'en gestion de decanatura':                  'REV_DEC',
  'en gestión de decanatura':                  'REV_DEC',
  'por corregir':                              'CORR',
  'no aprobada':                               'NO_APROB',
  'aprobada':                                  'APROB_EJEC',
  'aprobada en ejecucion':                     'APROB_EJEC',
  'aprobada en ejecución':                     'APROB_EJEC',
  'subsanacion por proyecto curricular':       'SUBS_PROY',
  'subsanación por proyecto curricular':       'SUBS_PROY',
  'subsanacion por secretaria academica':      'SUBS_SEC_ACAD',
  'subsanación por secretaria academica':      'SUBS_SEC_ACAD',
  'subsanacion por secretaria general':        'SUBS_SEC_GRAL',
  'subsanación por secretaria general':        'SUBS_SEC_GRAL',
  'subsanacion por decanatura':                'SUBS_DEC',
  'subsanación por decanatura':                'SUBS_DEC',
};

/**
 * Convierte el nombre legible de un estado (del backend) al código normalizado del frontend.
 * Si no puede mapear, retorna 'NO_ENV' como fallback.
 */
export function mapEstadoNombreACodigo(nombre: string | null | undefined): string {
  if (!nombre) return 'NO_ENV';
  return ESTADO_NOMBRE_TO_CODE[nombre.toLowerCase().trim()] || 'NO_ENV';
}
