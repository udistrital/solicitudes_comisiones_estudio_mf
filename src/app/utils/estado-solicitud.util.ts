import { EstadoSolicitud } from '../models/estados.model';

export function estadoSolicitudClass(estado: EstadoSolicitud): string {
  switch (estado) {
    case 'BORRADOR': return 'st-borrador';
    case 'RADICADA': return 'st-radicada';
    case 'EN_REVISION': return 'st-revision';
    case 'POR_SUBSANAR': return 'st-subsanar';
    case 'AVALADA': return 'st-avalada';
    case 'RECHAZADA': return 'st-rechazada';
    default: return '';
  }
}
