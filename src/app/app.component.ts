import { Component } from '@angular/core';

type Role = 'DOCENTE' | 'COORDINACION' | 'SECRETARIA_ACADEMICA' | 'SUPERVISION';

type EstadoSolicitud =
  | 'BORRADOR'
  | 'RADICADA'
  | 'EN_REVISION'
  | 'POR_SUBSANAR'
  | 'AVALADA'
  | 'RECHAZADA';

interface SolicitudRow {
  id: number;
  radicado: string;
  docente: string;
  proyecto: string;
  estado: EstadoSolicitud;
  fecha: string; 
}

interface ColumnDef<T> {
  key: string;      
  header: string;   
  cell: (row: T) => string; 
}

@Component({
  selector: 'mf1',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  // ====== Roles demo ======
  roleOptions: { label: string; value: Role }[] = [
    { label: 'Docente', value: 'DOCENTE' },
    { label: 'Coordinación / Proyecto Curricular', value: 'COORDINACION' },
    { label: 'Secretaría Académica', value: 'SECRETARIA_ACADEMICA' },
    { label: 'Supervisor / Decanatura', value: 'SUPERVISION' },
  ];

  selectedRole: Role = 'DOCENTE';

  rows: SolicitudRow[] = [
    {
      id: 101,
      radicado: 'SOL-2026-0001',
      docente: 'María Pérez',
      proyecto: 'Ingeniería de Sistemas',
      estado: 'BORRADOR',
      fecha: '2026-02-01',
    },
    {
      id: 102,
      radicado: 'SOL-2026-0002',
      docente: 'Juan Gómez',
      proyecto: 'Matemáticas',
      estado: 'RADICADA',
      fecha: '2026-02-02',
    },
    {
      id: 103,
      radicado: 'SOL-2026-0003',
      docente: 'Laura Díaz',
      proyecto: 'Ingeniería Industrial',
      estado: 'POR_SUBSANAR',
      fecha: '2026-02-03',
    },
    {
      id: 104,
      radicado: 'SOL-2026-0004',
      docente: 'Carlos Ruiz',
      proyecto: 'Electrónica',
      estado: 'EN_REVISION',
      fecha: '2026-02-04',
    },
    {
      id: 105,
      radicado: 'SOL-2026-0005',
      docente: 'Ana Torres',
      proyecto: 'Sistemas',
      estado: 'AVALADA',
      fecha: '2026-02-05',
    },
  ];

  // ====== Configuración por rol (columnas + título) ======
  private roleConfigs: Record<Role, { title: string; columns: ColumnDef<SolicitudRow>[] }> = {
    DOCENTE: {
      title: 'Mis solicitudes',
      columns: [
        { key: 'radicado', header: 'Radicado', cell: (r) => r.radicado },
        { key: 'estado', header: 'Estado', cell: (r) => r.estado },
        { key: 'fecha', header: 'Fecha', cell: (r) => r.fecha },
      ],
    },
    COORDINACION: {
      title: 'Solicitudes por revisar (Coordinación)',
      columns: [
        { key: 'radicado', header: 'Radicado', cell: (r) => r.radicado },
        { key: 'docente', header: 'Docente', cell: (r) => r.docente },
        { key: 'proyecto', header: 'Proyecto', cell: (r) => r.proyecto },
        { key: 'estado', header: 'Estado', cell: (r) => r.estado },
        { key: 'fecha', header: 'Fecha', cell: (r) => r.fecha },
      ],
    },
    SECRETARIA_ACADEMICA: {
      title: 'Bandeja Secretaría Académica',
      columns: [
        { key: 'radicado', header: 'Radicado', cell: (r) => r.radicado },
        { key: 'docente', header: 'Docente', cell: (r) => r.docente },
        { key: 'estado', header: 'Estado', cell: (r) => r.estado },
        { key: 'fecha', header: 'Fecha', cell: (r) => r.fecha },
      ],
    },
    SUPERVISION: {
      title: 'Bandeja Supervisor / Decanatura',
      columns: [
        { key: 'radicado', header: 'Radicado', cell: (r) => r.radicado },
        { key: 'docente', header: 'Docente', cell: (r) => r.docente },
        { key: 'proyecto', header: 'Proyecto', cell: (r) => r.proyecto },
        { key: 'estado', header: 'Estado', cell: (r) => r.estado },
        { key: 'fecha', header: 'Fecha', cell: (r) => r.fecha },
      ],
    },
  };

  // ====== Getters para el template ======
  get title(): string {
    return this.roleConfigs[this.selectedRole].title;
  }

  get columnDefs(): ColumnDef<SolicitudRow>[] {
    return this.roleConfigs[this.selectedRole].columns;
  }

  get displayedColumns(): string[] {
    return [...this.columnDefs.map((c) => c.key), 'acciones'];
  }

  // Acciones permitidas por rol y estado
  can(action: 'VER' | 'EDITAR' | 'ENVIAR' | 'REVISAR' | 'RETORNAR' | 'AVALAR', row: SolicitudRow): boolean {
    const role = this.selectedRole;
    const st = row.estado;

    if (action === 'VER') return true;

    if (role === 'DOCENTE') {
      if (action === 'EDITAR') return st === 'BORRADOR' || st === 'POR_SUBSANAR';
      if (action === 'ENVIAR') return st === 'BORRADOR' || st === 'POR_SUBSANAR';
      return false;
    }

    if (role === 'COORDINACION') {
      if (action === 'REVISAR') return st === 'RADICADA' || st === 'EN_REVISION';
      if (action === 'RETORNAR') return st === 'EN_REVISION';
      if (action === 'AVALAR') return st === 'EN_REVISION';
      return false;
    }

    if (role === 'SECRETARIA_ACADEMICA') {
      if (action === 'REVISAR') return st === 'AVALADA'; 
      if (action === 'RETORNAR') return st === 'AVALADA'; 
      if (action === 'AVALAR') return st === 'AVALADA';   
      return false;
    }

    if (role === 'SUPERVISION') {
      if (action === 'REVISAR') return st === 'AVALADA';
      if (action === 'AVALAR') return st === 'AVALADA';
      if (action === 'RETORNAR') return st === 'AVALADA';
      return false;
    }

    return false;
  }

  onRoleChange(role: Role) {
    this.selectedRole = role;
  }

  onAction(action: string, row: SolicitudRow) {
    console.log(`[${this.selectedRole}] Acción: ${action}`, row);
    alert(`[${this.selectedRole}] Acción: ${action}\nRadicado: ${row.radicado}\nEstado: ${row.estado}`);
  }

  estadoClass(estado: EstadoSolicitud): string {
    switch (estado) {
      case 'BORRADOR': return 'st-borrador';
      case 'RADICADA': return 'st-radicada';
      case 'EN_REVISION': return 'st-revision';
      case 'POR_SUBSANAR': return 'st-subsanar';
      case 'AVALADA': return 'st-avalada';
      case 'RECHAZADA': return 'st-rechazada';
      default: return '';
    }
  }
}
