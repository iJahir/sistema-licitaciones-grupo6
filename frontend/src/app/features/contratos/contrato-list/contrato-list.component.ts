import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ContratoService } from '../../../core/services/contrato.service';
import { TokenService } from '../../../core/services/token.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-contrato-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './contrato-list.component.html',
  styleUrls: ['./contrato-list.component.scss']
})
export class ContratoListComponent implements OnInit {
  contratos: any[] = [];
  filteredContratos: any[] = [];
  pagedContratos: any[] = [];
  loading = true;
  isAdmin = false;

  // Pagination
  pageSize = 10;
  currentPage = 0;
  totalElements = 0;
  totalPages = 0;

  // Filters
  filters = {
    search: '',
    licitacion: '',
    proveedor: '',
    estado: '',
    tipo: '',
    fechaFirma: ''
  };

  constructor(
    private contratoService: ContratoService,
    private tokenService: TokenService
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.tokenService.isAdmin();
    this.loadContratos();
  }

  loadContratos(): void {
    this.loading = true;
    this.contratoService.getAll().subscribe({
      next: (data) => {
        this.contratos = data || [];
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading contracts', err);
        this.loading = false;
        Swal.fire('Error', 'No se pudieron cargar los contratos.', 'error');
      }
    });
  }

  applyFilters(): void {
    let list = [...this.contratos];

    if (this.filters.search) {
      const q = this.filters.search.toLowerCase().trim();
      list = list.filter(c => 
        (c.codigo && c.codigo.toLowerCase().includes(q)) ||
        (c.licitacion?.titulo && c.licitacion.titulo.toLowerCase().includes(q)) ||
        (c.propuesta?.empresaNombre && c.propuesta.empresaNombre.toLowerCase().includes(q))
      );
    }

    if (this.filters.licitacion) {
      list = list.filter(c => c.licitacion?.titulo === this.filters.licitacion);
    }

    if (this.filters.proveedor) {
      list = list.filter(c => c.propuesta?.empresaNombre === this.filters.proveedor);
    }

    if (this.filters.estado) {
      list = list.filter(c => c.estado === this.filters.estado);
    }

    if (this.filters.tipo) {
      list = list.filter(c => c.licitacion?.tipo === this.filters.tipo);
    }

    if (this.filters.fechaFirma) {
      const fDate = new Date(this.filters.fechaFirma);
      fDate.setHours(0, 0, 0, 0);
      list = list.filter(c => {
        if (!c.fechaFirma) return false;
        const d = new Date(c.fechaFirma);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === fDate.getTime();
      });
    }

    this.filteredContratos = list;
    this.totalElements = list.length;
    this.totalPages = Math.ceil(list.length / this.pageSize);
    this.currentPage = 0;
    this.paginate();
  }

  paginate(): void {
    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    this.pagedContratos = this.filteredContratos.slice(start, end);
  }

  changePage(p: number): void {
    if (p >= 0 && p < this.totalPages) {
      this.currentPage = p;
      this.paginate();
    }
  }

  getPageNumbers(): number[] {
    const pages = [];
    for (let i = 0; i < this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  getMin(a: number, b: number): number {
    return Math.min(a, b);
  }

  clearFilters(): void {
    this.filters = {
      search: '',
      licitacion: '',
      proveedor: '',
      estado: '',
      tipo: '',
      fechaFirma: ''
    };
    this.applyFilters();
  }

  // --- Dynamic Getters for filter selectors ---
  get uniqueLicitaciones(): string[] {
    const set = new Set<string>();
    this.contratos.forEach(c => {
      if (c.licitacion?.titulo) set.add(c.licitacion.titulo);
    });
    return Array.from(set.values());
  }

  get uniqueProveedores(): string[] {
    const set = new Set<string>();
    this.contratos.forEach(c => {
      if (c.propuesta?.empresaNombre) set.add(c.propuesta.empresaNombre);
    });
    return Array.from(set.values());
  }

  get uniqueTipos(): string[] {
    const set = new Set<string>();
    this.contratos.forEach(c => {
      if (c.licitacion?.tipo) set.add(c.licitacion.tipo);
    });
    return Array.from(set.values());
  }

  get uniqueEstados(): string[] {
    const set = new Set<string>();
    this.contratos.forEach(c => {
      if (c.estado) set.add(c.estado);
    });
    return Array.from(set.values());
  }

  // --- Status and visual helper styling ---
  getStatusClass(estado: string): string {
    if (!estado) return 'pendiente';
    return estado.toLowerCase().trim();
  }

  getFriendlyEstado(estado: string): string {
    if (!estado) return 'Pendiente';
    const st = estado.toUpperCase();
    if (st === 'PENDIENTE') return 'Pendiente';
    if (st === 'FIRMADO') return 'Firmado';
    if (st === 'FINALIZADO') return 'Finalizado';
    if (st === 'CANCELADO' || st === 'RESCINDIDO' || st === 'ANULADO') return 'Rescindido';
    return estado;
  }

  getTipoContratoClass(tipo: string): string {
    if (!tipo) return 'servicio';
    const t = tipo.toLowerCase();
    if (t.includes('servicio')) return 'servicio';
    if (t.includes('obra')) return 'obra';
    if (t.includes('suministro') || t.includes('compra')) return 'suministro';
    if (t.includes('pública') || t.includes('publica') || t.includes('public')) return 'publica';
    return 'servicio';
  }

  // --- Dynamic KPI Getters ---
  get kpis() {
    const all = this.contratos;
    const total = all.length || 1;

    const firmados = all.filter(c => c.estado === 'FIRMADO').length;
    const enEjecucion = all.filter(c => c.estado === 'FIRMADO' || c.estado === 'EN_EJECUCION').length;
    const finalizados = all.filter(c => c.estado === 'FINALIZADO').length;
    const cancelados = all.filter(c => c.estado === 'CANCELADO' || c.estado === 'RESCINDIDO' || c.estado === 'ANULADO').length;

    return {
      total: all.length,
      firmados,
      pctFirmados: ((firmados / total) * 100).toFixed(1),
      enEjecucion,
      pctEnEjecucion: ((enEjecucion / total) * 100).toFixed(1),
      finalizados,
      pctFinalizados: ((finalizados / total) * 100).toFixed(1),
      cancelados,
      pctCancelados: ((cancelados / total) * 100).toFixed(1)
    };
  }

  // --- Donut Chart Stats ---
  get donutData() {
    const all = this.contratos;
    const total = all.length || 1;

    const pend = all.filter(c => c.estado === 'PENDIENTE').length;
    const firm = all.filter(c => c.estado === 'FIRMADO').length;
    const exec = all.filter(c => c.estado === 'EN_EJECUCION').length;
    const fin = all.filter(c => c.estado === 'FINALIZADO').length;
    const canc = all.filter(c => c.estado === 'CANCELADO' || c.estado === 'RESCINDIDO' || c.estado === 'ANULADO').length;

    return {
      total: all.length,
      pend,
      firm,
      exec,
      fin,
      canc,
      pctPend: (pend / total) * 100,
      pctFirm: (firm / total) * 100,
      pctExec: (exec / total) * 100,
      pctFin: (fin / total) * 100,
      pctCanc: (canc / total) * 100
    };
  }

  // --- SVG Stroke segment styles ---
  get StrokeDashArrayPendientes(): string {
    const d = this.donutData; return `${d.pctPend} ${100 - d.pctPend}`;
  }
  get StrokeDashArrayFirmados(): string {
    const d = this.donutData; return `${d.pctFirm} ${100 - d.pctFirm}`;
  }
  get StrokeDashArrayEnEjecucion(): string {
    const d = this.donutData; return `${d.pctExec} ${100 - d.pctExec}`;
  }
  get StrokeDashArrayFinalizados(): string {
    const d = this.donutData; return `${d.pctFin} ${100 - d.pctFin}`;
  }
  get StrokeDashArrayCancelados(): string {
    const d = this.donutData; return `${d.pctCanc} ${100 - d.pctCanc}`;
  }

  get StrokeDashOffsetPendientes(): number {
    return 25;
  }
  get StrokeDashOffsetFirmados(): number {
    const d = this.donutData; return 25 - d.pctPend;
  }
  get StrokeDashOffsetEnEjecucion(): number {
    const d = this.donutData; return 25 - d.pctPend - d.pctFirm;
  }
  get StrokeDashOffsetFinalizados(): number {
    const d = this.donutData; return 25 - d.pctPend - d.pctFirm - d.pctExec;
  }
  get StrokeDashOffsetCancelados(): number {
    const d = this.donutData; return 25 - d.pctPend - d.pctFirm - d.pctExec - d.pctFin;
  }

  // --- SwAlert Actions ---
  generarContrato(): void {
    Swal.fire({
      title: 'Generar Contrato',
      text: 'Para generar un nuevo contrato, vaya a la sección de Evaluaciones / Resultados y adjudique una licitación aprobada.',
      icon: 'info',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#3b82f6'
    });
  }

  subirContrato(): void {
    Swal.fire({
      title: 'Subir Contrato Firmado',
      text: 'Seleccione el archivo PDF del contrato debidamente firmado por ambas partes.',
      input: 'file',
      inputAttributes: {
        'accept': 'application/pdf',
        'aria-label': 'Subir contrato firmado'
      },
      showCancelButton: true,
      confirmButtonText: 'Subir Archivo',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981'
    });
  }

  gestionarVigencias(): void {
    Swal.fire({
      title: 'Gestionar Vigencias',
      text: 'Configure alertas automáticas por correo para contratos próximos a vencer o finalizar.',
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Configurar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3b82f6'
    });
  }

  generarReporte(): void {
    Swal.fire({
      title: 'Generar Reporte de Contratos',
      text: 'Seleccione el formato para el resumen consolidado de contratos:',
      icon: 'question',
      showDenyButton: true,
      confirmButtonText: 'Excel (XLSX)',
      denyButtonText: 'PDF',
      confirmButtonColor: '#10b981',
      denyButtonColor: '#ef4444'
    });
  }

  descargarContratoPdf(c: any): void {
    const contractId = c?.id;
    if (!contractId) {
      Swal.fire('Error', 'Contrato no válido.', 'error');
      return;
    }

    Swal.fire({
      title: 'Generando Documento...',
      text: 'Compilando cláusulas legales y firmas electrónicas en PDF real...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    this.contratoService.descargarPdf(contractId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contrato_${c.codigo || contractId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        Swal.fire({
          title: '¡Descargado!',
          text: 'El contrato PDF ha sido generado y descargado correctamente.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      },
      error: (err) => {
        console.error('Error downloading contract PDF:', err);
        Swal.fire('Error', 'No se pudo generar el contrato en PDF desde el servidor.', 'error');
      }
    });
  }

  descargarContratoRapido(): void {
    if (this.contratos.length === 0) {
      Swal.fire('Información', 'No hay contratos registrados para descargar.', 'info');
      return;
    }
    if (this.contratos.length === 1) {
      this.descargarContratoPdf(this.contratos[0]);
      return;
    }
    
    const inputOptions: { [key: string]: string } = {};
    this.contratos.forEach(c => {
      inputOptions[c.id.toString()] = `${c.codigo || ('CONT-' + c.id)} - ${c.licitacion?.titulo || 'Contrato'}`;
    });
    
    Swal.fire({
      title: 'Seleccione un Contrato',
      input: 'select',
      inputOptions: inputOptions,
      inputPlaceholder: 'Seleccione un contrato para descargar...',
      showCancelButton: true,
      confirmButtonText: 'Descargar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3b82f6'
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const selected = this.contratos.find(c => c.id.toString() === result.value);
        if (selected) {
          this.descargarContratoPdf(selected);
        }
      }
    });
  }
}
