import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ColumnDef, TableAction } from './dynamic-table.types';

@Component({
  selector: 'app-dynamic-table',
  templateUrl: './dynamic-table.component.html',
  styleUrls: ['./dynamic-table.component.css'],
})
export class DynamicTableComponent<T extends Record<string, any>> {
  @Input() rows: T[] = [];
  @Input() columns: ColumnDef<T>[] = [];
  @Input() actions: TableAction<T>[] = [];

  @Output() actionClick = new EventEmitter<{ action: string; row: T }>();

  get displayedColumns(): string[] {
    return [...this.columns.map((c) => c.key), 'acciones'];
  }

  isVisible(action: TableAction<T>, row: T): boolean {
    return action.visible ? action.visible(row) : true;
  }

  emit(action: string, row: T) {
    this.actionClick.emit({ action, row });
  }
}
