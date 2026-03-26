export interface SolicitudRow {
  id: number;
  docente: string;
  idDocente: string;
  proyecto: string;
  estado: string;   // código normalizado (ej: 'NO_ENV', 'RAD', 'REV_PROY')
  fecha: string;     // YYYY-MM-DD
}
