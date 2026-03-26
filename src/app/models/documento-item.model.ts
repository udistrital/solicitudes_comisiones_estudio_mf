import { EstadoDocumento } from './estados.model';

export interface DocumentoItem {
  id: number;
  nombre: string;
  estado: EstadoDocumento;
  checked?: boolean;
  autorSoporte?: string;

  nuxeoId?: string;
  contentUrl?: string;
  fileName?: string;
  mimeType?: string;

  documentoSolicitudId?: number;
}
