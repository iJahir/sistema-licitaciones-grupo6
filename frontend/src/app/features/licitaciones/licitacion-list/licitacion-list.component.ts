import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { LicitacionService } from '../../../core/services/licitacion.service';
import { AreaService } from '../../../core/services/area.service';
import { TokenService } from '../../../core/services/token.service';
import { Licitacion, EstadoLicitacion } from '../../../data/models/licitacion.model';
import { Area } from '../../../data/models/area.model';
import { CountdownPipe } from '../../../core/pipes/countdown.pipe';
import { CrearLicitacionComponent } from '../crear-licitacion/crear-licitacion.component';

@Component({
  selector: 'app-licitacion-list',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    FormsModule, 
    CountdownPipe, 
    CrearLicitacionComponent
  ],
  templateUrl: './licitacion-list.component.html',
  styleUrls: ['./licitacion-list.component.scss']
})
export class LicitacionListComponent implements OnInit {
  EstadoLicitacion = EstadoLicitacion;
  licitaciones: Licitacion[] = [];
  allLicitacionesUnfiltered: Licitacion[] = [];
  totalElements = 0;
  totalPages = 0;
  currentPage = 0;
  pageSize = 10;
  loading = false;
  
  stats = {
    total: 0,
    publicadas: 0,
    evaluando: 0,
    cerradas: 0,
    canceladas: 0
  };
  
  activeDropdownId: number | null = null;

  filters = {
    search: '',
    estado: '',
    area: '',
    tipo: '',
    fechaPublicacion: ''
  };

  areas: Area[] = [];
  estados = Object.values(EstadoLicitacion);
  
  currentUser: any;
  isAdmin = false;
  isArea = false;
  isProveedor = false;
  isEvaluador = false;

  // Modal State
  showModal = false;
  editingId: number | null = null;
  
  viewMode: string = 'list';

  constructor(
    private licitacionService: LicitacionService,
    private areaService: AreaService,
    private tokenService: TokenService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.currentUser = this.tokenService.getUser();
    this.checkRoles();
    this.loadAreas();
    
    // Detect view mode from route data
    this.route.data.subscribe(data => {
      this.viewMode = data['viewMode'] || 'list';
      if (this.viewMode === 'resultados') {
        this.filters.estado = ''; 
        this.pageSize = 10; 
      }
      this.loadLicitaciones();
    });
  }

  loadAreas(): void {
    this.areaService.getAreas().subscribe(areas => this.areas = areas);
  }

  checkRoles(): void {
    this.isAdmin = this.tokenService.isAdmin() || this.tokenService.hasAnyRole('OBSERVADOR', 'AUTORIDAD');
    this.isArea = this.tokenService.isArea();
    this.isProveedor = this.tokenService.isProveedor();
    this.isEvaluador = this.tokenService.isEvaluador();
  }

  loadLicitaciones(): void {
    const isResultados = this.viewMode === 'resultados';
    const params = {
      search: this.filters.search.trim(),
      estado: isResultados ? '' : this.filters.estado,
      area: this.filters.area,
      page: isResultados ? 0 : this.currentPage,
      size: isResultados ? 1000 : this.pageSize
    };

    this.loading = true;
    this.licitacionService.getAll(params).subscribe({
      next: (data) => {
        let list = data?.content || [];
        this.allLicitacionesUnfiltered = [...list];
        if (this.filters.tipo) {
          list = list.filter((l: any) => l.tipo === this.filters.tipo);
        }
        if (this.filters.fechaPublicacion) {
          const filterDate = new Date(this.filters.fechaPublicacion);
          filterDate.setHours(0, 0, 0, 0);
          
          list = list.filter((l: any) => {
            if (!l.fechaPublicacion) return false;
            const pubDate = new Date(l.fechaPublicacion);
            pubDate.setHours(0, 0, 0, 0);
            return pubDate.getTime() >= filterDate.getTime();
          });
        }
        if (isResultados) {
          list = list.filter((l: any) => l.estado === 'ADJUDICADA' || l.estado === 'CONTRATADA' || l.propuestaGanadora != null);
          this.totalElements = list.length;
          this.totalPages = Math.ceil(list.length / this.pageSize);
          const startIndex = this.currentPage * this.pageSize;
          const endIndex = startIndex + this.pageSize;
          this.licitaciones = list.slice(startIndex, endIndex);
        } else {
          this.licitaciones = list;
          this.totalElements = data?.totalElements || 0;
          this.totalPages = data?.totalPages || 0;
        }
        this.calculateStats();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading licitaciones', err);
        this.loading = false;
      }
    });
  }

  calculateStats(): void {
    this.stats.total = this.totalElements;
    this.stats.publicadas = this.licitaciones.filter(l => l.estado === EstadoLicitacion.PUBLICADA).length;
    this.stats.evaluando = this.licitaciones.filter(l => l.estado === EstadoLicitacion.EN_EVALUACION || l.estado === EstadoLicitacion.EVALUADA).length;
    this.stats.cerradas = this.licitaciones.filter(l => l.estado === EstadoLicitacion.CERRADA || l.estado === EstadoLicitacion.ADJUDICADA || l.estado === EstadoLicitacion.CONTRATADA).length;
    this.stats.canceladas = this.licitaciones.filter(l => l.estado === EstadoLicitacion.CANCELADA || l.estado === EstadoLicitacion.DESIERTA).length;
  }

  onFilter(): void {
    this.currentPage = 0;
    this.loadLicitaciones();
  }

  openCreateModal(): void {
    this.editingId = null;
    this.showModal = true;
  }

  openEditModal(id: number): void {
    this.editingId = id;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingId = null;
  }

  onFormComplete(): void {
    this.closeModal();
    window.location.reload();
  }

  clearFilters(): void {
    this.filters = { search: '', estado: '', area: '', tipo: '', fechaPublicacion: '' };
    this.onFilter();
  }

  changePage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.loadLicitaciones();
    }
  }

  getStatusClass(estado: string): string {
    switch(estado) {
      case 'BORRADOR': return 'status-draft';
      case 'PUBLICADA': return 'status-published';
      case 'CERRADA': return 'status-closed';
      case 'EN_EVALUACION': return 'status-evaluating';
      case 'ADJUDICADA': return 'status-awarded';
      case 'CANCELADA': return 'status-canceled';
      default: return 'status-default';
    }
  }

  canEdit(l: Licitacion): boolean {
    if (this.isAdmin) return true;
    if (this.isArea) {
      const isOwner = l.creadoPor?.id === this.currentUser?.id;
      return isOwner && (l.estado === EstadoLicitacion.BORRADOR || l.estado === EstadoLicitacion.PUBLICADA);
    }
    return false;
  }

  canEvaluate(l: Licitacion): boolean {
    if (this.isAdmin) return true;
    const isAllowedRole = this.isAdmin || this.isEvaluador;
    return isAllowedRole && (l.estado === EstadoLicitacion.CERRADA || l.estado === EstadoLicitacion.EN_EVALUACION);
  }

  async cancelarLicitacion(id: number): Promise<void> {
    const { value: motivo } = await Swal.fire({
      title: 'Cancelar Licitación',
      input: 'textarea',
      inputLabel: 'Motivo de la cancelación',
      inputPlaceholder: 'Escriba el motivo aquí...',
      showCancelButton: true,
      confirmButtonText: 'Confirmar Cancelación',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#ef4444',
      inputValidator: (value) => {
        if (!value || value.trim().length < 5) return 'Debe proporcionar un motivo válido.';
        return null;
      }
    });

    if (motivo) {
      Swal.fire({ title: 'Cancelando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      this.licitacionService.cancel(id, motivo).subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Licitación Cancelada' }).then(() => window.location.reload());
        },
        error: (err) => {
          Swal.fire({ icon: 'error', title: 'Error', text: err.error?.message || 'No se pudo cancelar.' });
        }
      });
    }
  }

  async toggleEstado(l: Licitacion): Promise<void> {
    const esBorrador = l.estado === EstadoLicitacion.BORRADOR;
    const nuevoEstado = esBorrador ? EstadoLicitacion.PUBLICADA : EstadoLicitacion.BORRADOR;
    
    const { isConfirmed } = await Swal.fire({
      title: esBorrador ? '¿Publicar Licitación?' : '¿Regresar a Borrador?',
      text: esBorrador 
        ? 'La licitación será visible para todos los proveedores.' 
        : 'La licitacion dejará de ser visible y podrá ser editada libremente.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: esBorrador ? 'Sí, Publicar' : 'Sí, Quitar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: esBorrador ? '#1cc88a' : '#f6c23e'
    });

    if (isConfirmed) {
      Swal.fire({ title: 'Procesando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      
      this.licitacionService.cambiarEstado(l.id!, nuevoEstado).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Estado Actualizado',
            text: `La licitación ahora está en estado: ${nuevoEstado}`,
            confirmButtonColor: '#3b82f6'
          }).then(() => window.location.reload());
        },
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err.error?.message || 'No se pudo cambiar el estado.',
            confirmButtonColor: '#1e293b'
          });
        }
      });
    }
  }

  toggleDropdown(id: number, event: MouseEvent): void {
    event.stopPropagation();
    this.activeDropdownId = this.activeDropdownId === id ? null : id;
  }

  @HostListener('document:click')
  closeAllDropdowns(): void {
    this.activeDropdownId = null;
  }

  getPropuestasCount(l: Licitacion): number {
    if (!l || !l.id) return 0;
    if (l.propuestasCount !== undefined) {
      return l.propuestasCount;
    }
    const mockCounts: { [key: number]: number } = {
      15: 8,
      14: 5,
      13: 11,
      12: 7,
      11: 6,
      10: 0,
      9: 9,
      8: 4
    };
    return mockCounts[l.id] !== undefined ? mockCounts[l.id] : 0;
  }

  getEntidadConvocante(l: Licitacion): string {
    if (l.area?.nombre) return l.area.nombre;
    const mockEntidades: { [key: number]: string } = {
      15: 'Finanzas',
      14: 'Recursos Humanos',
      13: 'TI',
      12: 'Operaciones',
      11: 'Logística',
      10: 'Comercial',
      9: 'Jurídico',
      8: 'Finanzas'
    };
    return mockEntidades[l.id || 0] || 'Comercial';
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

  // ==========================================
  // Resultados / Adjudicaciones Mock Helpers
  // ==========================================
  get donutData() {
    const total = this.allLicitacionesUnfiltered.length || 1;
    
    const adj = this.allLicitacionesUnfiltered.filter(l => l.estado === 'ADJUDICADA').length;
    const proc = this.allLicitacionesUnfiltered.filter(l => l.estado === 'CONTRATADA' || l.estado === 'EN_EVALUACION' || l.estado === 'EVALUADA').length;
    const des = this.allLicitacionesUnfiltered.filter(l => l.estado === 'DESIERTA').length;
    const canc = this.allLicitacionesUnfiltered.filter(l => l.estado === 'CANCELADA').length;
    const pend = this.allLicitacionesUnfiltered.filter(l => l.estado === 'BORRADOR' || l.estado === 'PUBLICADA' || l.estado === 'EN_INSCRIPCION' || l.estado === 'CERRADA').length;
    
    return {
      total: this.allLicitacionesUnfiltered.length,
      adj,
      proc,
      des,
      canc,
      pend,
      pctAdj: (adj / total) * 100,
      pctProc: (proc / total) * 100,
      pctDes: (des / total) * 100,
      pctCanc: (canc / total) * 100,
      pctPend: (pend / total) * 100
    };
  }

  getresultadosKpis() {
    const totalAll = this.allLicitacionesUnfiltered.length || 1;
    
    // Total approved is the count of currently displayed licitaciones
    const total = this.licitaciones.length;
    
    // Sum amount dynamically
    let sum = 0;
    this.licitaciones.forEach(l => {
      if (l.propuestaGanadora?.montoOfertado) {
        sum += l.propuestaGanadora.montoOfertado;
      } else {
        const amounts: { [key: number]: number } = {
          15: 298500, 14: 45600, 13: 1250000, 12: 87430, 11: 48200, 10: 68750, 9: 345000, 8: 65300
        };
        const amt = l.id ? (amounts[l.id] || (35000 + (l.id * 1500))) : 0;
        sum += amt;
      }
    });

    const adjCount = this.licitaciones.filter(l => l.estado === 'ADJUDICADA').length;
    const contCount = this.licitaciones.filter(l => l.estado === 'CONTRATADA').length;
    const cancCount = this.allLicitacionesUnfiltered.filter(l => l.estado === 'DESIERTA' || l.estado === 'CANCELADA').length;

    const pctProcesos = ((adjCount / totalAll) * 100).toFixed(2);
    const pctEnContratacion = ((contCount / totalAll) * 100).toFixed(2);
    const pctCancelados = ((cancCount / totalAll) * 100).toFixed(2);

    return {
      total: total,
      monto: sum.toLocaleString('en-US', { minimumFractionDigits: 2 }),
      procesos: adjCount,
      pctProcesos: pctProcesos,
      enContratacion: contCount,
      pctEnContratacion: pctEnContratacion,
      cancelados: cancCount,
      pctCancelados: pctCancelados
    };
  }

  getProveedorAdjudicado(l: any): { name: string, ruc: string } {
    if (l.propuestaGanadora) {
      const u = l.propuestaGanadora.usuario;
      const r = l.propuestaGanadora.ruc || '1098765432001';
      return {
        name: u ? `${u.nombre} ${u.apellido}` : 'Jahir Marroquin',
        ruc: `RUC: ${r}`
      };
    }
    const names = [
      'Tech Solutions S.A.', 'ServiMag S.A.', 'Constructora del Norte', 
      'CompuWorld S.A.', 'LimpiaMax S.A.', 'Seguridad Total S.A.', 
      'AutoCorp S.A.', 'Digital Solutions Ltda.', 'Infraestructura Global S.A.', 'OfiMax S.A.'
    ];
    const rucs = [
      '1098765432001', '1198765438001', '2098765440001', 
      '1798765441001', '2098765442001', '1198765443001', 
      '1798765444001', '2098765445001', '1098765446001', '1198765447001'
    ];
    const name = names[l.id % names.length];
    const ruc = rucs[l.id % rucs.length];
    return { name, ruc: `RUC: ${ruc}` };
  }

  getMontoAdjudicado(l: any): string {
    if (l.propuestaGanadora?.montoOfertado) {
      return 'USD ' + l.propuestaGanadora.montoOfertado.toLocaleString('en-US', { minimumFractionDigits: 2 });
    }
    const amounts: { [key: number]: number } = {
      15: 298500,
      14: 45600,
      13: 1250000,
      12: 87430,
      11: 48200,
      10: 68750,
      9: 345000,
      8: 65300
    };
    const amt = amounts[l.id] || (35000 + (l.id * 1500));
    if (l.id === 4) return '-'; 
    return 'USD ' + amt.toLocaleString('en-US', { minimumFractionDigits: 2 });
  }

  getFechaAdjudicacion(l: any): { date: string, time: string } {
    const dates = ['18/05/2026', '16/05/2026', '15/05/2026', '14/05/2026', '12/05/2026', '11/05/2026', '10/05/2026', '09/05/2026', '08/05/2026', '07/05/2026'];
    const times = ['10:30 a.m.', '02:20 p.m.', '11:15 a.m.', '04:45 p.m.', '09:10 a.m.', '03:30 p.m.', '01:20 p.m.', '11:05 a.m.', '-', '10:00 a.m.'];
    return {
      date: dates[l.id % dates.length],
      time: times[l.id % times.length]
    };
  }

  getFriendlyEstadoAdjudicacion(l: any): string {
    const st = l.estado;
    if (st === 'CONTRATADA' || st === 'ADJUDICADA') return 'Adjudicado';
    if (st === 'EN_EVALUACION' || st === 'CERRADA') return 'En proceso';
    if (st === 'DESIERTA') return 'Desierto';
    if (st === 'CANCELADA') return 'Cancelado';
    return 'Adjudicado';
  }

  getTipoAdjudicacion(l: any): string {
    if (l.id === 9) return 'Parcial'; 
    if (l.id === 4) return '-'; 
    return 'Total';
  }

  getStatusClassAdjudicacion(estado: string): string {
    if (!estado) return 'adjudicado';
    const clean = estado.toLowerCase().replace(' ', '-').trim();
    if (clean.includes('proceso')) return 'en-proceso';
    if (clean.includes('desierto')) return 'desierto';
    if (clean.includes('cancelado')) return 'cancelado';
    return 'adjudicado';
  }

  get uniqueLicitacionesNombres(): string[] {
    const set = new Set<string>();
    this.licitaciones.forEach(l => {
      if (l.titulo) set.add(l.titulo);
    });
    return Array.from(set.values());
  }

  // --- SVG Donut Stroke Slices Calculations ---
  get StrokeDashArrayAdjudicadas(): string {
    const d = this.donutData;
    return `${d.pctAdj} ${100 - d.pctAdj}`;
  }
  get StrokeDashArrayEnProceso(): string {
    const d = this.donutData;
    return `${d.pctProc} ${100 - d.pctProc}`;
  }
  get StrokeDashArrayDesiertas(): string {
    const d = this.donutData;
    return `${d.pctDes} ${100 - d.pctDes}`;
  }
  get StrokeDashArrayCanceladas(): string {
    const d = this.donutData;
    return `${d.pctCanc} ${100 - d.pctCanc}`;
  }
  get StrokeDashArrayPendientes(): string {
    const d = this.donutData;
    return `${d.pctPend} ${100 - d.pctPend}`;
  }

  get StrokeDashOffsetAdjudicadas(): number {
    return 25;
  }
  get StrokeDashOffsetEnProceso(): number {
    const d = this.donutData;
    return 25 - d.pctAdj;
  }
  get StrokeDashOffsetDesiertas(): number {
    const d = this.donutData;
    return 25 - d.pctAdj - d.pctProc;
  }
  get StrokeDashOffsetCanceladas(): number {
    const d = this.donutData;
    return 25 - d.pctAdj - d.pctProc - d.pctDes;
  }
  get StrokeDashOffsetPendientes(): number {
    const d = this.donutData;
    return 25 - d.pctAdj - d.pctProc - d.pctDes - d.pctCanc;
  }

  // --- SwAlert Triggers for Quick Actions ---
  generarAdjudicacion(): void {
    Swal.fire({
      title: 'Generar Adjudicación',
      text: 'Seleccione un proceso técnico finalizado para formalizar la propuesta ganadora.',
      icon: 'info',
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#3b82f6'
    });
  }

  generarActa(): void {
    Swal.fire({
      title: 'Generar Acta de Comité',
      text: '¿Desea redactar y firmar el acta técnica de resolución final para esta licitación?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, generar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3b82f6'
    });
  }

  generarContrato(): void {
    Swal.fire({
      title: 'Generar Contrato Legal',
      text: 'El sistema redactará el borrador del contrato del proveedor adjudicado basándose en la plantilla estándar.',
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Redactar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981'
    });
  }

  generarReporteResultados(): void {
    Swal.fire({
      title: 'Reporte de Adjudicaciones',
      text: 'Seleccione el formato de salida para el consolidado de procesos:',
      icon: 'question',
      showDenyButton: true,
      confirmButtonText: 'Excel (XLSX)',
      denyButtonText: 'PDF',
      confirmButtonColor: '#10b981',
      denyButtonColor: '#ef4444'
    });
  }

  exportarDatos(): void {
    Swal.fire({
      title: 'Exportar Historial',
      text: '¿Desea exportar el listado completo de adjudicaciones a un archivo plano delimitado por comas (CSV)?',
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Exportar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3b82f6'
    });
  }
}
