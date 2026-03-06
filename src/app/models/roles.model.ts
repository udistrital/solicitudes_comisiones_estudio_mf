export type Role =
  | 'DOCENTE'
  | 'COORDINACION'
  | 'SECRETARIA_ACADEMICA'
  | 'SECRETARIA_GENERAL'
  | 'SUPERVISION';

export const ROLE_OPTIONS: { label: string; value: Role }[] = [
  { label: 'Docente', value: 'DOCENTE' },
  { label: 'Coordinación / Proyecto Curricular', value: 'COORDINACION' },
  { label: 'Secretaría Académica', value: 'SECRETARIA_ACADEMICA' },
  { label: 'Secretaría General', value: 'SECRETARIA_GENERAL' },
  { label: 'Supervisor / Decanatura', value: 'SUPERVISION' },
];