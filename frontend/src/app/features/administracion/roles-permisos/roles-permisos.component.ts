import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RolesPermisosService } from '../../../core/services/roles-permisos.service';

@Component({
  selector: 'app-roles-permisos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './roles-permisos.component.html',
  styleUrls: ['./roles-permisos.component.scss']
})
export class RolesPermisosComponent implements OnInit {
  roles: any[] = [];
  filteredRoles: any[] = [];
  paginatedRoles: any[] = [];
  
  stats: any = {
    rolesTotales: 0,
    permisosTotales: 0,
    modulosSistema: 0,
    rolesActivos: 0,
    rolesInactivos: 0,
    breakdown: []
  };

  // State Management
  activeTab: string = 'roles'; // 'roles' | 'permisos'
  searchTerm: string = '';
  selectedEstado: string = 'Todos';
  selectedModulo: string = 'Todos';

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;

  // Modals
  showCreateModal: boolean = false;
  showEditModal: boolean = false;
  showDetailModal: boolean = false;
  showPermissionsModal: boolean = false;

  selectedRole: any = null;
  editingRole: any = null;

  // Config Constants
  availableModules: string[] = ['Licitaciones', 'Propuestas', 'Evaluaciones', 'Contratos', 'Reportes', 'Usuarios'];
  availableStates = ['Todos', 'Activo', 'Inactivo'];
  availableIcons = [
    { class: 'fa-shield-halved', label: 'Escudo' },
    { class: 'fa-cart-shopping', label: 'Carrito' },
    { class: 'fa-users-gear', label: 'Grupo Engranaje' },
    { class: 'fa-coins', label: 'Monedas' },
    { class: 'fa-square-poll-vertical', label: 'Encuesta' },
    { class: 'fa-user-check', label: 'Usuario Aprobado' },
    { class: 'fa-eye', label: 'Ojo' },
    { class: 'fa-user-slash', label: 'Usuario Bloqueado' }
  ];
  availableColors = [
    { value: 'purple', label: 'Morado' },
    { value: 'blue', label: 'Azul' },
    { value: 'orange', label: 'Naranja' },
    { value: 'green', label: 'Verde' },
    { value: 'sky', label: 'Celeste' },
    { value: 'pink', label: 'Rosado' },
    { value: 'amber', label: 'Ámbar' },
    { value: 'gray', label: 'Gris' }
  ];

  constructor(private rolesService: RolesPermisosService) {}

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.rolesService.getAll().subscribe({
      next: (data) => {
        this.roles = data;
        this.applyFilters();
      }
    });

    this.rolesService.getStats().subscribe({
      next: (data) => {
        this.stats = data;
      }
    });
  }

  applyFilters(): void {
    let result = [...this.roles];

    // Global Search term
    if (this.searchTerm && this.searchTerm.trim() !== '') {
      const term = this.searchTerm.toLowerCase().trim();
      result = result.filter(r => 
        r.displayName.toLowerCase().includes(term) ||
        r.descripcion.toLowerCase().includes(term) ||
        r.roleKey.toLowerCase().includes(term)
      );
    }

    // Filter by State
    if (this.selectedEstado !== 'Todos') {
      const isEnabled = this.selectedEstado === 'Activo';
      result = result.filter(r => r.enabled === isEnabled);
    }

    // Filter by Module Permission
    if (this.selectedModulo !== 'Todos') {
      const cleanMod = this.selectedModulo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      result = result.filter(r => {
        if (!r.permisosJson) return false;
        const level = this.getPermissionLevel(r, cleanMod);
        return level !== 'sin_acceso' && level !== 'sin_permiso';
      });
    }

    this.filteredRoles = result;
    this.totalPages = Math.ceil(this.filteredRoles.length / this.pageSize) || 1;
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    this.paginate();
  }

  paginate(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedRoles = this.filteredRoles.slice(start, end);
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.paginate();
    }
  }

  changePageSize(event: any): void {
    this.pageSize = parseInt(event.target.value, 10);
    this.currentPage = 1;
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedEstado = 'Todos';
    this.selectedModulo = 'Todos';
    this.currentPage = 1;
    this.applyFilters();
  }

  // Permission parsing utilities
  getPermissionLevel(role: any, moduleName: string): string {
    if (!role || !role.permisosJson) return 'sin_acceso';
    const cleanModule = moduleName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const pairs = role.permisosJson.split(',');
    for (const pair of pairs) {
      const parts = pair.split(':');
      if (parts.length === 2 && parts[0] === cleanModule) {
        return parts[1];
      }
    }
    return 'sin_acceso';
  }

  getPermissionIcon(level: string): string {
    switch (level) {
      case 'completo': return 'fa-circle-check text-green';
      case 'parcial': return 'fa-circle text-orange';
      case 'sin_permiso': return 'fa-circle-xmark text-red';
      default: return 'fa-circle text-gray';
    }
  }

  getPermissionTooltip(level: string): string {
    switch (level) {
      case 'completo': return 'Permiso Completo (Crear, Editar, Ver, Eliminar)';
      case 'parcial': return 'Permiso Parcial (Ver, Editar parcial)';
      case 'sin_permiso': return 'Sin Permiso (Solo lectura o denegado)';
      default: return 'Sin Acceso (Sin permisos asignados)';
    }
  }

  // Modal Actions
  openCreateModal(): void {
    this.selectedRole = {
      displayName: '',
      descripcion: '',
      enabled: true,
      icono: 'fa-shield-halved',
      color: 'purple',
      permisos: this.availableModules.map(m => ({ module: m, level: 'sin_acceso' }))
    };
    this.showCreateModal = true;
  }

  openEditModal(role: any): void {
    const listPermisos = this.availableModules.map(m => {
      const level = this.getPermissionLevel(role, m);
      return { module: m, level };
    });

    this.editingRole = {
      ...role,
      permisos: listPermisos
    };
    this.showEditModal = true;
  }

  openPermissionsModal(role: any): void {
    const listPermisos = this.availableModules.map(m => {
      const level = this.getPermissionLevel(role, m);
      return { module: m, level };
    });

    this.editingRole = {
      ...role,
      permisos: listPermisos
    };
    this.showPermissionsModal = true;
  }

  openDetailModal(role: any): void {
    const listPermisos = this.availableModules.map(m => {
      const level = this.getPermissionLevel(role, m);
      return { module: m, level };
    });

    this.selectedRole = {
      ...role,
      permisos: listPermisos
    };
    this.showDetailModal = true;
  }

  // API Mutating Actions
  saveNewRole(): void {
    if (!this.selectedRole.displayName.trim()) return;

    // Map permissions back to string
    const permString = this.selectedRole.permisos
      .map((p: any) => `${p.module.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}:${p.level}`)
      .join(',');

    const payload = {
      displayName: this.selectedRole.displayName,
      descripcion: this.selectedRole.descripcion,
      enabled: this.selectedRole.enabled,
      icono: this.selectedRole.icono,
      color: this.selectedRole.color,
      permisosJson: permString
    };

    this.rolesService.create(payload).subscribe({
      next: () => {
        this.showCreateModal = false;
        this.loadAll();
      }
    });
  }

  saveEditRole(): void {
    if (!this.editingRole.displayName.trim()) return;

    const permString = this.editingRole.permisos
      .map((p: any) => `${p.module.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}:${p.level}`)
      .join(',');

    const payload = {
      displayName: this.editingRole.displayName,
      descripcion: this.editingRole.descripcion,
      enabled: this.editingRole.enabled,
      icono: this.editingRole.icono,
      color: this.editingRole.color,
      permisosJson: permString
    };

    this.rolesService.update(this.editingRole.id, payload).subscribe({
      next: () => {
        this.showEditModal = false;
        this.showPermissionsModal = false;
        this.loadAll();
      }
    });
  }

  cloneRole(role: any): void {
    this.rolesService.cloneRole(role.id).subscribe({
      next: () => {
        this.loadAll();
      }
    });
  }

  deleteRole(role: any): void {
    if (confirm(`¿Está seguro de eliminar el rol "${role.displayName}"?`)) {
      this.rolesService.delete(role.id).subscribe({
        next: () => {
          this.loadAll();
        }
      });
    }
  }

  exportRoles(): void {
    alert('Exportando roles y permisos a Excel/PDF...');
  }
}
