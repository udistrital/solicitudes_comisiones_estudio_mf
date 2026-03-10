import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { ColumnDef, TableAction } from './dynamic-table.types';

@Component({
  selector: 'app-dynamic-table',
  templateUrl: './dynamic-table.component.html',
  styleUrls: ['./dynamic-table.component.scss'],
})
export class DynamicTableComponent<T extends Record<string, any>> implements OnChanges {
  @Input() rows: T[] = [];
  @Input() columns: ColumnDef<T>[] = [];
  @Input() actions: TableAction<T>[] = [];

  // Activar filtros por columna
  @Input() enableColumnFilters = false;

  @Output() actionClick = new EventEmitter<{ action: string; row: T }>();

  // filtros por columna (key -> texto)
  filters: Record<string, string> = {};

  ngOnChanges(changes: SimpleChanges): void {
    // Si cambian columnas, limpia filtros que ya no existen
    if (changes['columns']) {
      const keys = new Set(this.columns.map(c => c.key));
      Object.keys(this.filters).forEach(k => {
        if (!keys.has(k)) delete this.filters[k];
      });
    }
  }

  get displayedColumns(): string[] {
    return [...this.columns.map((c) => c.key), 'acciones'];
  }

  isVisible(action: TableAction<T>, row: T): boolean {
    return action.visible ? action.visible(row) : true;
  }

  emit(action: string, row: T) {
    this.actionClick.emit({ action, row });
  }

  trackByAction(_index: number, action: TableAction<T>): string {
    return action.key;
  }

  trackByCol(_index: number, col: ColumnDef<T>): string {
    return col.key;
  }

  isFilterable(col: ColumnDef<T>): boolean {
    // por defecto true; si alguien pone filterable:false lo respeta
    return col.filterable !== false;
  }

  // Filtra filas con base en TODOS los filtros activos
  get filteredRows(): T[] {
    if (!this.enableColumnFilters) return this.rows;

    const active = Object.entries(this.filters)
      .map(([k, v]) => [k, (v ?? '').trim().toLowerCase()] as const)
      .filter(([, v]) => v.length > 0);

    if (active.length === 0) return this.rows;

    // solo columnas que existan
    const colMap = new Map(this.columns.map(c => [c.key, c]));

    return this.rows.filter(row => {
      return active.every(([key, value]) => {
        const col = colMap.get(key);
        if (!col) return true;

        const cellText = (col.cell(row) ?? '').toString().toLowerCase();
        return cellText.includes(value);
      });
    });
  }

  clearFilter(key: string) {
    this.filters[key] = '';
  }
}