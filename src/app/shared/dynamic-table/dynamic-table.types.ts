export type CellRender = 'text' | 'chip';

export interface ColumnDef<T> {
  key: string;
  header: string;
  cell: (row: T) => string;
  renderAs?: CellRender;
  chipClass?: (row: T) => string;
  filterable?: boolean;
  filterPlaceholder?: string;
}

export interface TableAction<T> {
  key: string;
  label: string;
  icon?: string;
  tooltip?: string;
  color?: 'default' | 'warn' | 'primary';
  variant?: 'stroked' | 'flat';
  visible?: (row: T) => boolean;
}
