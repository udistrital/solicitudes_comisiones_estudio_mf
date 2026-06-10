export interface SolicitudRow {
  id: number;
  comisionId?: number | null;
  docente: string;
  idDocente: string;
  proyecto: string;
  estado: string;   // código normalizado (ej: 'NO_ENV', 'RAD', 'REV_PROY')
  fecha: string;     // YYYY-MM-DD
  tipoSolicitudCodigo?: string;
  tipoSolicitudNombre?: string;
}
