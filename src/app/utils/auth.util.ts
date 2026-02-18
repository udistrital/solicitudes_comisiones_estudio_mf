export function getToken(): string | null {
  return localStorage.getItem('access_token');
}
