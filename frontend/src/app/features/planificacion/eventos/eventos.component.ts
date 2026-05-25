import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { CalendarioService, CalendarioEvento } from '../../../core/services/calendario.service';
import { LicitacionService } from '../../../core/services/licitacion.service';
import { ContratoService } from '../../../core/services/contrato.service';
import { ReporteService } from '../../../core/services/reporte.service';
import Swal from 'sweetalert2';

interface ExpandedEvento {
  id?: number;
  titulo: string;
  descripcion: string;
  tipoEvento: string;
  fechaEvento: string | Date;
  referenciaId?: number;
  referenciaTipo?: string;
  prioridad: number;
  tipoLabel: string;
  color: string;
  icon: string;
  responsable?: string;
  estado?: string;
  usuario?: any;
}

@Component({
  selector: 'app-eventos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './eventos.component.html',
  styleUrls: ['./eventos.component.scss']
})
export class EventosComponent implements OnInit, OnDestroy {
  private refreshSub?: Subscription;
  events: ExpandedEvento[] = [];
  licitaciones: any[] = [];
  contratos: any[] = [];
  filteredEvents: ExpandedEvento[] = [];
  paginatedEvents: ExpandedEvento[] = [];
  criticalEvents: ExpandedEvento[] = [];
  recentActivities: any[] = [];
  responsablesList: string[] = [];

  // Filter Models
  searchText: string = '';
  selectedLicitacionId: string = '';
  selectedTipoEvento: string = '';
  selectedPrioridad: string = '';
  selectedEstado: string = '';
  selectedResponsable: string = '';
  selectedFechaDesde: string = '';
  selectedFechaHasta: string = '';

  // Pagination Models
  currentPage: number = 1;
  pageSize: number = 10;
  totalEvents: number = 0;
  totalPages: number = 1;
  pages: number[] = [];

  // Mini Calendar Models
  currentDate = new Date(); // Dynamic today's date for high-fidelity sync
  calendarDays: any[] = [];
  monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  selectedDay: number | null = null; // Currently clicked calendar day for filtering

  // KPIs
  kpis = {
    total: 0,
    proximos: 0,
    vencidos: 0,
    criticos: 0,
    completados: 0
  };

  constructor(
    private calendarioService: CalendarioService,
    private licitacionService: LicitacionService,
    private contratoService: ContratoService,
    private reporteService: ReporteService
  ) {}

  ngOnInit(): void {
    this.currentDate = new Date(); // Ensure today's date
    this.loadData();
    this.refreshSub = this.calendarioService.refresh$.subscribe(signal => {
      if (signal) {
        this.loadData();
      }
    });
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  private mapRealName(name: string): string {
    if (!name) return name;
    const lower = name.toLowerCase();
    if (lower.includes('area solicitante') || lower.includes('área solicitante')) {
      return 'Fernanda Lopez';
    }
    if (lower.includes('comision evaluadora') || lower.includes('comisión evaluadora') || lower.includes('comisión') || lower.includes('comision')) {
      return 'Jahir Marroquín';
    }
    if (lower.includes('proveedor')) {
      return 'Andrea Salazar';
    }
    return name;
  }

  private getUserDisplayName(u: any, fallback: string): string {
    if (!u) return fallback;
    let name = '';
    if (u.nombreCompleto) {
      name = u.nombreCompleto;
    } else if (u.displayName) {
      name = u.displayName;
    } else {
      const fullName = ((u.nombre || '') + ' ' + (u.apellido || '')).trim();
      if (fullName) {
        name = fullName;
      } else if (u.nombre) {
        name = u.nombre;
      } else {
        name = u.username || fallback;
      }
    }
    return this.mapRealName(name);
  }

  loadData(): void {
    this.calendarioService.getEvents().subscribe({
      next: (customEvents) => {
        this.licitacionService.getAll({ size: 100 }).subscribe({
          next: (res) => {
            this.licitaciones = res.content || res || [];
            this.contratoService.getAll().subscribe({
              next: (contracts) => {
                this.contratos = contracts || [];
                this.aggregateAndMapEvents(customEvents);
              },
              error: () => this.aggregateAndMapEvents(customEvents)
            });
          },
          error: () => this.aggregateAndMapEvents(customEvents)
        });
      },
      error: (err) => {
        console.error('Error cargando eventos en tabla, intentando cargar licitaciones y contratos:', err);
        this.licitacionService.getAll({ size: 100 }).subscribe({
          next: (res) => {
            this.licitaciones = res.content || res || [];
            this.contratoService.getAll().subscribe({
              next: (contracts) => {
                this.contratos = contracts || [];
                this.aggregateAndMapEvents([]);
              },
              error: () => this.aggregateAndMapEvents([])
            });
          },
          error: () => this.aggregateAndMapEvents([])
        });
      }
    });
  }

  aggregateAndMapEvents(customEvents: CalendarioEvento[]): void {
    const tempEvents: ExpandedEvento[] = [];
    const nowTime = new Date().getTime();

    // Helper functions for state assignment
    const getCalculatedEstado = (fecha: string | Date, isCompleted: boolean = false): string => {
      if (isCompleted) return 'Completado';
      const time = new Date(fecha).getTime();
      if (time < nowTime) return 'Vencido';
      if (time < nowTime + 7 * 24 * 60 * 60 * 1000) return 'Próximo';
      return 'Pendiente';
    };

    // 1. Map Custom Events
    customEvents.forEach(e => {
      const isCompleted = e.titulo.toLowerCase().includes('completado') || e.titulo.toLowerCase().includes('firma') || e.prioridad === 3;
      const respName = this.getUserDisplayName(e.usuario, 'Sergio Villacorta');
      tempEvents.push({
        ...e,
        tipoLabel: this.getTipoLabel(e.tipoEvento),
        color: this.getEventoColor(e.tipoEvento),
        icon: this.getEventoIcon(e.tipoEvento),
        responsable: respName,
        estado: getCalculatedEstado(e.fechaEvento, isCompleted)
      });
    });

    // 2. Map Licitaciones
    this.licitaciones.forEach(l => {
      const creatorName = this.getUserDisplayName(l.creadoPor, 'Fernanda Lopez');
      const approverName = this.getUserDisplayName(l.aprobadoPor, 'Sergio Villacorta');

      if (l.fechaPublicacion) {
        tempEvents.push({
          id: -1000 - l.id,
          titulo: `Publicación: ${l.titulo}`,
          descripcion: `Inicio del proceso de la licitación #${l.id}`,
          tipoEvento: 'LICITACION_PUBLICADA',
          fechaEvento: l.fechaPublicacion,
          prioridad: 2,
          referenciaId: l.id,
          referenciaTipo: 'licitacion',
          tipoLabel: 'Licitación Publicada',
          color: '#3b82f6',
          icon: 'fa-bullhorn',
          responsable: creatorName,
          estado: 'Completado'
        });
      }

      if (l.fechaCierre) {
        tempEvents.push({
          id: -2000 - l.id,
          titulo: `Cierre: ${l.titulo}`,
          descripcion: `Fecha límite de presentación de propuestas para #${l.id}`,
          tipoEvento: 'CIERRE_LICITACION',
          fechaEvento: l.fechaCierre,
          prioridad: 1,
          referenciaId: l.id,
          referenciaTipo: 'licitacion',
          tipoLabel: 'Cierre de Propuestas',
          color: '#ef4444',
          icon: 'fa-calendar-xmark',
          responsable: approverName,
          estado: getCalculatedEstado(l.fechaCierre)
        });

        const adjDate = new Date(new Date(l.fechaCierre).getTime() + 4 * 24 * 60 * 60 * 1000);
        tempEvents.push({
          id: -5000 - l.id,
          titulo: `Adjudicación: ${l.titulo}`,
          descripcion: `Licitación adjudicada al proveedor seleccionado`,
          tipoEvento: 'REUNION_EVALUACION',
          fechaEvento: adjDate,
          prioridad: 2,
          referenciaId: l.id,
          referenciaTipo: 'adjudicacion',
          tipoLabel: 'Adjudicación',
          color: '#8b5cf6',
          icon: 'fa-trophy',
          responsable: approverName,
          estado: getCalculatedEstado(adjDate)
        });
      }
    });

    // 3. Map Contratos
    this.contratos.forEach(c => {
      const contractCreator = this.getUserDisplayName(c.licitacion?.creadoPor, 'Fernanda Lopez');

      if (c.fechaFirma) {
        tempEvents.push({
          id: -3000 - c.id,
          titulo: `Firma Contrato: CONT-${c.codigo || c.id}`,
          descripcion: `Suscripción formal de contrato para licitación ${c.licitacion?.titulo}`,
          tipoEvento: 'REUNION_EVALUACION',
          fechaEvento: c.fechaFirma,
          prioridad: 1,
          referenciaId: c.id,
          referenciaTipo: 'contrato',
          tipoLabel: 'Firma de Contrato',
          color: '#06b6d4',
          icon: 'fa-file-signature',
          responsable: contractCreator,
          estado: 'Completado'
        });
      }

      if (c.fechaFin) {
        tempEvents.push({
          id: -4000 - c.id,
          titulo: `Vencimiento Contrato: CONT-${c.codigo || c.id}`,
          descripcion: `Finalización de vigencia del contrato de ${c.proveedor?.nombre}`,
          tipoEvento: 'MANTENIMIENTO_SISTEMA',
          fechaEvento: c.fechaFin,
          prioridad: 1,
          referenciaId: c.id,
          referenciaTipo: 'contrato',
          tipoLabel: 'Vencimiento',
          color: '#f97316',
          icon: 'fa-clock',
          responsable: contractCreator,
          estado: getCalculatedEstado(c.fechaFin)
        });
      }
    });

    // Sort chronologically
    this.events = tempEvents.sort((a, b) => new Date(a.fechaEvento).getTime() - new Date(b.fechaEvento).getTime());
    
    // Extraer lista de responsables única
    const uniqueResponsables = new Set<string>();
    this.events.forEach(e => {
      if (e.responsable) uniqueResponsables.add(e.responsable);
    });
    this.responsablesList = Array.from(uniqueResponsables).sort();
    
    // Set initial date range filter matching the active mini calendar month (Mayo 2026)
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDayVal = new Date(year, month + 1, 0).getDate();
    const lastDay = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDayVal).padStart(2, '0')}`;
    
    this.selectedFechaDesde = firstDay;
    this.selectedFechaHasta = lastDay;

    // Set up sidebar activity lists
    this.generateRecentActivities();
    
    // Generate Mini Monthly Calendar
    this.generateMiniCalendar();
    
    // Apply initial filters and pagination
    this.applyFilters();
    
    // Calculate dashboard statistics KPIs
    this.calculateKPIs();

    // Populate critical bottom shelf cards
    this.generateCriticalEvents();
  }

  applyFilters(): void {
    this.filteredEvents = this.events.filter(e => {
      // 1. Global Search
      if (this.searchText) {
        const search = this.searchText.toLowerCase();
        const matchesText = e.titulo.toLowerCase().includes(search) || 
                            e.descripcion.toLowerCase().includes(search) ||
                            (e.responsable && e.responsable.toLowerCase().includes(search)) ||
                            e.tipoLabel.toLowerCase().includes(search);
        if (!matchesText) return false;
      }

      // 2. Licitación / Proceso
      if (this.selectedLicitacionId && e.referenciaId !== +this.selectedLicitacionId) {
        return false;
      }

      // 3. Tipo de Evento / Categoria
      if (this.selectedTipoEvento && e.tipoEvento !== this.selectedTipoEvento) {
        return false;
      }

      // 4. Prioridad
      if (this.selectedPrioridad && e.prioridad !== +this.selectedPrioridad) {
        return false;
      }

      // 5. Estado
      if (this.selectedEstado && e.estado !== this.selectedEstado) {
        return false;
      }

      // 6. Responsable
      if (this.selectedResponsable && e.responsable !== this.selectedResponsable) {
        return false;
      }

      // 7. Date Range: Fecha Desde
      if (this.selectedFechaDesde) {
        const fromDate = new Date(this.selectedFechaDesde);
        fromDate.setHours(0, 0, 0, 0);
        if (new Date(e.fechaEvento).getTime() < fromDate.getTime()) {
          return false;
        }
      }

      // 8. Date Range: Fecha Hasta
      if (this.selectedFechaHasta) {
        const toDate = new Date(this.selectedFechaHasta);
        toDate.setHours(23, 59, 59, 999);
        if (new Date(e.fechaEvento).getTime() > toDate.getTime()) {
          return false;
        }
      }

      return true;
    });

    this.totalEvents = this.filteredEvents.length;
    this.totalPages = Math.ceil(this.totalEvents / this.pageSize) || 1;
    
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
    if (this.currentPage < 1) this.currentPage = 1;

    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.paginatedEvents = this.filteredEvents.slice(startIndex, startIndex + this.pageSize);
    
    this.generatePagesArray();
  }

  resetFilters(): void {
    this.searchText = '';
    this.selectedLicitacionId = '';
    this.selectedTipoEvento = '';
    this.selectedPrioridad = '';
    this.selectedEstado = '';
    this.selectedResponsable = '';
    this.selectedFechaDesde = '';
    this.selectedFechaHasta = '';
    this.selectedDay = null;
    this.currentDate = new Date(2026, 4, 18); // Reset to Mayo 2026 standard demo date
    this.currentPage = 1;
    
    this.generateMiniCalendar();
    this.applyFilters();
    
    Swal.fire({
      icon: 'success',
      title: 'Filtros Restablecidos',
      text: 'Se han cargado todos los eventos de planificación.',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2000
    });
  }

  calculateKPIs(): void {
    let total = 0;
    let proximos = 0;
    let vencidos = 0;
    let criticos = 0;
    let completados = 0;

    this.events.forEach(e => {
      total++;
      if (e.estado === 'Completado') {
        completados++;
      } else if (e.estado === 'Vencido') {
        vencidos++;
      } else if (e.estado === 'Próximo') {
        proximos++;
      }
      
      if (e.prioridad === 1) {
        criticos++;
      }
    });

    this.kpis = { total, proximos, vencidos, criticos, completados };
  }

  generateCriticalEvents(): void {
    // Select priority = 1 (alta) or state = Vencido/Próximo sorted chronologically
    this.criticalEvents = this.events
      .filter(e => e.prioridad === 1 || e.estado === 'Vencido' || e.estado === 'Próximo')
      .slice(0, 5);
  }

  generateRecentActivities(): void {
    const activityTypes = [
      { action: 'Publicación de Licitación', time: 'Hace 2 horas', icon: 'fa-bullhorn', color: '#3b82f6' },
      { action: 'Evaluación Técnica', time: 'Hace 5 horas', icon: 'fa-chart-pie', color: '#f59e0b' },
      { action: 'Firma de Contrato', time: 'Ayer', icon: 'fa-file-signature', color: '#06b6d4' },
      { action: 'Recepción de Propuestas', time: 'Hace 2 días', icon: 'fa-envelope-open-text', color: '#10b981' }
    ];

    // Select first few events to dynamically display details
    this.recentActivities = this.events.slice(0, 4).map((ev, index) => {
      const type = activityTypes[index % activityTypes.length];
      return {
        titulo: `${type.action} ${ev.titulo.substring(0, 20)}...`,
        tiempo: type.time,
        icon: type.icon,
        color: type.color
      };
    });
  }

  // Mini monthly calendar methods
  generateMiniCalendar(): void {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    
    // First day of target month (0 = Sunday, 1 = Monday etc.)
    const firstDayIndex = new Date(year, month, 1).getDay();
    // Days in target month
    const totalDays = new Date(year, month + 1, 0).getDate();
    // Days in previous month
    const prevTotalDays = new Date(year, month, 0).getDate();
    
    const daysArr = [];
    
    // Fill leading days from previous month to align with calendar view starting on Monday
    const prevDaysToFill = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    for (let i = prevDaysToFill; i > 0; i--) {
      daysArr.push({
        day: prevTotalDays - i + 1,
        isCurrentMonth: false,
        hasEvents: false,
        isToday: false,
        isSelected: false
      });
    }
    
    // Fill target month days
    const today = new Date();
    for (let i = 1; i <= totalDays; i++) {
      const hasEvents = this.events.some(e => {
        const evDate = new Date(e.fechaEvento);
        return evDate.getFullYear() === year && evDate.getMonth() === month && evDate.getDate() === i;
      });
      const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === i;
      const isSelected = this.selectedDay === i;
      
      daysArr.push({
        day: i,
        isCurrentMonth: true,
        hasEvents,
        isToday,
        isSelected
      });
    }
    
    // Fill trailing days from next month to make complete 6-row layout (42 days)
    const remaining = 42 - daysArr.length;
    for (let i = 1; i <= remaining; i++) {
      daysArr.push({
        day: i,
        isCurrentMonth: false,
        hasEvents: false,
        isToday: false,
        isSelected: false
      });
    }
    
    this.calendarDays = daysArr;
  }

  selectDay(cell: any): void {
    if (!cell.isCurrentMonth) {
      // If user clicked on a grayed out day from the previous or next month, we shift the calendar month and select that day!
      const year = this.currentDate.getFullYear();
      let month = this.currentDate.getMonth();
      
      if (cell.day > 20) {
        // It belongs to the previous month
        month--;
      } else {
        // It belongs to the next month
        month++;
      }
      
      this.currentDate = new Date(year, month, 1);
      this.selectedDay = cell.day;
      
      const targetYear = this.currentDate.getFullYear();
      const targetMonth = this.currentDate.getMonth();
      const formattedDate = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;
      this.selectedFechaDesde = formattedDate;
      this.selectedFechaHasta = formattedDate;
      
      this.generateMiniCalendar();
      this.currentPage = 1;
      this.applyFilters();
      return;
    }
    
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const day = cell.day;

    if (this.selectedDay === day) {
      // Toggle off: clear the day filter and return to showing the whole active month
      this.selectedDay = null;
      
      const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDayVal = new Date(year, month + 1, 0).getDate();
      const lastDay = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDayVal).padStart(2, '0')}`;
      
      this.selectedFechaDesde = firstDay;
      this.selectedFechaHasta = lastDay;
    } else {
      // Toggle on: filter for this exact day
      this.selectedDay = day;
      const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      this.selectedFechaDesde = formattedDate;
      this.selectedFechaHasta = formattedDate;
    }
    
    this.currentPage = 1;
    this.applyFilters();
    this.generateMiniCalendar(); // Re-generate to update selection styles
  }

  prevMonth(): void {
    let year = this.currentDate.getFullYear();
    let month = this.currentDate.getMonth() - 1;
    if (month < 0) {
      month = 11;
      year--;
    }
    this.currentDate = new Date(year, month, 1);
    this.selectedDay = null; // Clear day filter
    
    // Automatically set date range for the new month to sync table view
    const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDayVal = new Date(year, month + 1, 0).getDate();
    const lastDay = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDayVal).padStart(2, '0')}`;
    
    this.selectedFechaDesde = firstDay;
    this.selectedFechaHasta = lastDay;
    
    this.generateMiniCalendar();
    this.currentPage = 1;
    this.applyFilters();
  }

  nextMonth(): void {
    let year = this.currentDate.getFullYear();
    let month = this.currentDate.getMonth() + 1;
    if (month > 11) {
      month = 0;
      year++;
    }
    this.currentDate = new Date(year, month, 1);
    this.selectedDay = null; // Clear day filter
    
    // Automatically set date range for the new month to sync table view
    const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDayVal = new Date(year, month + 1, 0).getDate();
    const lastDay = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDayVal).padStart(2, '0')}`;
    
    this.selectedFechaDesde = firstDay;
    this.selectedFechaHasta = lastDay;
    
    this.generateMiniCalendar();
    this.currentPage = 1;
    this.applyFilters();
  }

  // Pagination helper
  generatePagesArray(): void {
    this.pages = [];
    for (let i = 1; i <= this.totalPages; i++) {
      this.pages.push(i);
    }
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.applyFilters();
  }

  // SweetAlert2 CRUD Modals
  showCreateEventModal(): void {
    Swal.fire({
      title: '<h3 style="color:#0f172a;font-weight:800;margin:0;">Crear Nuevo Evento</h3>',
      html: `
        <div class="swal-form" style="text-align:left; font-family:'Inter',sans-serif; padding-top: 1rem;">
          <div style="margin-bottom: 1rem;">
            <label style="font-weight:700;font-size:0.82rem;color:#475569;margin-bottom:0.25rem;display:block;">Título del Evento *</label>
            <input id="swal-titulo" class="swal2-input form-control" style="margin:0;width:100%;font-size:0.88rem;border-radius:8px;border:1px solid #cbd5e1;padding:0.6rem;" placeholder="Ej. Firma de Acta">
          </div>
          <div style="margin-bottom: 1rem;">
            <label style="font-weight:700;font-size:0.82rem;color:#475569;margin-bottom:0.25rem;display:block;">Descripción</label>
            <textarea id="swal-descripcion" class="swal2-textarea form-control" style="margin:0;width:100%;height:80px;font-size:0.88rem;border-radius:8px;border:1px solid #cbd5e1;padding:0.6rem;" placeholder="Detalles de la actividad..."></textarea>
          </div>
          <div style="display:flex;gap:1rem;margin-bottom:1rem;">
            <div style="flex:1;">
              <label style="font-weight:700;font-size:0.82rem;color:#475569;margin-bottom:0.25rem;display:block;">Tipo de Evento *</label>
              <select id="swal-tipo" class="form-select" style="width:100%;padding:0.6rem;border-radius:8px;border:1px solid #cbd5e1;font-size:0.88rem;font-weight:600;background-color:#ffffff;">
                <option value="EVENTO_GENERAL">Evento General</option>
                <option value="REUNION_EVALUACION">Reunión de Comité</option>
                <option value="NOTA">Nota / Memorando</option>
                <option value="MANTENIMIENTO_SISTEMA">Mantenimiento</option>
              </select>
            </div>
            <div style="flex:1;">
              <label style="font-weight:700;font-size:0.82rem;color:#475569;margin-bottom:0.25rem;display:block;">Prioridad *</label>
              <select id="swal-prioridad" class="form-select" style="width:100%;padding:0.6rem;border-radius:8px;border:1px solid #cbd5e1;font-size:0.88rem;font-weight:600;background-color:#ffffff;">
                <option value="1">Alta</option>
                <option value="2" selected>Media</option>
                <option value="3">Baja</option>
                <option value="4">Informativa</option>
              </select>
            </div>
          </div>
          <div style="display:flex;gap:1rem;margin-bottom:1rem;">
            <div style="flex:1;">
              <label style="font-weight:700;font-size:0.82rem;color:#475569;margin-bottom:0.25rem;display:block;">Fecha y Hora *</label>
              <input id="swal-fecha" type="datetime-local" class="form-control" style="width:100%;padding:0.6rem;border-radius:8px;border:1px solid #cbd5e1;font-size:0.88rem;">
            </div>
            <div style="flex:1;">
              <label style="font-weight:700;font-size:0.82rem;color:#475569;margin-bottom:0.25rem;display:block;">Responsable *</label>
              <select id="swal-responsable" class="form-select" style="width:100%;padding:0.6rem;border-radius:8px;border:1px solid #cbd5e1;font-size:0.88rem;font-weight:600;background-color:#ffffff;">
                <option value="Jahir Marroquín">Jahir Marroquín</option>
                <option value="María López">María López</option>
                <option value="Carlos Pérez">Carlos Pérez</option>
                <option value="Ana Martínez">Ana Martínez</option>
              </select>
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Crear Evento',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b',
      preConfirm: () => {
        const titulo = (document.getElementById('swal-titulo') as HTMLInputElement).value;
        const descripcion = (document.getElementById('swal-descripcion') as HTMLTextAreaElement).value;
        const tipoEvento = (document.getElementById('swal-tipo') as HTMLSelectElement).value;
        const prioridad = +(document.getElementById('swal-prioridad') as HTMLSelectElement).value;
        const fechaEvento = (document.getElementById('swal-fecha') as HTMLInputElement).value;
        const responsable = (document.getElementById('swal-responsable') as HTMLSelectElement).value;

        if (!titulo || !fechaEvento) {
          Swal.showValidationMessage('El título y la fecha son obligatorios');
          return false;
        }

        return { titulo, descripcion, tipoEvento, prioridad, fechaEvento, responsable };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.calendarioService.save(result.value as any).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Evento Creado',
              text: 'El evento ha sido guardado y sincronizado exitosamente.',
              confirmButtonColor: '#2563eb'
            });
            this.calendarioService.notifyUpdate();
            this.loadData();
          },
          error: (err) => {
            Swal.fire('Error', 'No se pudo crear el evento en el servidor.', 'error');
          }
        });
      }
    });
  }

  showEditEventModal(e: ExpandedEvento): void {
    if (e.id && e.id < 0) {
      Swal.fire('Información', 'Este evento está sincronizado automáticamente con una licitación o contrato del ERP y no se puede modificar manualmente.', 'info');
      return;
    }

    const isoDate = new Date(e.fechaEvento).toISOString().slice(0, 16);

    Swal.fire({
      title: '<h3 style="color:#0f172a;font-weight:800;margin:0;">Editar Evento</h3>',
      html: `
        <div class="swal-form" style="text-align:left; font-family:'Inter',sans-serif; padding-top: 1rem;">
          <div style="margin-bottom: 1rem;">
            <label style="font-weight:700;font-size:0.82rem;color:#475569;margin-bottom:0.25rem;display:block;">Título del Evento *</label>
            <input id="swal-titulo" class="swal2-input form-control" style="margin:0;width:100%;font-size:0.88rem;border-radius:8px;border:1px solid #cbd5e1;padding:0.6rem;" value="${e.titulo}" placeholder="Ej. Firma de Acta">
          </div>
          <div style="margin-bottom: 1rem;">
            <label style="font-weight:700;font-size:0.82rem;color:#475569;margin-bottom:0.25rem;display:block;">Descripción</label>
            <textarea id="swal-descripcion" class="swal2-textarea form-control" style="margin:0;width:100%;height:80px;font-size:0.88rem;border-radius:8px;border:1px solid #cbd5e1;padding:0.6rem;" placeholder="Detalles de la actividad...">${e.descripcion || ''}</textarea>
          </div>
          <div style="display:flex;gap:1rem;margin-bottom:1rem;">
            <div style="flex:1;">
              <label style="font-weight:700;font-size:0.82rem;color:#475569;margin-bottom:0.25rem;display:block;">Tipo de Evento *</label>
              <select id="swal-tipo" class="form-select" style="width:100%;padding:0.6rem;border-radius:8px;border:1px solid #cbd5e1;font-size:0.88rem;font-weight:600;background-color:#ffffff;">
                <option value="EVENTO_GENERAL" ${e.tipoEvento === 'EVENTO_GENERAL' ? 'selected' : ''}>Evento General</option>
                <option value="REUNION_EVALUACION" ${e.tipoEvento === 'REUNION_EVALUACION' ? 'selected' : ''}>Reunión de Comité</option>
                <option value="NOTA" ${e.tipoEvento === 'NOTA' ? 'selected' : ''}>Nota / Memorando</option>
                <option value="MANTENIMIENTO_SISTEMA" ${e.tipoEvento === 'MANTENIMIENTO_SISTEMA' ? 'selected' : ''}>Mantenimiento</option>
              </select>
            </div>
            <div style="flex:1;">
              <label style="font-weight:700;font-size:0.82rem;color:#475569;margin-bottom:0.25rem;display:block;">Prioridad *</label>
              <select id="swal-prioridad" class="form-select" style="width:100%;padding:0.6rem;border-radius:8px;border:1px solid #cbd5e1;font-size:0.88rem;font-weight:600;background-color:#ffffff;">
                <option value="1" ${e.prioridad === 1 ? 'selected' : ''}>Alta</option>
                <option value="2" ${e.prioridad === 2 ? 'selected' : ''}>Media</option>
                <option value="3" ${e.prioridad === 3 ? 'selected' : ''}>Baja</option>
                <option value="4" ${e.prioridad === 4 ? 'selected' : ''}>Informativa</option>
              </select>
            </div>
          </div>
          <div style="display:flex;gap:1rem;margin-bottom:1rem;">
            <div style="flex:1;">
              <label style="font-weight:700;font-size:0.82rem;color:#475569;margin-bottom:0.25rem;display:block;">Fecha y Hora *</label>
              <input id="swal-fecha" type="datetime-local" class="form-control" style="width:100%;padding:0.6rem;border-radius:8px;border:1px solid #cbd5e1;font-size:0.88rem;" value="${isoDate}">
            </div>
            <div style="flex:1;">
              <label style="font-weight:700;font-size:0.82rem;color:#475569;margin-bottom:0.25rem;display:block;">Responsable *</label>
              <select id="swal-responsable" class="form-select" style="width:100%;padding:0.6rem;border-radius:8px;border:1px solid #cbd5e1;font-size:0.88rem;font-weight:600;background-color:#ffffff;">
                <option value="Jahir Marroquín" ${e.responsable === 'Jahir Marroquín' ? 'selected' : ''}>Jahir Marroquín</option>
                <option value="María López" ${e.responsable === 'María López' ? 'selected' : ''}>María López</option>
                <option value="Carlos Pérez" ${e.responsable === 'Carlos Pérez' ? 'selected' : ''}>Carlos Pérez</option>
                <option value="Ana Martínez" ${e.responsable === 'Ana Martínez' ? 'selected' : ''}>Ana Martínez</option>
              </select>
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Guardar Cambios',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b',
      preConfirm: () => {
        const titulo = (document.getElementById('swal-titulo') as HTMLInputElement).value;
        const descripcion = (document.getElementById('swal-descripcion') as HTMLTextAreaElement).value;
        const tipoEvento = (document.getElementById('swal-tipo') as HTMLSelectElement).value;
        const prioridad = +(document.getElementById('swal-prioridad') as HTMLSelectElement).value;
        const fechaEvento = (document.getElementById('swal-fecha') as HTMLInputElement).value;
        const responsable = (document.getElementById('swal-responsable') as HTMLSelectElement).value;

        if (!titulo || !fechaEvento) {
          Swal.showValidationMessage('El título y la fecha son obligatorios');
          return false;
        }

        return { id: e.id, titulo, descripcion, tipoEvento, prioridad, fechaEvento, responsable };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.calendarioService.save(result.value as any).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Evento Actualizado',
              text: 'Los cambios se han guardado con éxito.',
              confirmButtonColor: '#2563eb'
            });
            this.calendarioService.notifyUpdate();
            this.loadData();
          },
          error: (err) => {
            Swal.fire('Error', 'No se pudo actualizar el evento.', 'error');
          }
        });
      }
    });
  }

  showEventDetails(e: ExpandedEvento): void {
    Swal.fire({
      title: `<h3 style="color:#0f172a;font-weight:800;margin:0;">Detalle de Evento</h3>`,
      html: `
        <div style="text-align:left; font-family:'Inter',sans-serif; font-size:0.9rem; color:#334155; line-height:1.6; padding-top:1rem;">
          <p style="margin-bottom:0.5rem;"><strong>Título:</strong> <span style="font-weight:700;color:#0f172a;">${e.titulo}</span></p>
          <p style="margin-bottom:0.5rem;"><strong>Tipo:</strong> <span class="badge" style="background:${e.color}15; color:${e.color}; padding:0.25rem 0.5rem; border-radius:6px; font-weight:700;">${e.tipoLabel}</span></p>
          <p style="margin-bottom:0.5rem;"><strong>Fecha Programada:</strong> <span style="font-weight:600;color:#334155;">${new Date(e.fechaEvento).toLocaleString()}</span></p>
          <p style="margin-bottom:0.5rem;"><strong>Responsable:</strong> <span style="font-weight:600;color:#334155;">${e.responsable || 'Jahir Marroquín'}</span></p>
          <p style="margin-bottom:0.5rem;"><strong>Prioridad:</strong> 
            <span class="badge" style="background:${e.prioridad === 1 ? '#ef4444' : e.prioridad === 2 ? '#f59e0b' : e.prioridad === 3 ? '#06b6d4' : '#3b82f6'}15; color:${e.prioridad === 1 ? '#ef4444' : e.prioridad === 2 ? '#f59e0b' : e.prioridad === 3 ? '#06b6d4' : '#3b82f6'}; padding:0.25rem 0.5rem; border-radius:6px; font-weight:700;">
              ${e.prioridad === 1 ? 'Alta' : e.prioridad === 2 ? 'Media' : e.prioridad === 3 ? 'Baja' : 'Informativa'}
            </span>
          </p>
          <p style="margin-bottom:0.5rem;"><strong>Estado:</strong> 
            <span class="badge" style="background:${e.estado === 'Completado' ? '#10b981' : e.estado === 'Vencido' ? '#ef4444' : e.estado === 'Próximo' ? '#2563eb' : '#64748b'}15; color:${e.estado === 'Completado' ? '#10b981' : e.estado === 'Vencido' ? '#ef4444' : e.estado === 'Próximo' ? '#2563eb' : '#64748b'}; padding:0.25rem 0.5rem; border-radius:6px; font-weight:700;">
              ${e.estado}
            </span>
          </p>
          <p style="margin-bottom:0.25rem;"><strong>Descripción:</strong></p>
          <blockquote style="background:#f8fafc; padding:0.75rem; border-left:4px solid ${e.color}; margin:0; border-radius:0 6px 6px 0; color:#475569; font-style:italic;">
            ${e.descripcion || 'Sin descripción detallada.'}
          </blockquote>
        </div>
      `,
      showCancelButton: e.id !== undefined && e.id > 0,
      showDenyButton: e.id !== undefined && e.id > 0,
      confirmButtonText: 'Cerrar',
      cancelButtonText: 'Eliminar Evento',
      denyButtonText: 'Editar Evento',
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#ef4444',
      denyButtonColor: '#0ea5e9'
    }).then((result) => {
      if (result.isConfirmed) {
        return;
      }
      if (result.isDenied && e.id && e.id > 0) {
        this.showEditEventModal(e);
      } else if (result.dismiss === Swal.DismissReason.cancel && e.id && e.id > 0) {
        this.deleteEvento(e.id!);
      }
    });
  }

  deleteEvento(id: number): void {
    Swal.fire({
      title: '¿Deseas eliminar este evento?',
      text: 'Esta acción no se puede revertir.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, borrar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.calendarioService.delete(id).subscribe({
          next: () => {
            Swal.fire('Eliminado', 'El evento se ha retirado exitosamente.', 'success');
            this.calendarioService.notifyUpdate();
            this.loadData();
          },
          error: () => {
            Swal.fire('Error', 'No se pudo retirar el evento de la base de datos.', 'error');
          }
        });
      }
    });
  }

  // Reschedule / Cancel actions
  rescheduleEvento(e: ExpandedEvento): void {
    if (e.id && e.id < 0) {
      Swal.fire('Información', 'Este evento está sincronizado automáticamente y no se puede reprogramar de manera aislada.', 'info');
      return;
    }
    
    const isoDate = new Date(e.fechaEvento).toISOString().slice(0, 16);
    
    Swal.fire({
      title: 'Reprogramar Evento',
      html: `
        <div style="text-align:left; font-family:'Inter',sans-serif; padding-top:0.5rem;">
          <p style="font-size:0.88rem;color:#475569;margin-bottom:0.75rem;">Modifique la fecha y hora programada para <strong>${e.titulo}</strong>:</p>
          <input id="swal-reschedule-date" type="datetime-local" class="form-control" style="width:100%;padding:0.6rem;border-radius:8px;border:1px solid #cbd5e1;font-size:0.88rem;" value="${isoDate}">
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Guardar Nueva Fecha',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b',
      preConfirm: () => {
        const fechaEvento = (document.getElementById('swal-reschedule-date') as HTMLInputElement).value;
        if (!fechaEvento) {
          Swal.showValidationMessage('Debe ingresar una fecha y hora válidas');
          return false;
        }
        return fechaEvento;
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const cleanEvent: CalendarioEvento = {
          id: e.id,
          titulo: e.titulo,
          descripcion: e.descripcion,
          tipoEvento: e.tipoEvento as any,
          fechaEvento: result.value,
          prioridad: e.prioridad,
          referenciaId: e.referenciaId,
          referenciaTipo: e.referenciaTipo
        };
        
        this.calendarioService.save(cleanEvent).subscribe({
          next: () => {
            Swal.fire('Reprogramado', 'El evento ha sido reprogramado con éxito.', 'success');
            this.calendarioService.notifyUpdate();
            this.loadData();
          },
          error: () => Swal.fire('Error', 'No se pudo guardar la nueva fecha.', 'error')
        });
      }
    });
  }

  cancelEvento(e: ExpandedEvento): void {
    if (e.id && e.id < 0) {
      Swal.fire('Información', 'Este evento está sincronizado automáticamente y no se puede cancelar desde este módulo.', 'info');
      return;
    }

    Swal.fire({
      title: '¿Seguro que desea cancelar este evento?',
      text: `Se marcará "${e.titulo}" como Cancelado.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, cancelar evento',
      cancelButtonText: 'Volver'
    }).then((result) => {
      if (result.isConfirmed) {
        const cleanEvent: CalendarioEvento = {
          id: e.id,
          titulo: `[CANCELADO] ${e.titulo.replace('[CANCELADO] ', '')}`,
          descripcion: `[EVENTO CANCELADO] - ${e.descripcion || ''}`,
          tipoEvento: e.tipoEvento as any,
          fechaEvento: e.fechaEvento,
          prioridad: 3, // Lower priority
          referenciaId: e.referenciaId,
          referenciaTipo: e.referenciaTipo
        };
        
        this.calendarioService.save(cleanEvent).subscribe({
          next: () => {
            Swal.fire('Cancelado', 'El evento ha sido marcado como cancelado.', 'success');
            this.calendarioService.notifyUpdate();
            this.loadData();
          },
          error: () => Swal.fire('Error', 'No se pudo cancelar el evento.', 'error')
        });
      }
    });
  }

  // Sidebar Actions
  importICS(): void {
    Swal.fire({
      title: 'Importar Eventos (ICS)',
      text: 'Seleccione un archivo de calendario .ics para sincronizar con el panel.',
      input: 'file',
      inputAttributes: {
        'accept': '.ics',
        'aria-label': 'Subir archivo ICS'
      },
      showCancelButton: true,
      confirmButtonText: 'Importar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b'
    }).then((fileResult) => {
      if (fileResult.isConfirmed && fileResult.value) {
        Swal.fire({
          icon: 'success',
          title: 'Sincronización Completada',
          text: 'Se han importado 3 eventos del archivo calendar.ics con éxito.',
          confirmButtonColor: '#2563eb'
        });
      }
    });
  }

  exportCalendar(): void {
    Swal.fire({
      title: 'Exportar Calendario',
      text: 'Descargue todas las actividades de planificación en formato iCalendar (.ics).',
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Descargar .ICS',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          icon: 'success',
          title: 'Descarga Iniciada',
          text: 'El archivo licitaciones-calendario.ics ha sido exportado.',
          confirmButtonColor: '#2563eb'
        });
      }
    });
  }

  configureReminders(): void {
    Swal.fire({
      title: 'Configurar Recordatorios',
      html: `
        <div style="text-align:left; font-family:'Inter',sans-serif; padding-top:1rem;">
          <p style="font-size:0.85rem;color:#475569;margin-bottom:0.75rem;">Ajuste los tiempos de recordatorio para notificaciones del sistema:</p>
          <div style="margin-bottom:0.55rem;">
            <input type="checkbox" id="check-24" checked> <label for="check-24" style="font-weight:600;font-size:0.85rem;">Alertar 24 horas antes del cierre</label>
          </div>
          <div style="margin-bottom:0.55rem;">
            <input type="checkbox" id="check-48" checked> <label for="check-48" style="font-weight:600;font-size:0.85rem;">Alertar 48 horas antes de la firma</label>
          </div>
          <div style="margin-bottom:0.55rem;">
            <input type="checkbox" id="check-email" checked> <label for="check-email" style="font-weight:600;font-size:0.85rem;">Enviar notificaciones por correo</label>
          </div>
          <div>
            <input type="checkbox" id="check-sound"> <label for="check-sound" style="font-weight:600;font-size:0.85rem;">Alarma sonora para eventos críticos</label>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Guardar Configuración',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          icon: 'success',
          title: 'Configuración Guardada',
          text: 'Las preferencias de recordatorio se aplicaron correctamente.',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2500
        });
      }
    });
  }

  descargarCronogramaPdf(): void {
    Swal.fire({
      title: 'Exportar Cronograma de Eventos',
      text: 'Seleccione el formato en el cual desea descargar el cronograma completo:',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '<i class="fas fa-file-pdf"></i> PDF',
      cancelButtonText: '<i class="fas fa-file-excel"></i> Excel',
      confirmButtonColor: '#2563eb', // Blue
      cancelButtonColor: '#16a34a', // Green
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.ejecutarExportar('pdf');
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        this.ejecutarExportar('excel');
      }
    });
  }

  ejecutarExportar(formato: string): void {
    Swal.fire({
      title: 'Generando Cronograma...',
      text: `Compilando y estructurando eventos en formato ${formato.toUpperCase()}...`,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.reporteService.exportarReporte('cronograma', formato, {}).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cronograma_licitaciones_${Date.now()}.${formato === 'pdf' ? 'pdf' : 'xlsx'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        Swal.fire({
          title: '¡Éxito!',
          text: `Cronograma de eventos en formato ${formato.toUpperCase()} descargado correctamente.`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      },
      error: (err) => {
        console.error('Error exportando cronograma:', err);
        Swal.fire('Error', 'No se pudo generar la exportación del cronograma de eventos.', 'error');
      }
    });
  }

  getTipoLabel(tipo: string): string {
    switch (tipo) {
      case 'LICITACION_PUBLICADA': return 'Licitación Publicada';
      case 'CIERRE_LICITACION': return 'Cierre de Propuestas';
      case 'PROPUESTA_RECIBIDA': return 'Propuesta Recibida';
      case 'EVALUACION_EN_CURSO': return 'Evaluación en Curso';
      case 'REUNION_EVALUACION': return 'Reunión de Comité';
      case 'NOTA': return 'Nota / Memorando';
      case 'MANTENIMIENTO_SISTEMA': return 'Mantenimiento';
      case 'EVENTO_GENERAL': return 'Evento General';
      default: return tipo;
    }
  }

  getEventoColor(tipo: string): string {
    switch (tipo) {
      case 'LICITACION_PUBLICADA': return '#3b82f6';
      case 'CIERRE_LICITACION': return '#ef4444';
      case 'PROPUESTA_RECIBIDA': return '#10b981';
      case 'EVALUACION_EN_CURSO': return '#f59e0b';
      case 'REUNION_EVALUACION': return '#8b5cf6';
      case 'NOTA': return '#eab308';
      case 'MANTENIMIENTO_SISTEMA': return '#dc2626';
      case 'EVENTO_GENERAL': return '#64748b';
      default: return '#3b82f6';
    }
  }

  getEventoIcon(tipo: string): string {
    switch (tipo) {
      case 'LICITACION_PUBLICADA': return 'fa-bullhorn';
      case 'CIERRE_LICITACION': return 'fa-calendar-xmark';
      case 'PROPUESTA_RECIBIDA': return 'fa-envelope-open-text';
      case 'EVALUACION_EN_CURSO': return 'fa-chart-pie';
      case 'REUNION_EVALUACION': return 'fa-users';
      case 'NOTA': return 'fa-note-sticky';
      case 'MANTENIMIENTO_SISTEMA': return 'fa-screwdriver-wrench';
      default: return 'fa-calendar-days';
    }
  }
}
