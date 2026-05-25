import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EvaluacionService } from '../../../core/services/evaluacion.service';
import { LicitacionService } from '../../../core/services/licitacion.service';
import { PropuestaService } from '../../../core/services/propuesta.service';
import { TokenService } from '../../../core/services/token.service';
import { UsuarioService } from '../../../core/services/usuario.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-evaluacion-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './evaluacion-list.component.html',
  styleUrls: ['./evaluacion-list.component.scss']
})
export class EvaluacionListComponent implements OnInit {
  propuestas: any[] = [];
  currentUser: any;
  loading = true;
  isAdmin = false;
  isEvaluador = false;
  isArea = false;

  // Dropdown control
  activeDropdownId: number | null = null;

  // Rejection/Subsanacion modal state if needed
  selectedEvaluacion: any = null;

  // Filters
  filters = {
    search: '',
    licitacion: '',
    participante: '',
    estado: '',
    evaluador: '',
    fecha: ''
  };

  constructor(
    private evaluacionService: EvaluacionService,
    private tokenService: TokenService,
    private licitacionService: LicitacionService,
    private propuestaService: PropuestaService,
    private router: Router,
    private usuarioService: UsuarioService
  ) {}

  // ID del usuario actual para determinar qué botones mostrar
  get currentUserId(): number {
    return this.currentUser?.id || 0;
  }

  // Obtener la evaluación asignada al usuario logueado para una propuesta
  getMyEvaluacion(p: any): any {
    if (!p.evaluadores || !this.currentUserId) return null;
    return p.evaluadores.find((ev: any) => ev.evaluadorId === this.currentUserId) || null;
  }

  // Verificar si el usuario logueado tiene asignación en esta propuesta
  isMeAssigned(p: any): boolean {
    return !!this.getMyEvaluacion(p);
  }

  getEvaluadorInitials(nombre: string): string {
    if (!nombre) return '?';
    const parts = nombre.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  }

  ngOnInit(): void {
    this.currentUser = this.tokenService.getUser();
    this.checkRoles();
    this.loadMisEvaluaciones();
  }

  checkRoles(): void {
    this.isAdmin = this.tokenService.isAdmin() || this.tokenService.hasAnyRole('OBSERVADOR', 'AUTORIDAD');
    this.isEvaluador = this.tokenService.isEvaluador();
    this.isArea = this.tokenService.isArea();
  }

  loadMisEvaluaciones(): void {
    this.loading = true;
    const obs = (this.isEvaluador && !this.isAdmin)
      ? this.evaluacionService.getMisAsignaciones()
      : this.evaluacionService.getMisEvaluaciones();

    obs.subscribe({
      next: (data) => {
        this.propuestas = data || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar licitaciones asignadas', err);
        this.loading = false;
      }
    });
  }

  // --- Dropdowns helper ---
  toggleDropdown(id: number, event: Event): void {
    event.stopPropagation();
    this.activeDropdownId = this.activeDropdownId === id ? null : id;
  }

  @HostListener('document:click')
  closeDropdowns(): void {
    this.activeDropdownId = null;
  }

  // --- Dynamic Mock Data Helpers matching Image 1 ---
  getEvaluatorName(id: number): string {
    if (this.currentUser) {
      const nombreCompleto = `${this.currentUser.nombre || ''} ${this.currentUser.apellido || ''}`.trim();
      if (nombreCompleto) {
        return nombreCompleto;
      }
      if (this.currentUser.username) {
        return this.currentUser.username;
      }
    }
    const names = ['María González', 'Carlos Vázquez', 'Andrés Herrera', 'María González', 'Carlos Vázquez', 'Andrés Herrera'];
    return names[id % names.length];
  }

  getEvaluatorRole(): string {
    if (this.currentUser && this.currentUser.roles && this.currentUser.roles.length > 0) {
      const role = this.currentUser.roles[0];
      if (role === 'ROLE_ADMINISTRADOR' || role === 'ADMINISTRADOR') return 'Administrador';
      if (role === 'ROLE_EVALUADOR' || role === 'EVALUADOR') return 'Comité Evaluador';
    }
    return 'Comité Técnico';
  }

  getCriteriaCount(id: number): number {
    const counts = [5, 4, 6, 5, 3, 4, 6, 5];
    return counts[id % counts.length];
  }

  getFechaInicio(p: any): { date: string, time: string } {
    if (!p || !p.fechaEnvio) {
      return { date: 'N/A', time: '' };
    }
    const d = new Date(p.fechaEnvio);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'p.m.' : 'a.m.';
    hours = hours % 12;
    hours = hours ? hours : 12; // hour '0' should be '12'
    const hoursStr = String(hours).padStart(2, '0');

    return {
      date: `${day}/${month}/${year}`,
      time: `${hoursStr}:${minutes} ${ampm}`
    };
  }

  getFechaLimite(p: any): { date: string, sub: string, subClass: string } {
    if (!p || !p.fechaLimite) {
      return { date: 'N/A', sub: '', subClass: '' };
    }
    const d = new Date(p.fechaLimite);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    // Calculate remaining days
    const now = new Date();
    const dZero = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const nowZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffMs = dZero.getTime() - nowZero.getTime();
    const diffDays = Math.round(diffMs / 86400000);

    let sub = '';
    let subClass = '';

    if (diffDays < 0) {
      sub = 'Vencido';
      subClass = 'danger';
    } else if (diffDays === 0) {
      sub = 'Hoy';
      subClass = 'danger';
    } else if (diffDays === 1) {
      sub = 'Mañana';
      subClass = 'info';
    } else {
      sub = `${diffDays} días restantes`;
      subClass = diffDays <= 3 ? 'info' : 'warning';
    }

    return {
      date: `${day}/${month}/${year}`,
      sub: sub,
      subClass: subClass
    };
  }

  getFriendlyEstado(estado: string): string {
    if (!estado) return 'Pendiente';
    const clean = estado.toUpperCase();
    if (clean.includes('PROCESO')) return 'En proceso';
    if (clean.includes('COMPLETA')) return 'Completada';
    if (clean.includes('PENDIENTE')) return 'Pendiente';
    if (clean.includes('EVALUACION')) return 'En evaluación';
    if (clean.includes('SUBSANACION')) return 'Subsanación';
    return estado;
  }

  // --- Filtering Getter ---
  get filteredEvaluaciones(): any[] {
    return this.propuestas.filter(p => {
      // 1. Search Query
      if (this.filters.search) {
        const query = this.filters.search.toLowerCase();
        const matchesSearch = 
          (p.proveedor && p.proveedor.toLowerCase().includes(query)) ||
          (p.licitacionTitulo && p.licitacionTitulo.toLowerCase().includes(query)) ||
          (p.id && p.id.toString().includes(query)) ||
          (p.area && p.area.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      // 2. Licitación Select
      if (this.filters.licitacion && p.licitacionTitulo !== this.filters.licitacion) {
        return false;
      }

      // 3. Participante Select
      if (this.filters.participante && p.proveedor !== this.filters.participante) {
        return false;
      }

      // 4. Estado Select
      if (this.filters.estado && p.estadoEvaluacion !== this.filters.estado) {
        return false;
      }

      // 5. Evaluador Select
      if (this.filters.evaluador) {
        const evalName = this.getEvaluatorName(p.id);
        if (evalName !== this.filters.evaluador) return false;
      }

      return true;
    });
  }

  get uniqueLicitaciones(): string[] {
    const set = new Set<string>();
    this.propuestas.forEach(p => {
      if (p.licitacionTitulo) set.add(p.licitacionTitulo);
    });
    return Array.from(set.values());
  }

  get uniqueParticipantes(): string[] {
    const set = new Set<string>();
    this.propuestas.forEach(p => {
      if (p.proveedor) set.add(p.proveedor);
    });
    return Array.from(set.values());
  }

  get uniqueEvaluadores(): string[] {
    const set = new Set<string>();
    this.propuestas.forEach(p => {
      set.add(this.getEvaluatorName(p.id));
    });
    return Array.from(set.values());
  }

  clearFilters(): void {
    this.filters = {
      search: '',
      licitacion: '',
      participante: '',
      estado: '',
      evaluador: '',
      fecha: ''
    };
  }

  onFilter(): void {}

  // --- Dynamic Stats calculation ---
  get kpiStats() {
    const total = this.propuestas.length;
    const finalizadas = this.propuestas.filter(p => p.estadoEvaluacion === 'FINALIZADO').length;
    const pendientes = this.propuestas.filter(p => p.estadoEvaluacion === 'PENDIENTE' || !p.estadoEvaluacion).length;
    const enProceso = this.propuestas.filter(p => {
      // En proceso = tiene al menos un evaluador con FINALIZADO pero no todos
      return p.progreso > 0 && p.progreso < 100;
    }).length;
    const sinAsignar = this.propuestas.filter(p => !p.evaluadores || p.evaluadores.length === 0).length;

    const pctFinalizadas = total > 0 ? (finalizadas / total * 100).toFixed(1) : '0';
    const pctPendientes = total > 0 ? (pendientes / total * 100).toFixed(1) : '0';
    const pctEnProceso = total > 0 ? (enProceso / total * 100).toFixed(1) : '0';
    const pctSinAsignar = total > 0 ? (sinAsignar / total * 100).toFixed(1) : '0';

    return {
      total,
      enProceso,
      pctProceso: pctEnProceso,
      completadas: finalizadas,
      pctCompletadas: pctFinalizadas,
      pendientes,
      pctPendientes,
      subsanacion: sinAsignar,
      pctSubsanacion: pctSinAsignar,
      adjudicadas: finalizadas
    };
  }

  // --- SVG Donut Circle Stroke Math ---
  get StrokeDashArrayEnProceso(): string {
    const stats = this.kpiStats;
    if (stats.total === 0) return '0 100';
    const pct = (stats.enProceso / stats.total) * 100;
    return `${pct} ${100 - pct}`;
  }

  get StrokeDashArrayCompletadas(): string {
    const stats = this.kpiStats;
    if (stats.total === 0) return '0 100';
    const pct = (stats.completadas / stats.total) * 100;
    return `${pct} ${100 - pct}`;
  }

  get StrokeDashArrayPendientes(): string {
    const stats = this.kpiStats;
    if (stats.total === 0) return '0 100';
    const pct = (stats.pendientes / stats.total) * 100;
    return `${pct} ${100 - pct}`;
  }

  get StrokeDashArraySubsanacion(): string {
    const stats = this.kpiStats;
    if (stats.total === 0) return '0 100';
    const pct = (stats.subsanacion / stats.total) * 100;
    return `${pct} ${100 - pct}`;
  }

  get StrokeDashOffsetEnProceso(): number {
    return 25; // start top
  }

  get StrokeDashOffsetCompletadas(): number {
    const stats = this.kpiStats;
    if (stats.total === 0) return 25;
    const pPct = (stats.enProceso / stats.total) * 100;
    return 125 - pPct;
  }

  get StrokeDashOffsetPendientes(): number {
    const stats = this.kpiStats;
    if (stats.total === 0) return 25;
    const pPct = (stats.enProceso / stats.total) * 100;
    const cPct = (stats.completadas / stats.total) * 100;
    return 125 - pPct - cPct;
  }

  get StrokeDashOffsetSubsanacion(): number {
    const stats = this.kpiStats;
    if (stats.total === 0) return 25;
    const pPct = (stats.enProceso / stats.total) * 100;
    const cPct = (stats.completadas / stats.total) * 100;
    const pePct = (stats.pendientes / stats.total) * 100;
    return 125 - pPct - cPct - pePct;
  }

  get evaluacionesPorLicitacion(): any[] {
    const counts: { [key: string]: { title: string, code: string, count: number } } = {};
    this.propuestas.forEach((p, idx) => {
      if (p.licitacionTitulo) {
        const title = p.licitacionTitulo;
        if (!counts[title]) {
          counts[title] = {
            title: title,
            code: `LP-2026-${String(idx + 8).padStart(3, '0')}`,
            count: 0
          };
        }
        counts[title].count++;
      }
    });
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
  }

  getRelativeTime(dateStr: string | Date): string {
    if (!dateStr) return 'Hace unos momentos';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Hace unos momentos';
    if (diffMins < 60) return `Hace ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `Hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
  }

  get ultimasActividades(): any[] {
    const sorted = [...this.propuestas].sort((a, b) => b.id - a.id);
    return sorted.map((p) => {
      let actionTitle = 'Nueva propuesta asignada';
      let actionClass = 'received';
      let timeStr = this.getRelativeTime(p.fechaEnvio);

      if (p.estadoEvaluacion === 'Completada') {
        actionTitle = 'Evaluación completada';
        actionClass = 'awarded';
      } else if (p.estadoEvaluacion === 'Subsanación') {
        actionTitle = 'Subsanación solicitada';
        actionClass = 'rejected';
      } else if (p.estadoEvaluacion === 'En proceso') {
        actionTitle = 'Evaluación iniciada';
        actionClass = 'evaluating';
      }

      return {
        title: actionTitle,
        class: actionClass,
        empresa: p.proveedor || 'Proveedor N/A',
        licitacionCode: `LP-2026-${String(p.id + 8).padStart(3, '0')}`,
        time: timeStr
      };
    }).slice(0, 5);
  }

  // --- Acciones Rápidas ---
  nuevaEvaluacion(): void {
    Swal.fire({
      title: 'Nueva Evaluación',
      text: 'Para crear una nueva evaluación, debe asignar una propuesta desde el listado de licitaciones públicas.',
      icon: 'info',
      confirmButtonText: 'Ir a Licitaciones',
      confirmButtonColor: '#3b82f6',
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      background: '#ffffff',
      color: '#1e293b'
    });
  }

  isPropuestaGanadoraOrAdjudicada(p: any): boolean {
    if (!p) return false;
    
    const checkVal = (val: any): string => {
      if (!val) return '';
      if (typeof val === 'string') return val.trim().toUpperCase();
      if (typeof val === 'object') {
        return String(val.nombre || val.name || val.estado || val.value || '').trim().toUpperCase();
      }
      return String(val).trim().toUpperCase();
    };

    const status = checkVal(p.estado);
    const statusProp = checkVal(p.estadoPropuesta);
    const statusEval = checkVal(p.estadoEvaluacion);
    
    const isWinnerStr = 
      status === 'GANADORA' || status === 'ADJUDICADA' || 
      statusProp === 'GANADORA' || statusProp === 'ADJUDICADA' ||
      statusEval === 'GANADORA' || statusEval === 'ADJUDICADA';

    const isLicitacionWinner = 
      p.licitacion?.propuestaGanadora?.id === p.id || 
      (p.licitacion?.estado?.toUpperCase() === 'ADJUDICADA' && p.licitacion?.propuestaGanadoraId === p.id);
    
    return isWinnerStr || !!isLicitacionWinner;
  }

  asignarEvaluadores(): void {
    this.propuestaService.getAll().subscribe({
      next: (propuestas) => {
        // Filter out proposals with status 'GANADORA' or 'ADJUDICADA'
        propuestas = propuestas ? propuestas.filter((p: any) => !this.isPropuestaGanadoraOrAdjudicada(p)) : [];

        if (!propuestas || propuestas.length === 0) {
          Swal.fire({
            title: 'Sin Propuestas',
            text: 'No hay propuestas registradas en el sistema.',
            icon: 'info',
            background: '#ffffff',
            color: '#1e293b',
            confirmButtonColor: '#3b82f6'
          });
          return;
        }

        let selectedPropuestaId: any = null;
        let selectedLicitacionId: any = null;

        Swal.fire({
          title: 'Asignar Evaluadores',
          html: `
            <style>
              .swal-lic-container {
                text-align: left;
                padding: 10px 5px;
              }
              .swal-search-box {
                width: 100%;
                padding: 12px 15px;
                background: #f8fafc;
                border: 1px solid #cbd5e1;
                border-radius: 8px;
                color: #0f172a;
                font-size: 0.9rem;
                margin-bottom: 15px;
                outline: none;
                transition: border-color 0.15s ease;
              }
              .swal-search-box:focus {
                border-color: #3b82f6;
              }
              .swal-lic-grid {
                display: flex;
                flex-direction: column;
                gap: 10px;
                max-height: 320px;
                overflow-y: auto;
                padding-right: 5px;
              }
              /* Scrollbar custom */
              .swal-lic-grid::-webkit-scrollbar {
                width: 5px;
              }
              .swal-lic-grid::-webkit-scrollbar-track {
                background: #ffffff;
              }
              .swal-lic-grid::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 99px;
              }
              .swal-lic-card {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                padding: 12px 15px;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                flex-direction: column;
                gap: 6px;
              }
              .swal-lic-card:hover {
                background: #f8fafc;
                border-color: #3b82f6;
                transform: translateY(-2px);
              }
              .swal-lic-card.active-card {
                background: rgba(59, 130, 246, 0.08);
                border-color: #3b82f6;
                box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
              }
              .swal-lic-code {
                font-size: 0.75rem;
                font-weight: 800;
                color: #3b82f6;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                display: flex;
                justify-content: space-between;
                align-items: center;
              }
              .swal-lic-title {
                font-size: 0.92rem;
                font-weight: 700;
                color: #0f172a;
                line-height: 1.3;
              }
              .swal-lic-subtitle {
                font-size: 0.8rem;
                color: #475569;
                font-style: italic;
                margin-top: -2px;
              }
              .swal-lic-meta {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 0.75rem;
                color: #64748b;
                margin-top: 4px;
                border-top: 1px solid #f1f5f9;
                padding-top: 6px;
              }
              .swal-status-badge {
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 0.7rem;
                font-weight: 700;
                text-transform: uppercase;
              }
              .swal-status-badge.validada {
                background: rgba(16, 185, 129, 0.15);
                color: #10b981;
              }
              .swal-status-badge.enviada {
                background: rgba(59, 130, 246, 0.15);
                color: #3b82f6;
              }
              .swal-status-badge.otro {
                background: rgba(148, 163, 184, 0.15);
                color: #475569;
              }
            </style>
            <div class="swal-lic-container">
              <p class="text-sm text-gray-400 mb-3" style="font-size: 14px; opacity: 0.8; margin-bottom: 12px; color: #475569;">Seleccione una propuesta recibida de la lista para calificar o administrar evaluadores:</p>
              <input type="text" id="swal-lic-search" class="swal-search-box" placeholder="Buscar por código, proveedor o licitación..." />
              <div id="swal-lic-grid" class="swal-lic-grid">
                ${propuestas.map((p: any) => {
                  const stateClass = p.estado?.toLowerCase() === 'validada' ? 'validada' : (p.estado?.toLowerCase() === 'enviada' ? 'enviada' : 'otro');
                  return `
                    <div class="swal-lic-card" data-id="${p.id}" data-lic-id="${p.licitacion?.id}">
                      <div class="swal-lic-code">
                        <span>PRP-2026-${String(p.id).padStart(3, '0')}</span>
                        <span class="swal-status-badge ${stateClass}">${p.estado || 'ENVIADA'}</span>
                      </div>
                      <span class="swal-lic-title">${p.empresaNombre || 'N/A'}</span>
                      <span class="swal-lic-subtitle">Licitación: ${p.licitacion?.titulo || 'General'}</span>
                      <div class="swal-lic-meta">
                        <span>Monto: $ ${p.montoOfertado ? p.montoOfertado.toLocaleString('es-ES', { minimumFractionDigits: 2 }) : '0.00'} ${p.moneda || 'USD'}</span>
                        <span>Área: ${p.licitacion?.area?.nombre || 'General'}</span>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `,
          width: '550px',
          background: '#ffffff',
          color: '#1e293b',
          showCancelButton: true,
          confirmButtonText: 'Continuar',
          cancelButtonText: 'Cancelar',
          confirmButtonColor: '#3b82f6',
          cancelButtonColor: '#475569',
          didOpen: () => {
            const searchInput = document.getElementById('swal-lic-search') as HTMLInputElement;
            const grid = document.getElementById('swal-lic-grid') as HTMLElement;
            const cards = Array.from(grid.querySelectorAll('.swal-lic-card')) as HTMLElement[];

            if (searchInput) {
              searchInput.addEventListener('input', (e) => {
                const term = (e.target as HTMLInputElement).value.toLowerCase();
                cards.forEach(card => {
                  const title = card.querySelector('.swal-lic-title')?.textContent?.toLowerCase() || '';
                  const subtitle = card.querySelector('.swal-lic-subtitle')?.textContent?.toLowerCase() || '';
                  const code = card.querySelector('.swal-lic-code')?.textContent?.toLowerCase() || '';
                  const meta = card.querySelector('.swal-lic-meta')?.textContent?.toLowerCase() || '';
                  if (title.includes(term) || subtitle.includes(term) || code.includes(term) || meta.includes(term)) {
                    card.style.display = 'flex';
                  } else {
                    card.style.display = 'none';
                  }
                });
              });
            }

            cards.forEach(card => {
              card.addEventListener('click', () => {
                cards.forEach(c => c.classList.remove('active-card'));
                card.classList.add('active-card');
                selectedPropuestaId = card.getAttribute('data-id');
                selectedLicitacionId = card.getAttribute('data-lic-id');
              });
              
              card.addEventListener('dblclick', () => {
                cards.forEach(c => c.classList.remove('active-card'));
                card.classList.add('active-card');
                selectedPropuestaId = card.getAttribute('data-id');
                selectedLicitacionId = card.getAttribute('data-lic-id');
                Swal.clickConfirm();
              });
            });
          },
          preConfirm: () => {
            if (!selectedPropuestaId) {
              Swal.showValidationMessage('Por favor seleccione una propuesta de la lista');
              return false;
            }
            return { propuestaId: selectedPropuestaId, licitacionId: selectedLicitacionId };
          }
        }).then((result) => {
          if (result.isConfirmed && result.value) {
            const { propuestaId, licitacionId } = result.value;
            Swal.fire({
              title: '¿Qué acción desea realizar?',
              text: 'Puede iniciar/continuar la evaluación de esta propuesta o gestionar los evaluadores del sistema:',
              icon: 'info',
              showCancelButton: true,
              showDenyButton: true,
              confirmButtonText: 'Calificar Propuesta',
              denyButtonText: 'Gestionar Evaluadores',
              cancelButtonText: 'Ver Todas las Propuestas',
              confirmButtonColor: '#10b981',
              denyButtonColor: '#3b82f6',
              cancelButtonColor: '#64748b',
              background: '#ffffff',
              color: '#1e293b'
            }).then((choice) => {
              if (choice.isConfirmed) {
                this.router.navigate(['/evaluaciones/evaluar', propuestaId]);
              } else if (choice.isDenied) {
                this.abrirModalEvaluadores(propuestaId);
              } else if (choice.dismiss === Swal.DismissReason.cancel) {
                this.router.navigate(['/evaluaciones', licitacionId]);
              }
            });
          }
        });
      },
      error: (err) => {
        console.error(err);
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron cargar las propuestas.',
          icon: 'error',
          background: '#ffffff',
          color: '#1e293b',
          confirmButtonColor: '#ef4444'
        });
      }
    });
  }

  criteriosEvaluacion(): void {
    this.propuestaService.getAll().subscribe({
      next: (propuestas) => {
        // Filter out proposals with status 'GANADORA' or 'ADJUDICADA'
        propuestas = propuestas ? propuestas.filter((p: any) => !this.isPropuestaGanadoraOrAdjudicada(p)) : [];

        if (!propuestas || propuestas.length === 0) {
          Swal.fire({
            title: 'Sin Propuestas',
            text: 'No hay propuestas registradas en el sistema.',
            icon: 'info',
            background: '#ffffff',
            color: '#1e293b',
            confirmButtonColor: '#3b82f6'
          });
          return;
        }
        
        let selectedPropuestaId: any = null;
        let selectedLicitacionId: any = null;

        Swal.fire({
          title: 'Configurar Rúbricas',
          html: `
            <style>
              .swal-lic-container {
                text-align: left;
                padding: 10px 5px;
              }
              .swal-search-box {
                width: 100%;
                padding: 12px 15px;
                background: #f8fafc;
                border: 1px solid #cbd5e1;
                border-radius: 8px;
                color: #0f172a;
                font-size: 0.9rem;
                margin-bottom: 15px;
                outline: none;
                transition: border-color 0.15s ease;
              }
              .swal-search-box:focus {
                border-color: #10b981;
              }
              .swal-lic-grid {
                display: flex;
                flex-direction: column;
                gap: 10px;
                max-height: 320px;
                overflow-y: auto;
                padding-right: 5px;
              }
              /* Scrollbar custom */
              .swal-lic-grid::-webkit-scrollbar {
                width: 5px;
              }
              .swal-lic-grid::-webkit-scrollbar-track {
                background: #ffffff;
              }
              .swal-lic-grid::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 99px;
              }
              .swal-lic-card {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                padding: 12px 15px;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                flex-direction: column;
                gap: 6px;
              }
              .swal-lic-card:hover {
                background: #f8fafc;
                border-color: #10b981;
                transform: translateY(-2px);
              }
              .swal-lic-card.active-card {
                background: rgba(16, 185, 129, 0.08);
                border-color: #10b981;
                box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
              }
              .swal-lic-code {
                font-size: 0.75rem;
                font-weight: 800;
                color: #10b981;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                display: flex;
                justify-content: space-between;
                align-items: center;
              }
              .swal-lic-title {
                font-size: 0.92rem;
                font-weight: 700;
                color: #0f172a;
                line-height: 1.3;
              }
              .swal-lic-subtitle {
                font-size: 0.8rem;
                color: #475569;
                font-style: italic;
                margin-top: -2px;
              }
              .swal-lic-meta {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 0.75rem;
                color: #64748b;
                margin-top: 4px;
                border-top: 1px solid #f1f5f9;
                padding-top: 6px;
              }
              .swal-status-badge {
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 0.7rem;
                font-weight: 700;
                text-transform: uppercase;
              }
              .swal-status-badge.validada {
                background: rgba(16, 185, 129, 0.15);
                color: #10b981;
              }
              .swal-status-badge.enviada {
                background: rgba(59, 130, 246, 0.15);
                color: #3b82f6;
              }
              .swal-status-badge.otro {
                background: rgba(148, 163, 184, 0.15);
                color: #475569;
              }
            </style>
            <div class="swal-lic-container">
              <p class="text-sm text-gray-400 mb-3" style="font-size: 14px; opacity: 0.8; margin-bottom: 12px; color: #475569;">Seleccione la propuesta para definir o editar sus pesos y rúbricas técnicas en la licitación:</p>
              <input type="text" id="swal-lic-search" class="swal-search-box" placeholder="Buscar por código, proveedor o licitación..." />
              <div id="swal-lic-grid" class="swal-lic-grid">
                ${propuestas.map((p: any) => {
                  const stateClass = p.estado?.toLowerCase() === 'validada' ? 'validada' : (p.estado?.toLowerCase() === 'enviada' ? 'enviada' : 'otro');
                  return `
                    <div class="swal-lic-card" data-id="${p.id}" data-lic-id="${p.licitacion?.id}">
                      <div class="swal-lic-code">
                        <span>PRP-2026-${String(p.id).padStart(3, '0')}</span>
                        <span class="swal-status-badge ${stateClass}">${p.estado || 'ENVIADA'}</span>
                      </div>
                      <span class="swal-lic-title">${p.empresaNombre || 'N/A'}</span>
                      <span class="swal-lic-subtitle">Licitación: ${p.licitacion?.titulo || 'General'}</span>
                      <div class="swal-lic-meta">
                        <span>Monto: $ ${p.montoOfertado ? p.montoOfertado.toLocaleString('es-ES', { minimumFractionDigits: 2 }) : '0.00'} ${p.moneda || 'USD'}</span>
                        <span>Área: ${p.licitacion?.area?.nombre || 'General'}</span>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `,
          width: '550px',
          background: '#ffffff',
          color: '#1e293b',
          showCancelButton: true,
          confirmButtonText: 'Configurar Rúbrica',
          cancelButtonText: 'Cancelar',
          confirmButtonColor: '#10b981',
          cancelButtonColor: '#475569',
          didOpen: () => {
            const searchInput = document.getElementById('swal-lic-search') as HTMLInputElement;
            const grid = document.getElementById('swal-lic-grid') as HTMLElement;
            const cards = Array.from(grid.querySelectorAll('.swal-lic-card')) as HTMLElement[];

            if (searchInput) {
              searchInput.addEventListener('input', (e) => {
                const term = (e.target as HTMLInputElement).value.toLowerCase();
                cards.forEach(card => {
                  const title = card.querySelector('.swal-lic-title')?.textContent?.toLowerCase() || '';
                  const subtitle = card.querySelector('.swal-lic-subtitle')?.textContent?.toLowerCase() || '';
                  const code = card.querySelector('.swal-lic-code')?.textContent?.toLowerCase() || '';
                  const meta = card.querySelector('.swal-lic-meta')?.textContent?.toLowerCase() || '';
                  if (title.includes(term) || subtitle.includes(term) || code.includes(term) || meta.includes(term)) {
                    card.style.display = 'flex';
                  } else {
                    card.style.display = 'none';
                  }
                });
              });
            }

            cards.forEach(card => {
              card.addEventListener('click', () => {
                cards.forEach(c => c.classList.remove('active-card'));
                card.classList.add('active-card');
                selectedPropuestaId = card.getAttribute('data-id');
                selectedLicitacionId = card.getAttribute('data-lic-id');
              });
              
              card.addEventListener('dblclick', () => {
                cards.forEach(c => c.classList.remove('active-card'));
                card.classList.add('active-card');
                selectedPropuestaId = card.getAttribute('data-id');
                selectedLicitacionId = card.getAttribute('data-lic-id');
                Swal.clickConfirm();
              });
            });
          },
          preConfirm: () => {
            if (!selectedLicitacionId) {
              Swal.showValidationMessage('Por favor seleccione una propuesta de la lista');
              return false;
            }
            return selectedLicitacionId;
          }
        }).then((result) => {
          if (result.isConfirmed && result.value) {
            const licId = result.value;
            this.router.navigate(['/evaluaciones/rubrica', licId]);
          }
        });
      },
      error: (err) => {
        console.error(err);
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron cargar las propuestas.',
          icon: 'error',
          background: '#ffffff',
          color: '#1e293b',
          confirmButtonColor: '#ef4444'
        });
      }
    });
  }

  generarReporte(): void {
    Swal.fire({
      title: 'Generar Reporte Técnico',
      text: 'Seleccione la acción que desea realizar con el consolidado técnico de las evaluaciones:',
      icon: 'question',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Ver Panel de Reportes',
      denyButtonText: 'Exportar CSV Comparativo',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3b82f6',
      denyButtonColor: '#10b981',
      cancelButtonColor: '#64748b',
      background: '#ffffff',
      color: '#1e293b'
    }).then((result) => {
      if (result.isConfirmed) {
        this.router.navigate(['/reportes']);
      } else if (result.isDenied) {
        // Generate and download dynamic CSV from real this.propuestas
        if (this.propuestas.length === 0) {
          Swal.fire({
            title: 'Sin Datos',
            text: 'No hay evaluaciones disponibles para exportar en este momento.',
            icon: 'warning',
            background: '#ffffff',
            color: '#1e293b',
            confirmButtonColor: '#d97706'
          });
          return;
        }

        let csvContent = '\uFEFF'; // UTF-8 BOM
        csvContent += 'ID Evaluacion,Licitacion,Proveedor,Area,Puntaje,Progreso (%),Estado,Fecha Inicio,Fecha Limite\n';

        this.propuestas.forEach((p) => {
          const id = `EVAL-2026-${String(p.id).padStart(3, '0')}`;
          const lic = p.licitacionTitulo ? `"${p.licitacionTitulo.replace(/"/g, '""')}"` : 'N/A';
          const prov = p.proveedor ? `"${p.proveedor.replace(/"/g, '""')}"` : 'N/A';
          const area = p.area ? `"${p.area.replace(/"/g, '""')}"` : 'N/A';
          const score = p.puntajeTotal !== null && p.puntajeTotal !== undefined ? p.puntajeTotal : 'Sin evaluar';
          const prog = p.progreso || 0;
          const status = p.estadoEvaluacion || 'PENDIENTE';
          const start = this.getFechaInicio(p).date + ' ' + this.getFechaInicio(p).time;
          const limit = this.getFechaLimite(p).date;

          csvContent += `${id},${lic},${prov},${area},${score},${prog},${status},${start},${limit}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reporte-consolidado-evaluaciones-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);

        Swal.fire({
          title: '¡Reporte Generado!',
          text: 'El archivo CSV ha sido generado y descargado con los datos de las evaluaciones activas.',
          icon: 'success',
          background: '#ffffff',
          color: '#1e293b',
          confirmButtonColor: '#10b981'
        });
      }
    });
  }

  descargarFichaTecnica(propuestaId: number): void {
    Swal.fire({
      title: 'Generando PDF',
      text: 'Por favor espere mientras se genera la Ficha Técnica...',
      allowOutsideClick: false,
      background: '#ffffff',
      color: '#1e293b',
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.evaluacionService.downloadResumenPdf(propuestaId).subscribe({
      next: (blob) => {
        Swal.close();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ficha-tecnica-propuesta-${propuestaId}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        Swal.close();
        console.error('Error al descargar la ficha técnica', err);
        Swal.fire({
          title: 'Error de Descarga',
          text: 'No se pudo descargar la ficha técnica de la propuesta. Por favor intente de nuevo.',
          icon: 'error',
          background: '#ffffff',
          color: '#1e293b',
          confirmButtonColor: '#ef4444'
        });
      }
    });
  }

  verEvaluadoresPropuesta(p: any): void {
    Swal.fire({
      title: 'Cargando evaluadores...',
      html: '<div class="premium-spinner" style="margin: 20px auto;"></div>',
      showConfirmButton: false,
      allowOutsideClick: false,
      background: '#ffffff',
      color: '#1e293b',
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.evaluacionService.getTodasEvaluacionesPropuesta(p.id).subscribe({
      next: (evaluaciones) => {
        Swal.close();
        
        if (!evaluaciones || evaluaciones.length === 0) {
          Swal.fire({
            title: 'Sin Evaluaciones',
            text: 'Aún no se han registrado evaluaciones ni evaluadores asignados para esta propuesta.',
            icon: 'info',
            background: '#ffffff',
            color: '#1e293b',
            confirmButtonColor: '#3b82f6'
          });
          return;
        }

        // Parse list of evaluators
        const evaluadoresHtml = evaluaciones.map((e: any) => {
          const ev = e.evaluador || {};
          const nombre = `${ev.nombre || ''} ${ev.apellido || ''}`.trim() || ev.username || 'Evaluador Anónimo';
          
          // Role mapping logic
          let rolLabel = 'Comité Técnico';
          let rolClass = 'evaluador';
          if (ev.roles && ev.roles.length > 0) {
            const rName = ev.roles[0].name || ev.roles[0];
            if (rName.includes('ADMIN')) {
              rolLabel = 'Administrador';
              rolClass = 'admin';
            } else if (rName.includes('AUDIT')) {
              rolLabel = 'Auditor';
              rolClass = 'auditor';
            } else if (rName.includes('AUTORIDAD')) {
              rolLabel = 'Autoridad';
              rolClass = 'autoridad';
            } else if (rName.includes('OBSERVADOR')) {
              rolLabel = 'Observador';
              rolClass = 'observador';
            } else if (rName.includes('EVALUADOR')) {
              rolLabel = 'Evaluador';
              rolClass = 'evaluador';
            }
          }

          // Status & Star count mapping
          const stars = e.estrellas || 0;
          const starsHtml = '★'.repeat(stars) + '☆'.repeat(5 - stars);
          
          let statusBadge = '';
          if (e.estadoTramite === 'FINALIZADO') {
            if (e.resultado === 'APROBADO') {
              statusBadge = `<span class="status-badge approved">Aprobado (${e.puntajeTotal}/50 pts)</span>`;
            } else {
              statusBadge = `<span class="status-badge rejected">Rechazado (${e.puntajeTotal}/50 pts)</span>`;
            }
          } else {
            statusBadge = `<span class="status-badge draft">Borrador / En evaluación</span>`;
          }

          return `
            <div class="swal-evaluator-card">
              <div class="swal-evaluator-header">
                <div class="avatar-circle">${nombre.charAt(0).toUpperCase()}</div>
                <div class="eval-meta">
                  <span class="eval-name">${nombre}</span>
                  <span class="eval-role-badge ${rolClass}">${rolLabel.toUpperCase()}</span>
                </div>
                <div class="eval-status-info">
                  ${statusBadge}
                </div>
              </div>
              <div class="swal-evaluator-body">
                <div class="eval-stars">${starsHtml}</div>
                <div class="eval-details">
                  ${e.comentarios ? `<p class="eval-comment"><strong>Comentarios:</strong> "${e.comentarios}"</p>` : ''}
                  ${e.observaciones ? `<p class="eval-obs"><strong>Observaciones:</strong> "${e.observaciones}"</p>` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('');

        // Approvals calculation
        const completedEvals = evaluaciones.filter((e: any) => e.estadoTramite === 'FINALIZADO');
        const approvedEvals = completedEvals.filter((e: any) => e.resultado === 'APROBADO');
        
        let approvalSummaryHtml = '';
        if (completedEvals.length === 0) {
          approvalSummaryHtml = `<div class="approval-alert info">La propuesta está en evaluación y aún no ha sido aprobada por ningún evaluador.</div>`;
        } else {
          const approvedCount = approvedEvals.length;
          if (approvedCount === 0) {
            approvalSummaryHtml = `<div class="approval-alert danger">La propuesta ha sido RECHAZADA por los evaluadores en sus calificaciones finalizadas.</div>`;
          } else if (approvedCount === 1) {
            const apprName = `${approvedEvals[0].evaluador?.nombre || ''} ${approvedEvals[0].evaluador?.apellido || ''}`.trim() || approvedEvals[0].evaluador?.username;
            approvalSummaryHtml = `<div class="approval-alert success">Aprobada por <strong>1 evaluador</strong>: ${apprName}</div>`;
          } else {
            approvalSummaryHtml = `<div class="approval-alert success">¡Aprobada por consenso de <strong>${approvedCount} evaluadores</strong>!</div>`;
          }
        }

        Swal.fire({
          title: `Evaluadores & Calificaciones`,
          html: `
            <style>
              .swal-evaluators-container {
                max-height: 400px;
                overflow-y: auto;
                padding: 10px 5px;
                display: flex;
                flex-direction: column;
                gap: 15px;
                text-align: left;
              }
              .swal-evaluators-container::-webkit-scrollbar {
                width: 5px;
              }
              .swal-evaluators-container::-webkit-scrollbar-track {
                background: #ffffff;
              }
              .swal-evaluators-container::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 99px;
              }
              .swal-evaluator-card {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 15px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
              }
              .swal-evaluator-header {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 10px;
                border-bottom: 1px solid #f1f5f9;
                padding-bottom: 10px;
              }
              .avatar-circle {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                color: #fff;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 800;
                font-size: 1.1rem;
              }
              .eval-meta {
                display: flex;
                flex-direction: column;
                flex-grow: 1;
              }
              .eval-name {
                color: #0f172a;
                font-weight: 700;
                font-size: 0.95rem;
              }
              .eval-role-badge {
                font-size: 0.65rem;
                font-weight: 800;
                padding: 2px 6px;
                border-radius: 4px;
                width: fit-content;
                margin-top: 3px;
              }
              .eval-role-badge.admin { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; border: 1px solid rgba(139, 92, 246, 0.2); }
              .eval-role-badge.auditor { background: rgba(20, 184, 166, 0.1); color: #0d9488; border: 1px solid rgba(20, 184, 166, 0.2); }
              .eval-role-badge.autoridad { background: rgba(244, 63, 94, 0.1); color: #e11d48; border: 1px solid rgba(244, 63, 94, 0.2); }
              .eval-role-badge.observador { background: rgba(100, 116, 139, 0.1); color: #475569; border: 1px solid rgba(100, 116, 139, 0.2); }
              .eval-role-badge.evaluador { background: rgba(59, 130, 246, 0.1); color: #2563eb; border: 1px solid rgba(59, 130, 246, 0.2); }
              
              .status-badge {
                font-size: 0.72rem;
                font-weight: 700;
                padding: 4px 8px;
                border-radius: 9999px;
              }
              .status-badge.approved { background: #d1fae5; color: #065f46; }
              .status-badge.rejected { background: #fee2e2; color: #991b1b; }
              .status-badge.draft { background: #fef3c7; color: #92400e; }
 
              .eval-stars {
                color: #fbbf24;
                font-size: 1.1rem;
                margin-bottom: 8px;
                letter-spacing: 2px;
              }
              .eval-comment, .eval-obs {
                font-size: 0.8rem;
                color: #475569;
                margin: 4px 0;
                font-style: italic;
              }
              .approval-alert {
                padding: 12px;
                border-radius: 8px;
                font-size: 0.88rem;
                margin-bottom: 15px;
                border-left: 4px solid;
              }
              .approval-alert.success { background: rgba(16, 185, 129, 0.08); border-color: #10b981; color: #065f46; }
              .approval-alert.danger { background: rgba(239, 68, 68, 0.08); border-color: #ef4444; color: #991b1b; }
              .approval-alert.info { background: rgba(59, 130, 246, 0.08); border-color: #3b82f6; color: #1e3a8a; }
            </style>
            <div class="text-left mb-4" style="text-align: left; margin-bottom: 15px;">
              <h4 style="color: #475569; font-size: 0.85rem; margin: 0 0 5px 0; font-weight: 700; text-transform: uppercase;">Propuesta</h4>
              <p style="color: #0f172a; font-size: 1.1rem; font-weight: 800; margin: 0;">${p.proveedor || 'N/A'}</p>
              <p style="color: #64748b; font-size: 0.8rem; margin: 2px 0 0 0;">Licitación: ${p.licitacionTitulo}</p>
            </div>
            ${approvalSummaryHtml}
            <div class="swal-evaluators-container">
              ${evaluadoresHtml}
            </div>
          `,
          width: '550px',
          background: '#ffffff',
          color: '#1e293b',
          confirmButtonText: 'Cerrar',
          confirmButtonColor: '#3b82f6'
        });
      },
      error: (err) => {
        Swal.close();
        console.error('Error al obtener evaluaciones de la propuesta', err);
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron obtener las calificaciones de los evaluadores.',
          icon: 'error',
          background: '#ffffff',
          color: '#1e293b',
          confirmButtonColor: '#ef4444'
        });
      }
    });
  }

  getStatusClass(estado: string): string {
    if (!estado) return 'pendiente';
    return estado.toLowerCase().replace(' ', '-').replace('ó', 'o');
  }

  getSwalRoleLabel(roles: any[]): { label: string, class: string } {
    if (!roles || roles.length === 0) return { label: 'Usuario', class: 'observador' };
    const firstRole = roles[0];
    const role = (typeof firstRole === 'string' ? firstRole : (firstRole.name || '')).toUpperCase();
    if (role.includes('ADMIN')) return { label: 'Administrador', class: 'admin' };
    if (role.includes('EVALUADOR')) return { label: 'Comité Evaluador', class: 'evaluador' };
    if (role.includes('AUDITOR')) return { label: 'Auditor', class: 'auditor' };
    if (role.includes('AUTORIDAD')) return { label: 'Autoridad', class: 'autoridad' };
    if (role.includes('SOLICITANTE') || role.includes('GESTOR') || role.includes('AREA_SOLICITANTE')) return { label: 'Gestor (Área Solicitante)', class: 'otro' };
    if (role.includes('PROVEEDOR')) return { label: 'Proveedor', class: 'observador' };
    if (role.includes('OBSERVADOR')) return { label: 'Observador', class: 'observador' };
    return { label: 'Usuario', class: 'observador' };
  }

  abrirModalEvaluadores(propuestaId: any): void {
    Swal.fire({
      title: 'Cargando Directorio...',
      html: '<div class="premium-spinner" style="margin: 20px auto;"></div>',
      background: '#ffffff',
      color: '#1e293b',
      showConfirmButton: false,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // 1. Fetch all assigned evaluations for this proposal to see who has evaluated it/is assigned
    this.evaluacionService.getTodasEvaluacionesPropuesta(propuestaId).subscribe({
      next: (evaluaciones) => {
        // Extract assigned evaluator IDs
        const assignedIds = new Set<number>();
        evaluaciones.forEach((e: any) => {
          if (e.evaluador && e.evaluador.id) {
            assignedIds.add(e.evaluador.id);
          }
        });

        // 2. Fetch all users from the directory
        this.usuarioService.getAll('', 0, 1000).subscribe({
          next: (data) => {
            Swal.close();
            const users = data.content || data || [];

            const evaluadores = users.filter((u: any) =>
              u.roles && u.roles.some((r: any) => {
                const rName = (typeof r === 'string' ? r : (r.name || '')).toUpperCase();
                return rName.includes('EVALUADOR');
              })
            );
            const otros = users.filter((u: any) =>
              !u.roles || !u.roles.some((r: any) => {
                const rName = (typeof r === 'string' ? r : (r.name || '')).toUpperCase();
                return rName.includes('EVALUADOR');
              })
            );

            const renderUserCard = (u: any) => {
              const nombre = `${u.nombre || ''} ${u.apellido || ''}`.trim() || u.username || 'Usuario';
              const email = u.email || 'Sin correo';
              const rInfo = this.getSwalRoleLabel(u.roles);
              const avatarLetter = nombre ? nombre.charAt(0).toUpperCase() : 'U';
              const avatarClass = rInfo.class === 'admin' ? 'admin' : (rInfo.class === 'evaluador' ? 'evaluador' : 'otro');
              const isAssigned = assignedIds.has(u.id);

              return `
                <div class="swal-eval-user-card ${isAssigned ? 'assigned-card' : ''}" data-user-id="${u.id}" data-search="${nombre.toLowerCase()} ${email.toLowerCase()} ${rInfo.label.toLowerCase()}">
                  <div class="swal-eval-avatar ${avatarClass}">${avatarLetter}</div>
                  <div class="swal-eval-user-info">
                    <span class="swal-eval-user-name">${nombre}</span>
                    <span class="swal-eval-user-email">${email}</span>
                  </div>
                  <div class="swal-eval-actions" style="display: flex; align-items: center; gap: 12px;">
                    <span class="swal-eval-role-badge ${rInfo.class}">${rInfo.label}</span>
                    <label class="premium-switch" style="position: relative; display: inline-block; width: 40px; height: 20px; margin: 0; cursor: pointer;">
                      <input type="checkbox" class="swal-eval-toggle" data-user-id="${u.id}" ${isAssigned ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;" />
                      <span class="premium-slider round"></span>
                    </label>
                  </div>
                </div>
              `;
            };

            const evaluadoresHtml = evaluadores.length > 0 
              ? evaluadores.map(renderUserCard).join('')
              : '<p style="color:#94a3b8; font-size:0.85rem; padding: 10px;">No hay evaluadores registrados.</p>';

            const otrosHtml = otros.length > 0
              ? otros.map(renderUserCard).join('')
              : '<p style="color:#94a3b8; font-size:0.85rem; padding: 10px;">No hay otros usuarios registrados.</p>';

            Swal.fire({
              title: 'Directorio de Evaluadores y Usuarios',
              html: `
                <style>
                  .swal-eval-dir-container {
                    text-align: left;
                    padding: 10px 5px;
                    font-family: 'Inter', system-ui, -apple-system, sans-serif;
                  }
                  .swal-eval-search {
                    width: 100%;
                    padding: 12px 15px;
                    background: #f8fafc;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    color: #0f172a;
                    font-size: 0.9rem;
                    margin-bottom: 15px;
                    outline: none;
                    transition: border-color 0.15s ease;
                  }
                  .swal-eval-search:focus {
                    border-color: #3b82f6;
                  }
                  .swal-eval-section-title {
                    font-size: 0.75rem;
                    font-weight: 800;
                    color: #3b82f6;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-bottom: 10px;
                    margin-top: 20px;
                    border-bottom: 1px solid #e2e8f0;
                    padding-bottom: 4px;
                  }
                  .swal-eval-section-title.otros {
                    color: #475569;
                  }
                  .swal-eval-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    max-height: 200px;
                    overflow-y: auto;
                    padding-right: 5px;
                  }
                  /* Scrollbar custom */
                  .swal-eval-list::-webkit-scrollbar {
                    width: 5px;
                  }
                  .swal-eval-list::-webkit-scrollbar-track {
                    background: #ffffff;
                  }
                  .swal-eval-list::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 99px;
                  }
                  .swal-eval-user-card {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    padding: 10px 12px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    transition: all 0.2s ease;
                  }
                  .swal-eval-user-card:hover {
                    background: #f8fafc;
                    border-color: #3b82f6;
                    transform: translateY(-1px);
                  }
                  .swal-eval-user-card.assigned-card {
                    background: rgba(16, 185, 129, 0.04);
                    border-color: #10b981;
                  }
                  .swal-eval-avatar {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    color: #fff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 800;
                    font-size: 0.95rem;
                  }
                  .swal-eval-avatar.evaluador {
                    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                  }
                  .swal-eval-avatar.admin {
                    background: linear-gradient(135deg, #f43f5e, #ec4899);
                  }
                  .swal-eval-avatar.otro {
                    background: linear-gradient(135deg, #10b981, #14b8a6);
                  }
                  .swal-eval-user-info {
                    display: flex;
                    flex-direction: column;
                    flex-grow: 1;
                  }
                  .swal-eval-user-name {
                    font-size: 0.88rem;
                    font-weight: 700;
                    color: #0f172a;
                  }
                  .swal-eval-user-email {
                    font-size: 0.75rem;
                    color: #475569;
                  }
                  .swal-eval-role-badge {
                    font-size: 0.65rem;
                    font-weight: 800;
                    padding: 2px 8px;
                    border-radius: 4px;
                    text-transform: uppercase;
                  }
                  .swal-eval-role-badge.evaluador { background: rgba(59, 130, 246, 0.1); color: #2563eb; border: 1px solid rgba(59, 130, 246, 0.2); }
                  .swal-eval-role-badge.admin { background: rgba(244, 63, 94, 0.1); color: #e11d48; border: 1px solid rgba(244, 63, 94, 0.2); }
                  .swal-eval-role-badge.auditor { background: rgba(20, 184, 166, 0.1); color: #0d9488; border: 1px solid rgba(20, 184, 166, 0.2); }
                  .swal-eval-role-badge.observador { background: rgba(100, 116, 139, 0.1); color: #475569; border: 1px solid rgba(100, 116, 139, 0.2); }
                  .swal-eval-role-badge.autoridad { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; border: 1px solid rgba(139, 92, 246, 0.2); }

                  /* Premium Switch Styling */
                  .premium-switch {
                    position: relative;
                    display: inline-block;
                    width: 40px;
                    height: 20px;
                  }
                  .premium-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                  }
                  .premium-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #cbd5e1;
                    transition: .3s;
                  }
                  .premium-slider:before {
                    position: absolute;
                    content: "";
                    height: 14px;
                    width: 14px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: .3s;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.15);
                  }
                  input:checked + .premium-slider {
                    background-color: #10b981;
                  }
                  input:checked + .premium-slider:before {
                    transform: translateX(20px);
                  }
                  .premium-slider.round {
                    border-radius: 20px;
                  }
                  .premium-slider.round:before {
                    border-radius: 50%;
                  }
                </style>
                <div class="swal-eval-dir-container">
                  <input type="text" id="swal-eval-search" class="swal-eval-search" placeholder="Buscar por nombre, correo o rol..." />
                  
                  <div class="swal-eval-section-title">EVALUADORES</div>
                  <div id="swal-evaluadores-list" class="swal-eval-list">
                    ${evaluadoresHtml}
                  </div>
 
                  <div class="swal-eval-section-title otros">GESTORES Y OTROS ROLES</div>
                  <div id="swal-otros-list" class="swal-eval-list">
                    ${otrosHtml}
                  </div>
                </div>
              `,
              width: '550px',
              background: '#ffffff',
              color: '#1e293b',
              confirmButtonText: 'Cerrar',
              confirmButtonColor: '#3b82f6',
              didOpen: () => {
                const searchInput = document.getElementById('swal-eval-search') as HTMLInputElement;
                const userCards = Array.from(document.querySelectorAll('.swal-eval-user-card')) as HTMLElement[];

                if (searchInput) {
                  searchInput.addEventListener('input', (e) => {
                    const term = (e.target as HTMLInputElement).value.toLowerCase();
                    userCards.forEach(card => {
                      const searchVal = card.getAttribute('data-search') || '';
                      if (searchVal.includes(term)) {
                        card.style.display = 'flex';
                      } else {
                        card.style.display = 'none';
                      }
                    });
                  });
                }

                // Add change listeners to each toggle switch
                const toggles = Array.from(document.querySelectorAll('.swal-eval-toggle')) as HTMLInputElement[];
                toggles.forEach(toggle => {
                  toggle.addEventListener('change', () => {
                    const uIdStr = toggle.getAttribute('data-user-id');
                    if (!uIdStr) return;
                    const uId = parseInt(uIdStr, 10);
                    const isChecked = toggle.checked;

                    toggle.disabled = true;
                    const card = toggle.closest('.swal-eval-user-card') as HTMLElement;
                    if (card) {
                      card.style.opacity = '0.6';
                    }

                    if (isChecked) {
                      this.evaluacionService.asignarEvaluador(propuestaId, uId).subscribe({
                        next: () => {
                          toggle.disabled = false;
                          if (card) {
                            card.style.opacity = '1';
                            card.classList.add('assigned-card');
                          }
                          const Toast = Swal.mixin({
                            toast: true,
                            position: 'top-end',
                            showConfirmButton: false,
                            timer: 2000,
                            timerProgressBar: true
                          });
                          Toast.fire({
                            icon: 'success',
                            title: 'Usuario asignado como evaluador'
                          });
                        },
                        error: (err: any) => {
                          toggle.disabled = false;
                          toggle.checked = false;
                          if (card) {
                            card.style.opacity = '1';
                            card.classList.remove('assigned-card');
                          }
                          const errMsg = err.error?.message || 'No se pudo asignar el evaluador.';
                          Swal.fire({
                            title: 'Error de Asignación',
                            text: errMsg,
                            icon: 'error',
                            confirmButtonColor: '#ef4444'
                          });
                        }
                      });
                    } else {
                      this.evaluacionService.desasignarEvaluador(propuestaId, uId).subscribe({
                        next: () => {
                          toggle.disabled = false;
                          if (card) {
                            card.style.opacity = '1';
                            card.classList.remove('assigned-card');
                          }
                          const Toast = Swal.mixin({
                            toast: true,
                            position: 'top-end',
                            showConfirmButton: false,
                            timer: 2000,
                            timerProgressBar: true
                          });
                          Toast.fire({
                            icon: 'success',
                            title: 'Usuario desasignado de la evaluación'
                          });
                        },
                        error: (err: any) => {
                          toggle.disabled = false;
                          toggle.checked = true;
                          if (card) {
                            card.style.opacity = '1';
                            card.classList.add('assigned-card');
                          }
                          const errMsg = err.error?.message || 'No se pudo desasignar el evaluador.';
                          Swal.fire({
                            title: 'Error de Desasignación',
                            text: errMsg,
                            icon: 'error',
                            confirmButtonColor: '#ef4444'
                          });
                        }
                      });
                    }
                  });
                });
              }
            }).then(() => {
              // Reload list on close to reflect any assignments changed
              this.loadMisEvaluaciones();
            });
          },
          error: (err) => {
            Swal.close();
            console.error(err);
            Swal.fire({
              title: 'Error',
              text: 'No se pudieron cargar los evaluadores del sistema.',
              icon: 'error',
              background: '#ffffff',
              color: '#1e293b',
              confirmButtonColor: '#ef4444'
            });
          }
        });
      },
      error: (err) => {
        Swal.close();
        console.error(err);
        Swal.fire({
          title: 'Error',
          text: 'No se pudo verificar el estado de asignación de la propuesta.',
          icon: 'error',
          background: '#ffffff',
          color: '#1e293b',
          confirmButtonColor: '#ef4444'
        });
      }
    });
  }
}
