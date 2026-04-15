export type Role =
  | 'DOCENTE'
  | 'COORDINADOR'
  | 'ADMINISTRADOR'
  | 'ADMIN_SGA'
  | 'DECANO';

/** Roles válidos del sistema de comisiones, en orden de prioridad ascendente */
export const VALID_ROLES: Role[] = [
  'DOCENTE',
  'COORDINADOR',
  'ADMINISTRADOR',
  'ADMIN_SGA',
  'DECANO',
];

const ROLE_PRIORITY: Record<Role, number> = {
  DOCENTE: 1,
  COORDINADOR: 2,
  ADMINISTRADOR: 3,
  ADMIN_SGA: 4,
  DECANO: 5,
};

/**
 * Dado un array de roles del usuario (desde sesión), retorna el rol
 * de mayor prioridad que sea válido para este módulo.
 * Retorna null si ninguno es válido.
 */
export function resolverRolEfectivo(roles: string[]): Role | null {
  const valid = roles.filter((r): r is Role => VALID_ROLES.includes(r as Role));
  if (valid.length === 0) return null;
  valid.sort((a, b) => ROLE_PRIORITY[b] - ROLE_PRIORITY[a]);
  return valid[0];
}
