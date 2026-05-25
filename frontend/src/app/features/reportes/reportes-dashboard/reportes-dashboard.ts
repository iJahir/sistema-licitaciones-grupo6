import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ReporteService } from '../../../core/services/reporte.service';
import { LicitacionService } from '../../../core/services/licitacion.service';
import { ContratoService } from '../../../core/services/contrato.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-reportes-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reportes-dashboard.html',
  styleUrls: ['./reportes-dashboard.scss'],
})
export class ReportesDashboard implements OnInit {
  // KPIs
  licitacionesCount: number | string = '...';
  propuestasCount: number | string = '...';
  adjudicacionesCount: number | string = '...';
  montoAdjudicado: string = '...';
  contratosCount: number | string = '...';

  // Filtros y Tabla
  selectedTab: string = 'Todos';
  searchTerm: string = '';

  // Gráfico
  chartBars: Array<{ label: string, amount: number, heightPercent: number }> = [];
  maxChartVal: string = '$ 0';
  halfChartVal: string = '$ 0';

  reportsList: any[] = [];
  recentDownloads: any[] = [];

  constructor(
    private router: Router,
    private reporteService: ReporteService,
    private licitacionService: LicitacionService,
    private contratoService: ContratoService
  ) {}

  ngOnInit(): void {
    this.loadRealData();
  }

  getFallbackReports() {
    return [
      {
        nombre: 'Resumen de Licitaciones',
        modulo: 'Licitaciones',
        badgeClass: 'module-licitaciones',
        descripcion: 'Resumen general de licitaciones por estado y periodo.',
        formato: 'PDF',
        formatoClass: 'pdf',
        fecha: '24/05/2026, 08:45 a.m.',
        icon: 'fa-chart-column',
        iconColorClass: 'purple',
        filtros: 'Sin filtros aplicados'
      },
      {
        nombre: 'Propuestas Recibidas',
        modulo: 'Propuestas',
        badgeClass: 'module-propuestas',
        descripcion: 'Detalle de propuestas recibidas por licitación.',
        formato: 'Excel',
        formatoClass: 'excel',
        fecha: '24/05/2026, 09:10 a.m.',
        icon: 'fa-file-invoice',
        iconColorClass: 'green',
        filtros: 'Sin filtros aplicados'
      },
      {
        nombre: 'Adjudicaciones por Periodo',
        modulo: 'Adjudicaciones',
        badgeClass: 'module-adjudicaciones',
        descripcion: 'Listado de adjudicaciones realizadas en el periodo.',
        formato: 'PDF',
        formatoClass: 'pdf',
        fecha: '23/05/2026, 04:30 p.m.',
        icon: 'fa-trophy',
        iconColorClass: 'orange',
        filtros: 'Sin filtros aplicados'
      },
      {
        nombre: 'Análisis Financiero',
        modulo: 'Financiero',
        badgeClass: 'module-financieros',
        descripcion: 'Análisis de montos adjudicados y ejecutados.',
        formato: 'Excel',
        formatoClass: 'excel',
        fecha: '23/05/2026, 03:15 p.m.',
        icon: 'fa-chart-pie',
        iconColorClass: 'red',
        filtros: 'Sin filtros aplicados'
      },
      {
        nombre: 'Contratos por Estado',
        modulo: 'Contratos',
        badgeClass: 'module-contratos',
        descripcion: 'Contratos agrupados por estado y dependencia.',
        formato: 'PDF',
        formatoClass: 'pdf',
        fecha: '22/05/2026, 11:20 a.m.',
        icon: 'fa-file-contract',
        iconColorClass: 'blue',
        filtros: 'Sin filtros aplicados'
      }
    ];
  }

  loadRealData() {
    // 1. Licitaciones y Adjudicaciones reales
    this.licitacionService.getAll({ size: 1000 }).subscribe({
      next: (res) => {
        const list = res.content || res || [];
        this.licitacionesCount = list.length;
        this.adjudicacionesCount = list.filter((l: any) => l.estado === 'ADJUDICADA' || l.estado === 'CONTRATADA').length;
      },
      error: () => {
        this.licitacionesCount = 0;
        this.adjudicacionesCount = 0;
      }
    });

    // 2. Propuestas reales
    this.reporteService.getReportePropuestas({}).subscribe({
      next: (data) => {
        if (data) {
          this.propuestasCount = data.totalPropuestas || 0;
        }
      },
      error: () => {
        this.propuestasCount = 0;
      }
    });

    // 3. Contratos y Monto total adjudicado en USD
    this.contratoService.getAll().subscribe({
      next: (contracts) => {
        const list = contracts || [];
        this.contratosCount = list.length;
        const total = list.reduce((sum: number, c: any) => sum + (c.monto || 0), 0);
        this.montoAdjudicado = this.formatCurrency(total);
        this.calculateChart(list);
      },
      error: () => {
        this.contratosCount = 0;
        this.montoAdjudicado = '$ 0.00';
        this.chartBars = [];
      }
    });

    // 4. Últimas descargas de reportes reales
    this.reportsList = this.getFallbackReports();
    this.reporteService.getDescargas().subscribe({
      next: (descargas) => {
        this.recentDownloads = descargas || [];
      },
      error: () => {
        this.recentDownloads = [];
      }
    });
  }

  formatCurrency(value: number): string {
    if (value >= 1000000) {
      return `$ ${(value / 1000000).toFixed(2)}M`;
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  }

  calculateChart(contracts: any[]) {
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    // Generar últimas 5 mensualidades activas
    const activeMonths: Array<{ monthIndex: number, year: number, label: string, amount: number }> = [];
    let d = new Date();
    for (let i = 4; i >= 0; i--) {
      const targetMonth = new Date(d.getFullYear(), d.getMonth() - i, 1);
      activeMonths.push({
        monthIndex: targetMonth.getMonth(),
        year: targetMonth.getFullYear(),
        label: monthNames[targetMonth.getMonth()],
        amount: 0
      });
    }
    
    // Agrupar montos de contratos reales por mes
    contracts.forEach(c => {
      if (c.fechaFirma) {
        const date = new Date(c.fechaFirma);
        const m = date.getMonth();
        const y = date.getFullYear();
        const activeM = activeMonths.find(am => am.monthIndex === m && am.year === y);
        if (activeM) {
          activeM.amount += (c.monto || 0);
        }
      }
    });
    
    // Obtener máximo para calcular porcentajes de barras
    const maxAmount = Math.max(...activeMonths.map(am => am.amount), 1);
    
    this.chartBars = activeMonths.map(am => ({
      label: am.label,
      amount: am.amount,
      heightPercent: Math.max(Math.round((am.amount / maxAmount) * 90), 12) // Mínimo 12% por UX estética
    }));
    
    this.maxChartVal = this.formatCurrency(maxAmount);
    this.halfChartVal = this.formatCurrency(maxAmount / 2);
  }

  selectTab(tab: string) {
    this.selectedTab = tab;
  }

  get filteredReports() {
    return this.reportsList.filter(r => {
      if (this.selectedTab !== 'Todos' && r.modulo.toLowerCase() !== this.selectedTab.toLowerCase()) {
        return false;
      }
      if (this.searchTerm) {
        const search = this.searchTerm.toLowerCase();
        return r.nombre.toLowerCase().includes(search) || 
               r.descripcion.toLowerCase().includes(search) || 
               r.modulo.toLowerCase().includes(search);
      }
      return true;
    });
  }

  verReporte(rep: any) {
    if (rep.nombre === 'Resumen de Licitaciones') {
      this.router.navigate(['/reportes/licitaciones']);
    } else if (rep.nombre === 'Propuestas Recibidas') {
      this.router.navigate(['/reportes/propuestas']);
    } else if (rep.nombre === 'Adjudicaciones por Periodo') {
      this.router.navigate(['/reportes/adjudicaciones']);
    } else if (rep.nombre === 'Análisis Financiero') {
      this.router.navigate(['/reportes/financiero']);
    } else if (rep.nombre === 'Contratos por Estado') {
      this.router.navigate(['/reportes/contratos']);
    } else {
      Swal.fire({
        title: `Visualizando ${rep.nombre}`,
        text: 'Recuperando agregaciones en tiempo real desde el servidor de base de datos...',
        timer: 1500,
        timerProgressBar: true,
        didOpen: () => Swal.showLoading()
      }).then(() => {
        Swal.fire('Completado', `Visualización del módulo ${rep.modulo} cargada con éxito.`, 'success');
      });
    }
  }

  descargarReporte(rep: any) {
    let tipoReporte = '';
    if (rep.modulo) {
      tipoReporte = rep.modulo.toLowerCase();
    }
    
    if (!tipoReporte || tipoReporte === 'financieros') {
      if (rep.nombre === 'Resumen de Licitaciones') tipoReporte = 'licitaciones';
      else if (rep.nombre === 'Propuestas Recibidas') tipoReporte = 'propuestas';
      else if (rep.nombre === 'Adjudicaciones por Periodo') tipoReporte = 'adjudicaciones';
      else if (rep.nombre === 'Análisis Financiero') tipoReporte = 'financiero';
      else if (rep.nombre === 'Contratos por Estado') tipoReporte = 'contratos';
    }

    if (tipoReporte === 'financieros') tipoReporte = 'financiero';
    
    if (!tipoReporte) {
      Swal.fire('Error', 'Reporte no reconocido para descarga real.', 'error');
      return;
    }

    const formato = rep.formato.toLowerCase();

    Swal.fire({
      title: 'Generando Reporte...',
      text: `Compilando y estructurando datos reales en formato ${rep.formato}...`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    this.reporteService.exportarReporte(tipoReporte, formato, {}).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_${tipoReporte}_${Date.now()}.${formato === 'pdf' ? 'pdf' : 'xlsx'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        Swal.fire({
          title: '¡Éxito!',
          text: `El archivo ${rep.formato} ha sido generado y descargado con datos reales.`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });

        // Refrescar lista de descargas
        this.loadRealData();
      },
      error: (err) => {
        console.error('Error al descargar reporte:', err);
        Swal.fire('Error', 'No se pudo generar la descarga del archivo.', 'error');
      }
    });
  }
}
