import { Role } from '../../../models/roles.model';
import { SolicitudRow } from '../../../models/solicitud.model';
import { ColumnDef } from '../../../shared/dynamic-table/dynamic-table.types';
import { estadoSolicitudClass } from '../../../utils/estado-solicitud.util';

export type BandejaActionKey = 'EDITAR' | 'ELIMINAR' | 'VER' | 'GESTIONAR';

// Columnas comunes reutilizables
const COL_ID: ColumnDef<SolicitudRow> = {
  key: 'id', header: 'TABLE.ID_SOLICITUD', cell: (r) => String(r.id),
};
const COL_FECHA: ColumnDef<SolicitudRow> = {
  key: 'fecha', header: 'TABLE.FECHA_SOLICITUD', cell: (r) => r.fecha,
};
const COL_ESTADO: ColumnDef<SolicitudRow> = {
  key: 'estado', header: 'TABLE.ESTADO_SOLICITUD',
  cell: (r) => `ESTADOS.${r.estado}`,
  renderAs: 'chip',
  chipClass: (r) => estadoSolicitudClass(r.estado),
};
const COL_DOCENTE: ColumnDef<SolicitudRow> = {
  key: 'docente', header: 'TABLE.NOMBRE_DOCENTE', cell: (r) => r.docente,
};
const COL_ID_DOCENTE: ColumnDef<SolicitudRow> = {
  key: 'idDocente', header: 'TABLE.ID_DOCENTE', cell: (r) => r.idDocente,
};
const COL_TIPO_SOLICITUD: ColumnDef<SolicitudRow> = {
  key: 'tipoSolicitudNombre',
  header: 'TABLE.TIPO_SOLICITUD',
  cell: (r) => r.tipoSolicitudNombre || '',
};
// Columnas para roles no-docente (todos comparten la misma estructura)
const COLUMNS_REVIEWER: ColumnDef<SolicitudRow>[] = [
  COL_ID, COL_FECHA,COL_TIPO_SOLICITUD, COL_DOCENTE, COL_ID_DOCENTE, COL_ESTADO,
];

export const ROLE_TABLE_CONFIGS: Record<Role, { title: string; columns: ColumnDef<SolicitudRow>[] }> = {
  DOCENTE: {
    title: 'BANDEJA.TITLE_DOCENTE',
    columns: [COL_ID, COL_FECHA, COL_TIPO_SOLICITUD, COL_ESTADO],
  },
  COORDINADOR: {
    title: 'BANDEJA.TITLE_COORDINADOR',
    columns: COLUMNS_REVIEWER,
  },
  SECRETARIA_ACADEMICA: {
    title: 'BANDEJA.TITLE_SECRETARIA_ACADEMICA',
    columns: COLUMNS_REVIEWER,
  },
  SECRETARIA_GENERAL: {
    title: 'BANDEJA.TITLE_SECRETARIA_GENERAL',
    columns: COLUMNS_REVIEWER,
  },
  DECANO: {
    title: 'BANDEJA.TITLE_DECANO',
    columns: COLUMNS_REVIEWER,
  },
};
