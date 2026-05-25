import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReporteService } from '../../../core/services/reporte.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-reporte-evaluadores',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reporte-evaluadores.component.html',
  styleUrls: ['./reporte-evaluadores.component.scss']
})
export class ReporteEvaluadoresComponent implements OnInit {
  reportData: any;
  isLoading = true;

  constructor(private reporteService: ReporteService) {}

  ngOnInit(): void {
    this.loadReport();
  }

  loadReport(): void {
    this.isLoading = true;
    this.reporteService.getReporteEvaluadores().subscribe({
      next: (data) => {
        this.reportData = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando reporte de evaluadores:', err);
        this.isLoading = false;
      }
    });
  }

  openFormatSelector(): void {
    Swal.fire({
      title: 'Exportar Reporte de Evaluadores',
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
      text: `Compilando y estructurando datos de evaluadores en formato ${formato.toUpperCase()}...`,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.reporteService.exportarReporte('evaluadores', formato, {}).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_evaluadores_${Date.now()}.${formato === 'pdf' ? 'pdf' : 'xlsx'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        Swal.fire({
          title: '¡Éxito!',
          text: `Reporte de evaluadores en formato ${formato.toUpperCase()} descargado correctamente.`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      },
      error: (err) => {
        console.error('Error exportando reporte:', err);
        Swal.fire('Error', 'No se pudo generar la exportación del reporte de evaluadores.', 'error');
      }
    });
  }

  getPerformanceColor(avgScore: number): string {
    if (avgScore >= 40) return '#10b981'; // Emerald (Expert)
    if (avgScore >= 30) return '#3b82f6'; // Blue (Efficient)
    return '#f59e0b'; // Amber (Progressing)
  }

  getRankClass(index: number): string {
    if (index === 0) return 'rank-top rank-gold';
    if (index === 1) return 'rank-top rank-silver';
    if (index === 2) return 'rank-top rank-bronze';
    return 'rank-standard';
  }
}
