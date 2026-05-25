import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReporteService } from '../../../core/services/reporte.service';

@Component({
  selector: 'app-reporte-auditoria',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reporte-auditoria.component.html',
  styleUrls: ['./reporte-auditoria.component.scss']
})
export class ReporteAuditoriaComponent implements OnInit {
  reportData: any;
  isLoading = true;
  currentPage = 0;
  pageSize = 15;
  filters = {
    modulo: '',
    username: ''
  };
  modulos = ['Licitaciones', 'Propuestas', 'Evaluaciones', 'Usuarios', 'Auditoria', 'Auth'];

  constructor(private reporteService: ReporteService) {}

  ngOnInit(): void {
    this.loadReport();
  }

  loadReport(): void {
    this.isLoading = true;
    this.reporteService.getReporteAuditoria(this.filters, this.currentPage, this.pageSize).subscribe({
      next: (data) => {
        this.reportData = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando reporte de auditoría:', err);
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    this.currentPage = 0; // Reset to first page on filter
    this.loadReport();
  }

  resetFilters(): void {
    this.filters = { modulo: '', username: '' };
    this.currentPage = 0;
    this.loadReport();
  }

  nextPage(): void {
    if (this.currentPage < this.reportData.totalPages - 1) {
      this.currentPage++;
      this.loadReport();
    }
  }

  prevPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadReport();
    }
  }

  exportToPDF(): void {
    window.print();
  }

  getModuloClass(modulo: string): string {
    const mod = modulo?.toLowerCase() || '';
    if (mod.includes('auth') || mod.includes('inicio') || mod.includes('seguridad') || mod.includes('auditoria')) return 'seguridad';
    if (mod.includes('usuario')) return 'usuarios';
    if (mod.includes('licitacion') || mod.includes('propuesta') || mod.includes('evaluacion')) return 'licitaciones';
    return 'defecto';
  }

  objectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }
}
