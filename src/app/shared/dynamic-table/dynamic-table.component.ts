import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, ViewChild, AfterViewInit } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { ColumnDef, TableAction } from './dynamic-table.types';

@Component({
    selector: 'app-dynamic-table',
    templateUrl: './dynamic-table.component.html',
    styleUrls: ['./dynamic-table.component.scss'],
    standalone: false
})
export class DynamicTableComponent<T extends Record<string, any>> implements OnChanges, AfterViewInit {
  @Input() rows: T[] = [];
  @Input() columns: ColumnDef<T>[] = [];
  @Input() actions: TableAction<T>[] = [];
  @Input() enableColumnFilters = false;
  @Input() pageSize = 10;
  @Input() pageSizeOptions: number[] = [5, 10, 25, 50];

  @Output() actionClick = new EventEmitter<{ action: string; row: T }>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  dataSource = new MatTableDataSource<T>([]);

  // filtros por columna (key -> texto)
  filters: Record<string, string> = {};

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['columns']) {
      const keys = new Set(this.columns.map(c => c.key));
      Object.keys(this.filters).forEach(k => {
        if (!keys.has(k)) delete this.filters[k];
      });
    }

    if (changes['rows'] || changes['columns']) {
      this.applyFilter();
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
    return col.filterable !== false;
  }

  onFilterChange(): void {
    this.applyFilter();
  }

  clearFilter(key: string): void {
    this.filters[key] = '';
    this.applyFilter();
  }

  private applyFilter(): void {
    if (!this.enableColumnFilters) {
      this.dataSource.data = this.rows;
      return;
    }

    const active = Object.entries(this.filters)
      .map(([k, v]) => [k, (v ?? '').trim().toLowerCase()] as const)
      .filter(([, v]) => v.length > 0);

    if (active.length === 0) {
      this.dataSource.data = this.rows;
      return;
    }

    const colMap = new Map(this.columns.map(c => [c.key, c]));

    this.dataSource.data = this.rows.filter(row => {
      return active.every(([key, value]) => {
        const col = colMap.get(key);
        if (!col) return true;
        const cellText = (col.cell(row) ?? '').toString().toLowerCase();
        return cellText.includes(value);
      });
    });
  }
}
