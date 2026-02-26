export type CellRender = 'text' | 'chip';

export interface ColumnDef<T> {
  key: string;
  header: string;
  cell: (row: T) => string;
  renderAs?: CellRender;          // 'chip' para pintar mat-chip
  chipClass?: (row: T) => string; // clase CSS si renderAs === 'chip'
}

export interface TableAction<T> {
  key: string;
  label: string;
  variant?: 'stroked' | 'flat';
  visible?: (row: T) => boolean;
}

export interface ColumnDef<T> {
  key: string;
  header: string;
  cell: (row: T) => string;
  renderAs?: CellRender;
  chipClass?: (row: T) => string;

  //filtros por columna
  filterable?: boolean;          // default true
  filterPlaceholder?: string;    // default "Buscar..."
}
