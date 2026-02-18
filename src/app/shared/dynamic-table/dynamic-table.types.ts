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
