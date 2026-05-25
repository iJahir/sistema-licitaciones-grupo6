import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReporteService } from '../../../core/services/reporte.service';
import { AreaService } from '../../../core/services/area.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-reporte-licitaciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reporte-licitaciones.component.html',
  styleUrls: ['./reporte-licitaciones.component.scss']
})
export class ReporteLicitacionesComponent implements OnInit {
  reportData: any;
  areas: any[] = [];
  filters = {
    areaId: '',
    estado: '',
    fechaInicio: '',
    fechaFin: ''
  };
  isLoading = true;

  constructor(
    private reporteService: ReporteService,
    private areaService: AreaService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAreas();
    this.loadReport();
  }

  loadAreas(): void {
    this.areaService.getAreas().subscribe(areas => this.areas = areas);
  }

  loadReport(): void {
    this.isLoading = true;
    this.reporteService.getReporteLicitaciones(this.filters).subscribe({
      next: (data) => {
        this.reportData = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando reporte:', err);
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    this.loadReport();
  }

  resetFilters(): void {
    this.filters = { areaId: '', estado: '', fechaInicio: '', fechaFin: '' };
    this.loadReport();
  }

  openFormatSelector(): void {
    Swal.fire({
      title: 'Exportar Reporte de Licitaciones',
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
      text: `Compilando y estructurando datos de licitaciones en formato ${formato.toUpperCase()}...`,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.reporteService.exportarReporte('licitaciones', formato, this.filters).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_licitaciones_${Date.now()}.${formato === 'pdf' ? 'pdf' : 'xlsx'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        Swal.fire({
          title: '¡Éxito!',
          text: `Reporte de licitaciones en formato ${formato.toUpperCase()} descargado correctamente.`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      },
      error: (err) => {
        console.error('Error exportando reporte:', err);
        Swal.fire('Error', 'No se pudo generar la exportación del reporte de licitaciones.', 'error');
      }
    });
  }

  getStatusClass(estado: string): string {
    const classes: {[key: string]: string} = {
      'BORRADOR': 'status-draft',
      'PUBLICADA': 'status-published',
      'EN_EVALUACION': 'status-eval',
      'ADJUDICADA': 'status-awarded',
      'CERRADA': 'status-closed',
      'CANCELADA': 'status-cancelled'
    };
    return classes[estado] || 'status-default';
  }

  verAnalisis(id: number): void {
    this.router.navigate(['/reportes/licitaciones/analisis', id]);
  }
}
