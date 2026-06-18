export interface DocenteInfo {
  nombres: string | null;
  apellidos: string | null;
  documento: string | null;
  tipoDocumento: string | null;
  facultad: string | null;
  codigoFacultad: string | null;
  proyecto: string | null;
  celular: string | null;
  telefono: string | null;
}

export interface PersonaDependencia {
  documento: string;
  nombre: string;
}
