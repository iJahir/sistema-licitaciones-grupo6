import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReporteService } from '../../../core/services/reporte.service';
import { LicitacionService } from '../../../core/services/licitacion.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-reporte-propuestas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reporte-propuestas.component.html',
  styleUrls: ['./reporte-propuestas.component.scss']
})
export class ReportePropuestasComponent implements OnInit {
  reportData: any;
  licitaciones: any[] = [];
  filters = {
    licitacionId: '',
    estado: ''
  };
  isLoading = true;

  constructor(
    private reporteService: ReporteService,
    private licitacionService: LicitacionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadLicitaciones();
    this.loadReport();
  }

  loadLicitaciones(): void {
    // Obtenemos una lista simple de licitaciones para el filtro
    this.licitacionService.getAll({ size: 100 }).subscribe({
      next: (response) => {
        this.licitaciones = response.content || [];
      }
    });
  }

  loadReport(): void {
    this.isLoading = true;
    this.reporteService.getReportePropuestas(this.filters).subscribe({
      next: (data) => {
        this.reportData = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando reporte de propuestas:', err);
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    this.loadReport();
  }

  resetFilters(): void {
    this.filters = { licitacionId: '', estado: '' };
    this.loadReport();
  }

  openFormatSelector(): void {
    Swal.fire({
      title: 'Exportar Reporte de Propuestas',
      text: 'Seleccione el formato en el cual desea exportar la información actual:',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '<i class="fas fa-file-pdf"></i> PDF',
      cancelButtonText: '<i class="fas fa-file-excel"></i> Excel',
      confirmButtonColor: '#2563eb', // Blue
      cancelButtonColor: '#16a34a', // Green
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.exportar('pdf');
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        this.exportar('excel');
      }
    });
  }

  exportar(formato: string): void {
    Swal.fire({
      title: 'Generando Reporte...',
      text: `Compilando y estructurando datos de propuestas en formato ${formato.toUpperCase()}...`,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.reporteService.exportarReporte('propuestas', formato, this.filters).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_propuestas_${Date.now()}.${formato === 'pdf' ? 'pdf' : 'xlsx'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        Swal.fire({
          title: '¡Éxito!',
          text: `Reporte de propuestas en formato ${formato.toUpperCase()} descargado correctamente.`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      },
      error: (err) => {
        console.error('Error exportando reporte:', err);
        Swal.fire('Error', 'No se pudo generar la exportación del reporte de propuestas.', 'error');
      }
    });
  }

  getStatusClass(estado: string): string {
    const classes: {[key: string]: string} = {
      'BORRADOR': 'status-draft',
      'ENVIADA': 'status-sent',
      'EN_EVALUACION': 'status-eval',
      'ACEPTADA': 'status-accepted',
      'RECHAZADA': 'status-rejected'
    };
    return classes[estado] || 'status-default';
  }

  getScoreColor(score: number): string {
    if (!score) return 'gray';
    if (score >= 80) return '#10b981'; // Green
    if (score >= 60) return '#f59e0b'; // Orange
    return '#ef4444'; // Red
  }

  getRankClass(index: number): string {
    if (index === 0) return 'rank-premium rank-first';
    if (index === 1) return 'rank-premium rank-second';
    if (index === 2) return 'rank-premium rank-third';
    return 'rank-standard';
  }

  verAnalisis(licitacionId: number): void {
    if (!licitacionId) {
      Swal.fire('Atención', 'No hay un ID de licitación asociado a esta propuesta.', 'warning');
      return;
    }
    this.router.navigate(['/reportes/licitaciones/analisis', licitacionId]);
  }
}
