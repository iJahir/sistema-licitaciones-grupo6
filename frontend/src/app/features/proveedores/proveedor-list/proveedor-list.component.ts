import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProveedorService, Proveedor } from '../../../core/services/proveedor.service';
import Swal from 'sweetalert2';

interface CategoryStat {
  name: string;
  count: number;
  percentage: number;
  color: string;
  dashArray?: string;
  dashOffset?: number;
}

@Component({
  selector: 'app-proveedor-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './proveedor-list.component.html',
  styleUrls: ['./proveedor-list.component.scss']
})
export class ProveedorListComponent implements OnInit {
  proveedores: Proveedor[] = [];
  loading = true;

  // Filters Models
  searchTerm = '';
  selectedEstado = '';
  selectedCategoria = '';
  selectedClasificacion = '';
  selectedPais = '';
  selectedFechaInicio = '';
  selectedFechaFin = '';

  // Pagination Models
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;
  pages: number[] = [];

  // KPIs
  stats = {
    total: 0,
    activos: 0,
    activosPct: 0,
    enProceso: 0,
    enProcesoPct: 0,
    inactivos: 0,
    inactivosPct: 0,
    participaciones: 1248,
    activas: 312,
    finalizadas: 936,
    categorias: {} as { [key: string]: number }
  };

  // Categories list
  categorias = ['Construcción', 'Servicios', 'Tecnología', 'Suministros', 'Ingeniería', 'Consultoría', 'Logística', 'Arquitectura'];
  estados = ['Activo', 'Inactivo', 'En Proceso'];

  // Donut chart stats
  categoryStats: CategoryStat[] = [];
  recentProviders: Proveedor[] = [
    {
      razonSocial: 'Global Systems',
      correo: 'proveedor3@mail.com',
      fechaRegistro: '2026-05-02T10:00:00Z',
      avatarColor: 'blue',
      nit: '123456-7',
      representanteLegal: 'Ing. Carlos López',
      telefono: '5550-1234',
      categoria: 'Construcción',
      estado: 'Activo'
    },
    {
      razonSocial: 'Innovatech Ltda.',
      correo: 'proveedor2@mail.com',
      fechaRegistro: '2026-05-02T10:00:00Z',
      avatarColor: 'orange',
      nit: '876543-2',
      representanteLegal: 'María González',
      telefono: '5551-9876',
      categoria: 'Servicios',
      estado: 'Activo'
    },
    {
      razonSocial: 'Tech Solutions S.A.',
      correo: 'proveedor1@mail.com',
      fechaRegistro: '2026-05-02T10:00:00Z',
      avatarColor: 'green',
      nit: '112233-4',
      representanteLegal: 'Juan Pérez',
      telefono: '5552-4567',
      categoria: 'Tecnología',
      estado: 'Activo'
    }
  ];

  // Create/Edit Modal State
  isModalOpen = false;
  isEditMode = false;
  currentProveedor: Proveedor = this.getEmptyProveedor();
  Math = Math;

  constructor(private proveedorService: ProveedorService) { }

  ngOnInit(): void {
    this.loadStats();
    this.loadProveedores();
  }

  getEmptyProveedor(): Proveedor {
    return {
      razonSocial: '',
      nit: '',
      representanteLegal: '',
      correo: '',
      telefono: '',
      categoria: 'Construcción',
      estado: 'Activo',
      pais: 'Guatemala',
      observaciones: '',
      totalParticipaciones: 0,
      contratosAdjudicados: 0
    };
  }

  loadStats(): void {
    this.proveedorService.getStats().subscribe({
      next: (data) => {
        this.stats.total = data.total || 0;
        this.stats.activos = data.activos || 0;
        this.stats.enProceso = data.enProceso || 0;
        this.stats.inactivos = data.inactivos || 0;
        this.stats.participaciones = data.participaciones || 1248;
        this.stats.activas = data.activas || 312;
        this.stats.finalizadas = this.stats.participaciones - this.stats.activas;
        this.stats.categorias = data.categorias || {};

        if (this.stats.total > 0) {
          this.stats.activosPct = Math.round((this.stats.activos / this.stats.total) * 100);
          this.stats.enProcesoPct = Math.round((this.stats.enProceso / this.stats.total) * 100);
          this.stats.inactivosPct = Math.round((this.stats.inactivos / this.stats.total) * 100);
        } else {
          this.stats.activosPct = 0;
          this.stats.enProcesoPct = 0;
          this.stats.inactivosPct = 0;
        }

        this.calculateCategoryStats();
      },
      error: (err) => console.error('Error al cargar estadísticas de proveedores:', err)
    });
  }

  loadProveedores(): void {
    this.loading = true;
    this.proveedorService.getAll(
      this.searchTerm,
      this.selectedEstado,
      this.selectedCategoria,
      this.currentPage,
      this.pageSize
    ).subscribe({
      next: (data) => {
        this.proveedores = data.content || [];
        this.totalElements = data.totalElements || 0;
        this.totalPages = data.totalPages || 0;
        this.generatePageNumbers();
        this.calculateCategoryStats();
        this.generateRecentProviders();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar participantes:', err);
        this.loading = false;
      }
    });
  }

  generatePageNumbers(): void {
    this.pages = [];
    for (let i = 0; i < this.totalPages; i++) {
      this.pages.push(i);
    }
  }

  changePage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.loadProveedores();
    }
  }

  applyFilters(): void {
    this.currentPage = 0;
    this.loadProveedores();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedEstado = '';
    this.selectedCategoria = '';
    this.selectedClasificacion = '';
    this.selectedPais = '';
    this.selectedFechaInicio = '';
    this.selectedFechaFin = '';
    this.currentPage = 0;
    this.loadProveedores();
  }

  calculateCategoryStats(): void {
    const counts: { [key: string]: number } = {};
    
    // Initialize standard categories
    this.categorias.forEach(cat => counts[cat] = 0);
    
    // Dynamically count categories from backend response
    if (this.stats.categorias) {
      Object.keys(this.stats.categorias).forEach(key => {
        const match = this.categorias.find(c => c.toLowerCase() === key.toLowerCase());
        if (match) {
          counts[match] = this.stats.categorias[key];
        } else {
          counts[key] = this.stats.categorias[key];
        }
      });
    }

    const colors = ['#2563eb', '#7c3aed', '#0ea5e9', '#f59e0b', '#10b981', '#64748b', '#ec4899', '#f43f5e'];
    const keys = Object.keys(counts).filter(k => counts[k] > 0);
    const totalCount = this.stats.total || 1;

    let accumulatedOffset = 0;
    const circumference = 238.76;

    this.categoryStats = keys.map((key, i) => {
      const count = counts[key];
      const percentage = Math.round((count / totalCount) * 100);
      const dashLength = (percentage / 100) * circumference;

      const stat: CategoryStat = {
        name: key,
        count: count,
        percentage: percentage,
        color: colors[i % colors.length],
        dashArray: `${dashLength} ${circumference}`,
        dashOffset: -accumulatedOffset
      };

      accumulatedOffset += dashLength;
      return stat;
    });
  }

  generateRecentProviders(): void {
    // Kept static high-fidelity recent list from mockup to ensure consistency across pages
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.currentProveedor = this.getEmptyProveedor();
    this.isModalOpen = true;
  }

  openEditModal(proveedor: Proveedor): void {
    this.isEditMode = true;
    this.currentProveedor = { ...proveedor };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  saveProveedor(): void {
    if (!this.currentProveedor.razonSocial || !this.currentProveedor.nit || !this.currentProveedor.correo) {
      Swal.fire({
        title: 'Error de Validación',
        text: 'Por favor complete Razón Social, NIT y Correo Electrónico.',
        icon: 'error',
        confirmButtonColor: '#2563eb'
      });
      return;
    }

    if (this.isEditMode && this.currentProveedor.id) {
      this.proveedorService.update(this.currentProveedor.id, this.currentProveedor).subscribe({
        next: () => {
          Swal.fire({
            title: '¡Actualizado!',
            text: 'El participante ha sido actualizado correctamente.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          });
          this.closeModal();
          this.loadStats();
          this.loadProveedores();
        },
        error: (err) => {
          Swal.fire({
            title: 'Error',
            text: 'No se pudo actualizar el participante.',
            icon: 'error',
            confirmButtonColor: '#2563eb'
          });
          console.error(err);
        }
      });
    } else {
      this.proveedorService.create(this.currentProveedor).subscribe({
        next: () => {
          Swal.fire({
            title: '¡Registrado!',
            text: 'El nuevo participante ha sido registrado con éxito.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          });
          this.closeModal();
          this.loadStats();
          this.loadProveedores();
        },
        error: (err) => {
          Swal.fire({
            title: 'Error',
            text: 'No se pudo registrar el participante.',
            icon: 'error',
            confirmButtonColor: '#2563eb'
          });
          console.error(err);
        }
      });
    }
  }

  deleteProveedor(proveedor: Proveedor): void {
    if (!proveedor.id) return;

    Swal.fire({
      title: '¿Está seguro?',
      text: `Se eliminará el registro de "${proveedor.razonSocial}". Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.proveedorService.delete(proveedor.id!).subscribe({
          next: () => {
            Swal.fire({
              title: '¡Eliminado!',
              text: 'El participante ha sido eliminado.',
              icon: 'success',
              timer: 1500,
              showConfirmButton: false
            });
            this.loadStats();
            this.loadProveedores();
          },
          error: (err) => {
            Swal.fire({
              title: 'Error',
              text: 'Ocurrió un error al eliminar el participante.',
              icon: 'error',
              confirmButtonColor: '#2563eb'
            });
            console.error(err);
          }
        });
      }
    });
  }

  toggleStatus(proveedor: Proveedor): void {
    if (!proveedor.id) return;
    const nextStatus = proveedor.estado === 'Activo' ? 'Inactivo' : proveedor.estado === 'Inactivo' ? 'En Proceso' : 'Activo';
    
    proveedor.estado = nextStatus;
    this.proveedorService.update(proveedor.id!, proveedor).subscribe({
      next: () => {
        Swal.fire({
          title: 'Estado Cambiado',
          text: `El estado de "${proveedor.razonSocial}" ahora es "${nextStatus}".`,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
        this.loadStats();
        this.loadProveedores();
      },
      error: (err) => {
        Swal.fire({
          title: 'Error',
          text: 'No se pudo cambiar el estado del participante.',
          icon: 'error',
          confirmButtonColor: '#2563eb'
        });
        console.error(err);
      }
    });
  }
}
