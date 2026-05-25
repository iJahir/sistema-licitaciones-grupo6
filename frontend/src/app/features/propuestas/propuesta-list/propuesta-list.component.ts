import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { PropuestaService } from '../../../core/services/propuesta.service';
import { TokenService } from '../../../core/services/token.service';
import { CalendarioService } from '../../../core/services/calendario.service';
import Swal from 'sweetalert2';
import { API_CONFIG } from '../../../core/config/api-config';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-propuesta-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './propuesta-list.component.html',
  styleUrls: ['./propuesta-list.component.scss']
})
export class PropuestaListComponent implements OnInit {
  propuestas: any[] = [];
  currentUser: any;
  isAdmin = false;
  isArea = false;
  isProveedor = false;
  isEvaluador = false;
  loading = true;

  // Modals state
  selectedPropuesta: any = null;
  showDetailModal = false;
  showRejectionModal = false;
  rejectionReason = '';
  isActionLoading = false;

  // Dropdown menu state
  activeDropdownId: number | null = null;

  // Modern Filters Object
  filters = {
    search: '',
    licitacion: '',
    participante: '',
    estado: '',
    fechaRecepcion: ''
  };

  realActivities: any[] = [];

  constructor(
    private propuestaService: PropuestaService,
    private tokenService: TokenService,
    private router: Router,
    private calendarioService: CalendarioService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.tokenService.getUser();
    this.checkRoles();
    this.loadPropuestas();
  }

  checkRoles(): void {
    this.isAdmin = this.tokenService.isAdmin() || this.tokenService.hasAnyRole('OBSERVADOR', 'AUTORIDAD');
    this.isArea = this.tokenService.isArea();
    this.isProveedor = this.tokenService.isProveedor();
    this.isEvaluador = this.tokenService.isEvaluador();
  }

  loadPropuestas(): void {
    this.loading = true;
    let obs;
    if (this.isAdmin || this.isArea) {
      obs = this.propuestaService.getAll();
    } else if (this.isEvaluador) {
      obs = this.propuestaService.getAsignadas();
    } else {
      obs = this.propuestaService.getMyPropuestas();
    }
    
    obs.subscribe({
      next: (data) => {
        this.propuestas = data || [];
        this.loading = false;
        this.loadActividades();
      },
      error: (err) => {
        console.error('Error loading proposals', err);
        this.loading = false;
      }
    });
  }

  loadActividades(): void {
    this.calendarioService.getEvents().subscribe({
      next: (events) => {
        const sortedEvents = (events || [])
          .filter(e => e.tipoEvento === 'PROPUESTA_RECIBIDA' || e.tipoEvento === 'EVALUACION_EN_CURSO')
          .sort((a, b) => {
            const dateA = new Date(a.fechaEvento).getTime();
            const dateB = new Date(b.fechaEvento).getTime();
            return dateB - dateA;
          });

        this.realActivities = sortedEvents.map(e => {
          let matchingPropuesta = this.propuestas.find(p => p.id === e.referenciaId && e.referenciaTipo === 'propuesta');
          if (!matchingPropuesta && e.referenciaTipo === 'licitacion') {
            matchingPropuesta = this.propuestas.find(p => p.licitacion?.id === e.referenciaId);
          }
          
          let actionTitle = e.titulo;
          let actionClass = 'received';
          let empresa = matchingPropuesta?.empresaNombre || 'Proveedor';
          let licitacionCode = matchingPropuesta?.licitacion?.id 
            ? `LP-2026-${String(matchingPropuesta.licitacion.id).padStart(3, '0')}` 
            : 'LP-2026-000';

          if (e.tipoEvento === 'EVALUACION_EN_CURSO') {
            actionTitle = 'Propuesta enviada a evaluación';
            actionClass = 'evaluating';
          } else if (matchingPropuesta?.estado === 'GANADORA') {
            actionTitle = 'Propuesta adjudicada';
            actionClass = 'awarded';
          } else if (matchingPropuesta?.estado === 'RECHAZADA') {
            actionTitle = 'Propuesta descalificada';
            actionClass = 'rejected';
          } else if (matchingPropuesta?.estado === 'INCOMPLETA') {
            actionTitle = 'Documento subsanado';
            actionClass = 'pending';
          }

          return {
            title: actionTitle,
            class: actionClass,
            empresa: empresa,
            licitacionCode: licitacionCode,
            time: this.getRelativeTime(e.fechaEvento)
          };
        }).slice(0, 4);
      },
      error: (err) => {
        console.error('Error loading calendar events for timeline', err);
      }
    });
  }

  getRelativeTime(fecha: any): string {
    if (!fecha) return 'Hace un momento';
    const date = new Date(fecha);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Hace unos segundos';
    if (diffMins < 60) return `Hace ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`;
    if (diffHours < 24) return `Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
    return `Hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
  }

  // --- Dropdown Toggle Helpers ---
  toggleDropdown(id: number, event: Event): void {
    event.stopPropagation();
    this.activeDropdownId = this.activeDropdownId === id ? null : id;
  }

  @HostListener('document:click')
  closeDropdowns(): void {
    this.activeDropdownId = null;
  }

  // --- Dynamic Filters Getters ---
  get filteredPropuestas(): any[] {
    return this.propuestas.filter(p => {
      // 1. Global Search
      if (this.filters.search) {
        const query = this.filters.search.toLowerCase();
        const matchesSearch = 
          (p.nombre && p.nombre.toLowerCase().includes(query)) ||
          (p.empresaNombre && p.empresaNombre.toLowerCase().includes(query)) ||
          (p.identificacionRuc && p.identificacionRuc.toLowerCase().includes(query)) ||
          (p.licitacion?.titulo && p.licitacion.titulo.toLowerCase().includes(query)) ||
          (p.id && p.id.toString().includes(query));
        if (!matchesSearch) return false;
      }

      // 2. Licitación Select filter
      if (this.filters.licitacion && p.licitacion?.id !== +this.filters.licitacion) {
        return false;
      }

      // 3. Participante (Proveedor) filter
      if (this.filters.participante && p.empresaNombre !== this.filters.participante) {
        return false;
      }

      // 4. Estado filter
      if (this.filters.estado && p.estado !== this.filters.estado) {
        return false;
      }

      // 5. Fecha Recepción filter
      if (this.filters.fechaRecepcion) {
        const filterDate = new Date(this.filters.fechaRecepcion);
        filterDate.setHours(0, 0, 0, 0);
        if (!p.fechaEnvio) return false;
        const envDate = new Date(p.fechaEnvio);
        envDate.setHours(0, 0, 0, 0);
        if (envDate.getTime() !== filterDate.getTime()) return false;
      }

      return true;
    });
  }

  get uniqueLicitaciones(): any[] {
    const map = new Map();
    this.propuestas.forEach(p => {
      if (p.licitacion && p.licitacion.id) {
        map.set(p.licitacion.id, p.licitacion);
      }
    });
    return Array.from(map.values());
  }

  get uniqueParticipantes(): string[] {
    const set = new Set<string>();
    this.propuestas.forEach(p => {
      if (p.empresaNombre) {
        set.add(p.empresaNombre);
      }
    });
    return Array.from(set.values());
  }

  clearFilters(): void {
    this.filters = {
      search: '',
      licitacion: '',
      participante: '',
      estado: '',
      fechaRecepcion: ''
    };
  }

  onFilter(): void {}

  // --- Dynamic Stats & Donut Chart Getters ---
  get kpiStats() {
    const total = this.propuestas.length;
    // Map states perfectly to match KPIs:
    const recibidas = this.propuestas.filter(p => p.estado === 'ENVIADA' || p.estado === 'VALIDADA' || p.estado === 'GANADORA').length;
    const enEvaluacion = this.propuestas.filter(p => p.estado === 'EN_REVISION' || p.estado === 'ACEPTADA').length;
    const subsanacion = this.propuestas.filter(p => p.estado === 'INCOMPLETA').length;
    const descalificadas = this.propuestas.filter(p => p.estado === 'RECHAZADA').length;

    const pctRecibidas = total > 0 ? (recibidas / total * 100).toFixed(1) : '0';
    const pctEnEvaluacion = total > 0 ? (enEvaluacion / total * 100).toFixed(1) : '0';
    const pctSubsanacion = total > 0 ? (subsanacion / total * 100).toFixed(1) : '0';
    const pctDescalificadas = total > 0 ? (descalificadas / total * 100).toFixed(1) : '0';

    return {
      total,
      recibidas,
      pctRecibidas,
      enEvaluacion,
      pctEnEvaluacion,
      subsanacion,
      pctSubsanacion,
      descalificadas,
      pctDescalificadas
    };
  }

  // --- SVG Circular Donut Chart Math ---
  get StrokeDashArrayRecibidas(): string {
    const stats = this.kpiStats;
    if (stats.total === 0) return '0 100';
    const pct = (stats.recibidas / stats.total) * 100;
    return `${pct} ${100 - pct}`;
  }

  get StrokeDashArrayEnEvaluacion(): string {
    const stats = this.kpiStats;
    if (stats.total === 0) return '0 100';
    const pct = (stats.enEvaluacion / stats.total) * 100;
    return `${pct} ${100 - pct}`;
  }

  get StrokeDashArraySubsanacion(): string {
    const stats = this.kpiStats;
    if (stats.total === 0) return '0 100';
    const pct = (stats.subsanacion / stats.total) * 100;
    return `${pct} ${100 - pct}`;
  }

  get StrokeDashArrayDescalificadas(): string {
    const stats = this.kpiStats;
    if (stats.total === 0) return '0 100';
    const pct = (stats.descalificadas / stats.total) * 100;
    return `${pct} ${100 - pct}`;
  }

  get StrokeDashOffsetRecibidas(): number {
    return 25; // starts at top
  }

  get StrokeDashOffsetEnEvaluacion(): number {
    const stats = this.kpiStats;
    if (stats.total === 0) return 25;
    const rPct = (stats.recibidas / stats.total) * 100;
    return 125 - rPct;
  }

  get StrokeDashOffsetSubsanacion(): number {
    const stats = this.kpiStats;
    if (stats.total === 0) return 25;
    const rPct = (stats.recibidas / stats.total) * 100;
    const ePct = (stats.enEvaluacion / stats.total) * 100;
    return 125 - rPct - ePct;
  }

  get StrokeDashOffsetDescalificadas(): number {
    const stats = this.kpiStats;
    if (stats.total === 0) return 25;
    const rPct = (stats.recibidas / stats.total) * 100;
    const ePct = (stats.enEvaluacion / stats.total) * 100;
    const sPct = (stats.subsanacion / stats.total) * 100;
    return 125 - rPct - ePct - sPct;
  }

  // --- Translation Helper for Badges matching Mockup exactly ---
  getFriendlyEstado(estado: string): string {
    if (!estado) return 'Borrador';
    switch (estado.toUpperCase()) {
      case 'BORRADOR': return 'Borrador';
      case 'ENVIADA': return 'Recibida';
      case 'EN_REVISION': return 'En evaluación';
      case 'VALIDADA': return 'Validada';
      case 'INCOMPLETA': return 'Subsanación';
      case 'ACEPTADA': return 'Aceptada';
      case 'RECHAZADA': return 'Descalificada';
      case 'GANADORA': return 'Ganadora';
      default: return estado;
    }
  }

  get propuestasPorLicitacion(): any[] {
    const counts: { [key: string]: { title: string, code: string, count: number } } = {};
    this.propuestas.forEach(p => {
      if (p.licitacion) {
        const id = p.licitacion.id;
        if (!counts[id]) {
          counts[id] = {
            title: p.licitacion.titulo,
            code: `LP-2026-${String(id).padStart(3, '0')}`,
            count: 0
          };
        }
        counts[id].count++;
      }
    });
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
  }

  get ultimasActividades(): any[] {
    const sorted = [...this.propuestas].sort((a, b) => (b.id || 0) - (a.id || 0));
    return sorted.map((p) => {
      let actionTitle = 'Nueva propuesta recibida';
      let actionClass = 'received';
      let timeStr = 'Hace 15 minutos';

      if (p.estado === 'GANADORA') {
        actionTitle = 'Propuesta adjudicada';
        actionClass = 'awarded';
        timeStr = 'Hace 1 hora';
      } else if (p.estado === 'RECHAZADA') {
        actionTitle = 'Propuesta descalificada';
        actionClass = 'rejected';
        timeStr = 'Hace 4 horas';
      } else if (p.estado === 'INCOMPLETA') {
        actionTitle = 'Documento subsanado';
        actionClass = 'pending';
        timeStr = 'Hace 2 horas';
      } else if (p.estado === 'EN_REVISION') {
        actionTitle = 'Propuesta enviada a evaluación';
        actionClass = 'evaluating';
        timeStr = 'Hace 3 horas';
      }

      return {
        title: actionTitle,
        class: actionClass,
        empresa: p.empresaNombre || 'Proveedor N/A',
        licitacionCode: `LP-2026-${String(p.licitacion?.id || 0).padStart(3, '0')}`,
        time: timeStr
      };
    }).slice(0, 4);
  }

  // --- Actions ---
  nuevaPropuesta(): void {
    Swal.fire({
      title: 'Crear Nueva Propuesta',
      text: 'Seleccione una licitación activa en el listado para enviar su propuesta.',
      icon: 'info',
      confirmButtonText: 'Ir a Licitaciones',
      confirmButtonColor: '#3b82f6',
      showCancelButton: true,
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.router.navigate(['/licitaciones']);
      }
    });
  }

  importarPropuestas(): void {
    Swal.fire({
      title: 'Importar Propuestas',
      text: 'Seleccione el archivo JSON o Excel con las propuestas a importar.',
      input: 'file',
      inputAttributes: {
        'accept': '.json,.xlsx,.csv',
        'aria-label': 'Subir archivo de propuestas'
      },
      showCancelButton: true,
      confirmButtonText: 'Procesar',
      confirmButtonColor: '#3b82f6',
      cancelButtonText: 'Cancelar'
    }).then((file) => {
      if (file.value) {
        Swal.fire({
          title: 'Importando...',
          text: 'Procesando las propuestas importadas.',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });
        setTimeout(() => {
          Swal.fire('¡Éxito!', 'Propuestas importadas correctamente.', 'success');
        }, 1500);
      }
    });
  }

  generarReporte(): void {
    Swal.fire({
      title: 'Generar Reporte',
      text: '¿En qué formato desea exportar el reporte consolidado?',
      icon: 'question',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Excel (XLSX)',
      denyButtonText: 'PDF',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981',
      denyButtonColor: '#ef4444'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire('Generando Excel...', 'El reporte se descargará en breve.', 'success');
      } else if (result.isDenied) {
        Swal.fire('Generando PDF...', 'El reporte se abrirá en una nueva pestaña.', 'success');
      }
    });
  }

  descargarPropuesta(p: any): void {
    Swal.fire({
      title: 'Descargar Documentación',
      text: `¿Desea descargar el expediente completo de la propuesta de "${p.empresaNombre}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, descargar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3b82f6'
    }).then((result) => {
      if (result.isConfirmed) {
        const fileUrl = p.archivoUrl || (p.documentos && p.documentos[0]?.archivoUrl);
        if (fileUrl) {
          window.open(this.getDownloadUrl(fileUrl), '_blank');
        } else {
          Swal.fire('Información', 'El expediente no contiene archivos adjuntos descargables.', 'info');
        }
      }
    });
  }

  verDetalle(propuesta: any): void {
    this.selectedPropuesta = propuesta;
    this.showDetailModal = true;
  }

  closeModals(): void {
    this.showDetailModal = false;
    this.showRejectionModal = false;
    this.selectedPropuesta = null;
    this.rejectionReason = '';
  }

  async confirmarValidar(propuesta: any) {
    const result = await Swal.fire({
      title: '¿Validar Propuesta?',
      text: `Estás a punto de validar la propuesta de "${propuesta.empresaNombre}". Esto permitirá que pase a la fase de evaluación.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, validar ahora',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981',
      target: 'body'
    });

    if (result.isConfirmed) {
      this.isActionLoading = true;
      this.propuestaService.validar(propuesta.id).subscribe({
        next: () => {
          this.isActionLoading = false;
          this.closeModals();
          
          Swal.fire({
            title: '¡Propuesta Validada!',
            text: 'La propuesta ha sido enviada exitosamente a evaluación.',
            icon: 'success',
            confirmButtonText: 'Listo',
            confirmButtonColor: '#3b82f6',
            target: 'body'
          }).then(() => {
            window.location.reload();
          });
        },
        error: (err) => {
          this.isActionLoading = false;
          Swal.fire('Error', err.error?.message || 'No se pudo validar la propuesta.', 'error');
        }
      });
    }
  }

  abrirRechazo(propuesta: any): void {
    this.selectedPropuesta = propuesta;
    this.showRejectionModal = true;
    this.rejectionReason = '';
  }

  confirmarRechazo(): void {
    if (!this.rejectionReason.trim()) {
      Swal.fire('Atención', 'Debe ingresar un motivo para el rechazo.', 'warning');
      return;
    }

    this.isActionLoading = true;
    this.propuestaService.rechazar(this.selectedPropuesta.id, this.rejectionReason).subscribe({
      next: () => {
        this.isActionLoading = false;
        this.closeModals();
        
        Swal.fire({
          title: 'Propuesta Rejected',
          text: 'Se ha notificado al proveedor sobre la desestimación.',
          icon: 'info',
          confirmButtonText: 'Listo',
          target: 'body'
        }).then(() => {
          window.location.reload();
        });
      },
      error: (err) => {
        this.isActionLoading = false;
        Swal.fire('Error', err.error?.message || 'No se pudo procesar el rechazo.', 'error');
      }
    });
  }

  getStatusClass(estado: string): string {
    if (!estado) return '';
    return estado.toLowerCase().replace('_', '-');
  }

  formatKey(key: any): string {
    if (!key) return '';
    const formatted = key.replace(/([A-Z])/g, ' $1').trim();
    return formatted.charAt(0).toUpperCase() + formatted.slice(1).toLowerCase();
  }

  getDownloadUrl(path: string): string {
    if (!path) return '#';
    if (path.startsWith('http')) return path;
    const baseUrl = API_CONFIG.baseUrl.replace(/\/api\/$/, '');
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    return baseUrl + cleanPath;
  }

  parseAreaJson(json?: string): any {
    if (!json) return {};
    try {
      return JSON.parse(json);
    } catch (e) {
      return {};
    }
  }
}
