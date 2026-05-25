import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReporteService } from '../../../core/services/reporte.service';
import { UsuarioService } from '../../../core/services/usuario.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-reporte-evaluaciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reporte-evaluaciones.component.html',
  styleUrls: ['./reporte-evaluaciones.component.scss']
})
export class ReporteEvaluacionesComponent implements OnInit {
  reportData: any;
  evaluadores: any[] = [];
  filters = {
    evaluadorId: ''
  };
  isLoading = true;

  constructor(
    private reporteService: ReporteService,
    private usuarioService: UsuarioService
  ) {}

  ngOnInit(): void {
    this.loadEvaluadores();
    this.loadReport();
  }

  loadEvaluadores(): void {
    this.usuarioService.getEvaluadores().subscribe({
      next: (data) => this.evaluadores = data,
      error: (err) => console.error('Error cargando evaluadores:', err)
    });
  }

  loadReport(): void {
    this.isLoading = true;
    this.reporteService.getReporteEvaluaciones(this.filters).subscribe({
      next: (data) => {
        this.reportData = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando reporte de evaluaciones:', err);
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    this.loadReport();
  }

  resetFilters(): void {
    this.filters = { evaluadorId: '' };
    this.loadReport();
  }

  openFormatSelector(): void {
    Swal.fire({
      title: 'Exportar Reporte de Evaluaciones',
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
      text: `Compilando y estructurando datos de evaluaciones en formato ${formato.toUpperCase()}...`,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.reporteService.exportarReporte('evaluaciones', formato, this.filters).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_evaluaciones_${Date.now()}.${formato === 'pdf' ? 'pdf' : 'xlsx'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        Swal.fire({
          title: '¡Éxito!',
          text: `Reporte de evaluaciones en formato ${formato.toUpperCase()} descargado correctamente.`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      },
      error: (err) => {
        console.error('Error exportando reporte:', err);
        Swal.fire('Error', 'No se pudo generar la exportación del reporte de evaluaciones.', 'error');
      }
    });
  }

  getResultadoClass(resultado: string): string {
    const classes: {[key: string]: string} = {
      'APROBADO': 'status-success',
      'RECHAZADO': 'status-danger',
      'PENDIENTE': 'status-warning'
    };
    return classes[resultado] || 'status-default';
  }

  getStarArray(stars: number): number[] {
    return Array(5).fill(0).map((x, i) => i + 1);
  }
}
