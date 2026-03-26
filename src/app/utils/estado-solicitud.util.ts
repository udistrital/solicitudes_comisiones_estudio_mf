import { EstadoSolicitud, EstadoDocumento } from '../models/estados.model';

/**
 * Mapea un estado de solicitud a su clase CSS para chips.
 * Estados agrupados por semántica visual:
 *   - Gris: borrador/no enviada
 *   - Azul: radicada
 *   - Amarillo: en revisión/gestión (4 instancias)
 *   - Naranja: corrección/subsanación (5 estados)
 *   - Verde: aprobada
 *   - Rojo: no aprobada
 */
export function estadoSolicitudClass(estado: EstadoSolicitud): string {
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
    default:              return '';
  }
}

/**
 * Mapea un estado de documento a su clase CSS para chips.
 *   - Gris: pendiente (no cargado)
 *   - Azul: cargado, enviado para revisión
 *   - Verde: aprobado (genérico y por instancia)
 *   - Naranja: por corregir, subsanado
 *   - Rojo: no aprobado, anulado
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
