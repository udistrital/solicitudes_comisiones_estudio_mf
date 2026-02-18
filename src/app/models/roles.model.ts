export type Role = 'DOCENTE' | 'COORDINACION' | 'SECRETARIA_ACADEMICA' | 'SUPERVISION';

export const ROLE_OPTIONS: { label: string; value: Role }[] = [
  { label: 'Docente', value: 'DOCENTE' },
  { label: 'Coordinación / Proyecto Curricular', value: 'COORDINACION' },
  { label: 'Secretaría Académica', value: 'SECRETARIA_ACADEMICA' },
  { label: 'Supervisor / Decanatura', value: 'SUPERVISION' },
];
