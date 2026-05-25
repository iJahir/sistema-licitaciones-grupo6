import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReporteService } from '../../../core/services/reporte.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-reporte-contratos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reporte-contratos.component.html',
  styleUrls: ['./reporte-contratos.component.scss']
})
export class ReporteContratosComponent implements OnInit {
  reportData: any;
  filters = {
    estado: '',
    fechaInicio: '',
    fechaFin: ''
  };
  isLoading = true;

  constructor(private reporteService: ReporteService) {}

  ngOnInit(): void {
    this.loadReport();
  }

  loadReport(): void {
    this.isLoading = true;
    this.reporteService.getReporteContratos(this.filters).subscribe({
      next: (data) => {
        this.reportData = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando reporte de contratos:', err);
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    this.loadReport();
  }

  resetFilters(): void {
    this.filters = {
      estado: '',
      fechaInicio: '',
      fechaFin: ''
    };
    this.loadReport();
  }

  openFormatSelector(): void {
    Swal.fire({
      title: 'Exportar Reporte de Contratos',
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
      text: `Compilando y estructurando datos de contratos en formato ${formato.toUpperCase()}...`,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.reporteService.exportarReporte('contratos', formato, this.filters).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_contratos_${Date.now()}.${formato === 'pdf' ? 'pdf' : 'xlsx'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        Swal.fire({
          title: '¡Éxito!',
          text: `Reporte de contratos en formato ${formato.toUpperCase()} descargado correctamente.`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      },
      error: (err) => {
        console.error('Error exportando reporte:', err);
        Swal.fire('Error', 'No se pudo generar la exportación del reporte de contratos.', 'error');
      }
    });
  }

  selectedContractId: number | null = null;

  toggleTimeline(contractId: number): void {
    if (this.selectedContractId === contractId) {
      this.selectedContractId = null;
    } else {
      this.selectedContractId = contractId;
    }
  }
}
