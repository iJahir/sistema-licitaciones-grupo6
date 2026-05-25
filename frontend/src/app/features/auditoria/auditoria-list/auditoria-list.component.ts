import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditoriaService } from '../../../core/services/auditoria.service';
import { Auditoria } from '../../../data/models/auditoria.model';

@Component({
  selector: 'app-auditoria-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auditoria-list.component.html',
  styleUrls: ['./auditoria-list.component.scss']
})
export class AuditoriaListComponent implements OnInit {
  auditorias: Auditoria[] = [];
  selectedAuditoria: Auditoria | null = null;
  loading = false;
  
  // Pagination
  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 0;
  math = Math;

  // Filters
  filters: any = {
    term: '',
    modulo: '',
    accion: '',
    usuario: '',
    fechaInicio: '',
    fechaFin: ''
  };

  dateFrom: string = '';
  dateTo: string = '';

  constructor(private auditoriaService: AuditoriaService) {}

  ngOnInit(): void {
    this.loadAuditorias();
  }

  loadAuditorias(): void {
    this.loading = true;
    this.auditoriaService.getAuditorias(this.filters, this.page, this.size)
      .subscribe({
        next: (response) => {
          this.auditorias = response.content;
          this.totalElements = response.totalElements;
          this.totalPages = response.totalPages;
          this.loading = false;
        },
        error: (err) => {
          console.error('Error cargando auditorías', err);
          this.loading = false;
        }
      });
  }

  onSearch(): void {
    this.page = 0;
    this.loadAuditorias();
  }

  onPageChange(newPage: number): void {
    this.page = newPage;
    this.loadAuditorias();
  }

  onDateChange(): void {
    if (this.dateFrom) {
      this.filters.fechaInicio = `${this.dateFrom}T00:00:00`;
    } else {
      this.filters.fechaInicio = '';
    }
    
    if (this.dateTo) {
      this.filters.fechaFin = `${this.dateTo}T23:59:59`;
    } else {
      this.filters.fechaFin = '';
    }
    this.onSearch();
  }

  clearFilters(): void {
    this.filters = {
      term: '',
      modulo: '',
      accion: '',
      usuario: '',
      fechaInicio: '',
      fechaFin: ''
    };
    this.dateFrom = '';
    this.dateTo = '';
    this.onSearch();
  }

  getBadgeClass(accion: string): string {
    if (accion.includes('CREAR') || accion === 'REGISTRO') return 'badge-create';
    if (accion.includes('EDITAR') || accion.includes('CAMBIO')) return 'badge-edit';
    if (accion.includes('ELIMINAR')) return 'badge-delete';
    if (accion.includes('SESION')) return 'badge-login';
    return 'badge-default';
  }

  verDetalle(aud: Auditoria): void {
    this.selectedAuditoria = aud;
  }

  exportExcel(): void {
    this.auditoriaService.exportExcel(this.filters);
  }

  exportPdf(): void {
    this.auditoriaService.exportPdf(this.filters);
  }
}
