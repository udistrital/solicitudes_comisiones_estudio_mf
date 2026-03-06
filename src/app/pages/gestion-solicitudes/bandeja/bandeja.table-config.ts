import { Role } from '../../../models/roles.model';
import { SolicitudRow } from '../../../models/solicitud.model';
import { ColumnDef } from '../../../shared/dynamic-table/dynamic-table.types';
import { estadoSolicitudClass } from '../../../utils/estado-solicitud.util';

export type BandejaActionKey = 'EDITAR' | 'ELIMINAR' | 'ENVIAR' | 'GESTIONAR';

export const ROLE_TABLE_CONFIGS: Record<Role, { title: string; columns: ColumnDef<SolicitudRow>[] }> = {
  DOCENTE: {
    title: 'Mis solicitudes',
    columns: [
      { key: 'radicado', header: 'Radicado', cell: (r) => r.radicado },
      { key: 'estado', header: 'Estado', cell: (r) => r.estado, renderAs: 'chip', chipClass: (r) => estadoSolicitudClass(r.estado) },
      { key: 'fecha', header: 'Fecha', cell: (r) => r.fecha },
    ],
  },
  COORDINACION: {
    title: 'Solicitudes por revisar (Coordinación)',
    columns: [
      { key: 'radicado', header: 'Radicado', cell: (r) => r.radicado },
      { key: 'docente', header: 'Docente', cell: (r) => r.docente },
      { key: 'proyecto', header: 'Proyecto', cell: (r) => r.proyecto },
      { key: 'estado', header: 'Estado', cell: (r) => r.estado, renderAs: 'chip', chipClass: (r) => estadoSolicitudClass(r.estado) },
      { key: 'fecha', header: 'Fecha', cell: (r) => r.fecha },
    ],
  },
  SECRETARIA_ACADEMICA: {
    title: 'Bandeja Secretaría Académica',
    columns: [
      { key: 'radicado', header: 'Radicado', cell: (r) => r.radicado },
      { key: 'docente', header: 'Docente', cell: (r) => r.docente },
      { key: 'estado', header: 'Estado', cell: (r) => r.estado, renderAs: 'chip', chipClass: (r) => estadoSolicitudClass(r.estado) },
      { key: 'fecha', header: 'Fecha', cell: (r) => r.fecha },
    ],
  },
  SECRETARIA_GENERAL: {
    title: 'Bandeja Secretaría General',
    columns: [
      { key: 'radicado', header: 'Radicado', cell: (r) => r.radicado },
      { key: 'docente', header: 'Docente', cell: (r) => r.docente },
      { key: 'estado', header: 'Estado', cell: (r) => r.estado, renderAs: 'chip', chipClass: (r) => estadoSolicitudClass(r.estado) },
      { key: 'fecha', header: 'Fecha', cell: (r) => r.fecha },
    ],
  },
  SUPERVISION: {
    title: 'Bandeja Supervisor / Decanatura',
    columns: [
      { key: 'radicado', header: 'Radicado', cell: (r) => r.radicado },
      { key: 'docente', header: 'Docente', cell: (r) => r.docente },
      { key: 'proyecto', header: 'Proyecto', cell: (r) => r.proyecto },
      { key: 'estado', header: 'Estado', cell: (r) => r.estado, renderAs: 'chip', chipClass: (r) => estadoSolicitudClass(r.estado) },
      { key: 'fecha', header: 'Fecha', cell: (r) => r.fecha },
    ],
  },
};