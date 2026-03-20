import { Role } from '../../../models/roles.model';
import { SolicitudRow } from '../../../models/solicitud.model';
import { ColumnDef } from '../../../shared/dynamic-table/dynamic-table.types';
import { estadoSolicitudClass } from '../../../utils/estado-solicitud.util';

export type BandejaActionKey = 'EDITAR' | 'ELIMINAR' | 'ENVIAR' | 'VER' | 'GESTIONAR';

export const ROLE_TABLE_CONFIGS: Record<Role, { title: string; columns: ColumnDef<SolicitudRow>[] }> = {
  DOCENTE: {
    title: 'BANDEJA.TITLE_DOCENTE',
    columns: [
      { key: 'radicado', header: 'TABLE.RADICADO', cell: (r) => r.radicado },
      { key: 'estado', header: 'TABLE.ESTADO', cell: (r) => `ESTADOS.${r.estado}`, renderAs: 'chip', chipClass: (r) => estadoSolicitudClass(r.estado) },
      { key: 'fecha', header: 'TABLE.FECHA', cell: (r) => r.fecha },
    ],
  },
  COORDINACION: {
    title: 'BANDEJA.TITLE_COORDINACION',
    columns: [
      { key: 'radicado', header: 'TABLE.RADICADO', cell: (r) => r.radicado },
      { key: 'docente', header: 'TABLE.DOCENTE', cell: (r) => r.docente },
      { key: 'proyecto', header: 'TABLE.PROYECTO', cell: (r) => r.proyecto },
      { key: 'estado', header: 'TABLE.ESTADO', cell: (r) => `ESTADOS.${r.estado}`, renderAs: 'chip', chipClass: (r) => estadoSolicitudClass(r.estado) },
      { key: 'fecha', header: 'TABLE.FECHA', cell: (r) => r.fecha },
    ],
  },
  SECRETARIA_ACADEMICA: {
    title: 'BANDEJA.TITLE_SECRETARIA_ACADEMICA',
    columns: [
      { key: 'radicado', header: 'TABLE.RADICADO', cell: (r) => r.radicado },
      { key: 'docente', header: 'TABLE.DOCENTE', cell: (r) => r.docente },
      { key: 'estado', header: 'TABLE.ESTADO', cell: (r) => `ESTADOS.${r.estado}`, renderAs: 'chip', chipClass: (r) => estadoSolicitudClass(r.estado) },
      { key: 'fecha', header: 'TABLE.FECHA', cell: (r) => r.fecha },
    ],
  },
  SECRETARIA_GENERAL: {
    title: 'BANDEJA.TITLE_SECRETARIA_GENERAL',
    columns: [
      { key: 'radicado', header: 'TABLE.RADICADO', cell: (r) => r.radicado },
      { key: 'docente', header: 'TABLE.DOCENTE', cell: (r) => r.docente },
      { key: 'estado', header: 'TABLE.ESTADO', cell: (r) => `ESTADOS.${r.estado}`, renderAs: 'chip', chipClass: (r) => estadoSolicitudClass(r.estado) },
      { key: 'fecha', header: 'TABLE.FECHA', cell: (r) => r.fecha },
    ],
  },
  SUPERVISION: {
    title: 'BANDEJA.TITLE_SUPERVISION',
    columns: [
      { key: 'radicado', header: 'TABLE.RADICADO', cell: (r) => r.radicado },
      { key: 'docente', header: 'TABLE.DOCENTE', cell: (r) => r.docente },
      { key: 'proyecto', header: 'TABLE.PROYECTO', cell: (r) => r.proyecto },
      { key: 'estado', header: 'TABLE.ESTADO', cell: (r) => `ESTADOS.${r.estado}`, renderAs: 'chip', chipClass: (r) => estadoSolicitudClass(r.estado) },
      { key: 'fecha', header: 'TABLE.FECHA', cell: (r) => r.fecha },
    ],
  },
};