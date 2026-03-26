import { EstadoSolicitud } from './estados.model';

export interface SolicitudRow {
  id: number;
  docente: string;
  idDocente: string;
  proyecto: string;
  estado: EstadoSolicitud;
  fecha: string; // YYYY-MM-DD
}
