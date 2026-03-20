export type Role =
  | 'DOCENTE'
  | 'COORDINACION'
  | 'SECRETARIA_ACADEMICA'
  | 'SECRETARIA_GENERAL'
  | 'SUPERVISION';

export const ROLE_OPTIONS: { label: string; value: Role }[] = [
  { label: 'ROLES.DOCENTE', value: 'DOCENTE' },
  { label: 'ROLES.COORDINACION', value: 'COORDINACION' },
  { label: 'ROLES.SECRETARIA_ACADEMICA', value: 'SECRETARIA_ACADEMICA' },
  { label: 'ROLES.SECRETARIA_GENERAL', value: 'SECRETARIA_GENERAL' },
  { label: 'ROLES.SUPERVISION', value: 'SUPERVISION' },
];