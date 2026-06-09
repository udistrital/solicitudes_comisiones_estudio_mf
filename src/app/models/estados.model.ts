// ============================================================
// Estados de solicitud — alineados con backend
// ============================================================
export type EstadoSolicitud =
  | 'NO_ENV'           // No enviada
  | 'RAD'              // Radicada
  | 'REV_SEC_ACAD'     // En gestión de secretaria académica
  | 'REV_SEC_GRAL'     // En gestión de secretaria general
  | 'REV_DEC'          // En revisión por decanatura
  | 'CORR'             // Por corregir
  | 'NO_APROB'         // No aprobada
  | 'APROB_EJEC'       // Aprobada
  | 'SUBS_SEC_ACAD'    // Solicitud Subsanación por Secretaria Académica
  | 'SUBS_SEC_GRAL'    // Solicitud Subsanación por Secretaria General
  | 'SUBS_DEC';        // Solicitud Subsanación por Decanatura

// ============================================================
// Estados de documento — alineados con backend
// PENDIENTE es un estado frontend para documentos no cargados
// ============================================================
export type EstadoDocumento =
  | 'PENDIENTE'          // Frontend: documento aún no cargado
  | 'CARG'               // Cargado
  | 'APROB'              // Aprobado
  | 'NO_APROB'           // No aprobado
  | 'CORR'               // Por corregir
  | 'SUBS'               // Subsanado
  | 'SUBS_SEC_ACAD'      // Solicitud de subsanacion por parte de Secretaria Academica
  | 'SUBS_SEC_GRAL'      // Solicitud de subsanacion por parte de Secretaria General
  | 'SUBS_DEC'           // Solicitud de subsanacion por parte de Decanatura
  | 'ANUL'               // Anulado
  | 'ENV_REV_SEC_ACAD'   // Enviado para Revisión por Secretaria Académica
  | 'ENV_REV_SEC_GRAL'   // Enviado para Revisión por Secretaria General
  | 'ENV_REV_DEC'        // Enviado para Revisión por Decanatura
  | 'APROB_SEC_ACAD'     // Aprobado por Secretaria Académica
  | 'APROB_SEC_GRAL'     // Aprobado por Secretaria General
  | 'APROB_DEC';         // Aprobado por Decanatura
