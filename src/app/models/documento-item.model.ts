export interface DocumentoItem {
  id: number;
  nombre: string;
  estado: 'PENDIENTE' | 'ADJUNTO' | 'VALIDADO' | 'RECHAZADO';
  checked?: boolean;
  autorSoporte?: string;

  nuxeoId?: string;
  contentUrl?: string;
  fileName?: string;
  mimeType?: string;

  documentoSolicitudId?: number;
}