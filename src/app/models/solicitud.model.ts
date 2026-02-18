import { EstadoSolicitud } from './estados.model';

export interface SolicitudRow {
  id: number;
  radicado: string;
  docente: string;
  proyecto: string;
  estado: EstadoSolicitud;
  fecha: string; // YYYY-MM-DD
}
