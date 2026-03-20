export function getToken(): string | null {
  return localStorage.getItem('access_token');
}

export function getDocumento(): string | null {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const parsed = JSON.parse(atob(raw));
    return parsed?.userService?.documento ?? parsed?.user?.documento ?? null;
  } catch {
    return null;
  }
}

export function getCorreoSesion(): string | null {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const parsed = JSON.parse(atob(raw));
    return parsed?.user?.email ?? null;
  } catch {
    return null;
  }
}
