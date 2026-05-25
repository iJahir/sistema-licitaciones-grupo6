import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReporteService } from '../../../core/services/reporte.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-reporte-financiero',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reporte-financiero.component.html',
  styleUrls: ['./reporte-financiero.component.scss']
})
export class ReporteFinancieroComponent implements OnInit {
  reportData: any = null;
  isLoading = true;
  chartBars: Array<{ label: string, amount: number, heightPercent: number }> = [];

  constructor(private reporteService: ReporteService) {}

  ngOnInit(): void {
    this.loadReport();
  }

  loadReport(): void {
    this.isLoading = true;
    this.reporteService.getReporteFinanciero().subscribe({
      next: (data) => {
        this.reportData = data;
        this.isLoading = false;
        this.buildChart(data.gastoMensual);
      },
      error: (err) => {
        console.error('Error cargando reporte financiero:', err);
        this.isLoading = false;
      }
    });
  }

  buildChart(gastoMensual: any) {
    if (!gastoMensual) return;
    const entries = Object.entries(gastoMensual).map(([k, v]: [string, any]) => ({
      label: k,
      amount: v
    }));
    
    const max = Math.max(...entries.map(e => e.amount), 1);
    this.chartBars = entries.map(e => ({
      label: e.label,
      amount: e.amount,
      heightPercent: Math.max(Math.round((e.amount / max) * 90), 12)
    }));
  }

  openFormatSelector(): void {
    Swal.fire({
      title: 'Exportar Informe Financiero',
      text: 'Seleccione el formato en el cual desea exportar el informe actual:',
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
      text: `Compilando y estructurando datos financieros en formato ${formato.toUpperCase()}...`,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.reporteService.exportarReporte('financiero', formato, {}).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_financiero_${Date.now()}.${formato === 'pdf' ? 'pdf' : 'xlsx'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        Swal.fire({
          title: '¡Éxito!',
          text: `Informe financiero en formato ${formato.toUpperCase()} descargado correctamente.`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      },
      error: (err) => {
        console.error('Error exportando reporte financiero:', err);
        Swal.fire('Error', 'No se pudo generar la exportación del reporte financiero.', 'error');
      }
    });
  }
}
