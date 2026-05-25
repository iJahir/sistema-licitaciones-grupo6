import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReporteService } from '../../../core/services/reporte.service';
import { AreaService } from '../../../core/services/area.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-reporte-adjudicaciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reporte-adjudicaciones.component.html',
  styleUrls: ['./reporte-adjudicaciones.component.scss']
})
export class ReporteAdjudicacionesComponent implements OnInit {
  reportData: any;
  areas: any[] = [];
  filters = {
    areaId: '',
    fechaInicio: '',
    fechaFin: ''
  };
  isLoading = true;

  constructor(
    private reporteService: ReporteService,
    private areaService: AreaService
  ) {}

  ngOnInit(): void {
    this.loadAreas();
    this.loadReport();
  }

  loadAreas(): void {
    this.areaService.getAreas().subscribe({
      next: (areas) => this.areas = areas,
      error: (err) => console.error('Error cargando áreas:', err)
    });
  }

  loadReport(): void {
    this.isLoading = true;
    this.reporteService.getReporteAdjudicaciones(this.filters).subscribe({
      next: (data) => {
        this.reportData = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando reporte de adjudicaciones:', err);
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    this.loadReport();
  }

  resetFilters(): void {
    this.filters = { areaId: '', fechaInicio: '', fechaFin: '' };
    this.loadReport();
  }

  openFormatSelector(): void {
    Swal.fire({
      title: 'Exportar Reporte de Adjudicaciones',
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
      text: `Compilando y estructurando datos de adjudicaciones en formato ${formato.toUpperCase()}...`,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.reporteService.exportarReporte('adjudicaciones', formato, this.filters).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_adjudicaciones_${Date.now()}.${formato === 'pdf' ? 'pdf' : 'xlsx'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        Swal.fire({
          title: '¡Éxito!',
          text: `Reporte de adjudicaciones en formato ${formato.toUpperCase()} descargado correctamente.`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      },
      error: (err) => {
        console.error('Error exportando reporte:', err);
        Swal.fire('Error', 'No se pudo generar la exportación del reporte de adjudicaciones.', 'error');
      }
    });
  }
}
