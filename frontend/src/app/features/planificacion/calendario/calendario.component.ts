import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CalendarioService, CalendarioEvento } from '../../../core/services/calendario.service';
import { LicitacionService } from '../../../core/services/licitacion.service';
import { ContratoService } from '../../../core/services/contrato.service';
import { TokenService } from '../../../core/services/token.service';
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
}

interface CalendarDay {
  dayNum: number;
  isCurrentMonth: boolean;
  date: Date;
  isToday: boolean;
  events: ExpandedEvento[];
}

@Component({
  selector: 'app-calendario',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './calendario.component.html',
  styleUrls: ['./calendario.component.scss']
})
export class CalendarioComponent implements OnInit {
  // State Lists
  events: ExpandedEvento[] = [];
  licitaciones: any[] = [];
  contratos: any[] = [];
  filteredEvents: ExpandedEvento[] = [];

  // Filter Models
  selectedLicitacionId: string = '';
  selectedTipoEvento: string = '';
  selectedPrioridad: string = '';
  selectedEstado: string = '';
  searchText: string = '';

  // Checkbox Filters (Matching Visual Mockup Categories)
  filterLicitaciones: boolean = true;
  filterPropuestas: boolean = true;
  filterEvaluaciones: boolean = true;
  filterAdjudicaciones: boolean = true;
  filterContratos: boolean = true;
  filterEventos: boolean = true;

  // Calendar State
  selectedDate: Date = new Date();
  selectedMonth: number = new Date().getMonth();
  selectedYear: number = new Date().getFullYear();
  calendarDays: CalendarDay[] = [];
  monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

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
    public tokenService: TokenService,
    private reporteService: ReporteService
  ) {}

  ngOnInit(): void {
    this.loadData();
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
        console.error('Error cargando eventos:', err);
      }
    });
  }

  aggregateAndMapEvents(customEvents: CalendarioEvento[]): void {
    const tempEvents: ExpandedEvento[] = [];

    // 1. Map Custom Events
    customEvents.forEach(e => {
      tempEvents.push({
        ...e,
        tipoLabel: this.getTipoLabel(e.tipoEvento),
        color: this.getEventoColor(e.tipoEvento),
        icon: this.getEventoIcon(e.tipoEvento),
        responsable: 'Administrador',
        estado: e.prioridad === 1 ? 'Crítico' : 'Activo'
      });
    });

    // 2. Map Licitaciones
    this.licitaciones.forEach(l => {
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
          responsable: l.usuarioResponsable || 'Área Solicitante',
          estado: 'Completado'
        });
      }

      if (l.fechaCierre) {
        const isVencido = new Date(l.fechaCierre).getTime() < new Date().getTime();
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
          responsable: l.usuarioResponsable || 'Comisión Evaluadora',
          estado: isVencido ? 'Vencido' : 'Crítico'
        });
      }

      if (l.fechaEvaluacion) {
        tempEvents.push({
          id: -5500 - l.id,
          titulo: `Evaluación: ${l.titulo}`,
          descripcion: `Evaluación de propuestas técnicas y económicas para #${l.id}`,
          tipoEvento: 'EVALUACION_EN_CURSO',
          fechaEvento: l.fechaEvaluacion,
          prioridad: 2,
          referenciaId: l.id,
          referenciaTipo: 'licitacion',
          tipoLabel: 'Evaluación Técnica',
          color: '#f59e0b',
          icon: 'fa-chart-pie',
          responsable: 'Comité Técnico',
          estado: l.estado === 'EVALUADA' || l.estado === 'ADJUDICADA' || l.estado === 'CONTRATADA' ? 'Completado' : 'Activo'
        });
      }

      if (l.fechaAdjudicacion) {
        tempEvents.push({
          id: -5000 - l.id,
          titulo: `Adjudicación: ${l.titulo}`,
          descripcion: `Licitación adjudicada al proveedor seleccionado`,
          tipoEvento: 'REUNION_EVALUACION',
          fechaEvento: l.fechaAdjudicacion,
          prioridad: 2,
          referenciaId: l.id,
          referenciaTipo: 'adjudicacion',
          tipoLabel: 'Adjudicación',
          color: '#8b5cf6',
          icon: 'fa-trophy',
          responsable: 'Comité de Adjudicación',
          estado: l.estado === 'ADJUDICADA' || l.estado === 'CONTRATADA' ? 'Completado' : 'Activo'
        });
      }
    });

    // 3. Map Contratos
    this.contratos.forEach(c => {
      if (c.fechaFirma) {
        tempEvents.push({
          id: -3000 - c.id,
          titulo: `Firma Contrato: CONT-${c.codigo || c.id}`,
          descripcion: `Suscripción formal de contrato para licitación ${c.licitacion?.titulo}`,
          tipoEvento: 'REUNION_EVALUACION',
          fechaEvento: c.fechaFirma,
          prioridad: 2,
          referenciaId: c.id,
          referenciaTipo: 'contrato',
          tipoLabel: 'Firma de Contrato',
          color: '#06b6d4',
          icon: 'fa-file-signature',
          responsable: 'Asesoría Jurídica',
          estado: 'Completado'
        });
      }

      if (c.fechaFin) {
        const isVencido = new Date(c.fechaFin).getTime() < new Date().getTime();
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
          responsable: 'Supervisor de Contrato',
          estado: isVencido ? 'Vencido' : 'Crítico'
        });
      }
    });

    // Sort chronologically
    this.events = tempEvents.sort((a, b) => new Date(a.fechaEvento).getTime() - new Date(b.fechaEvento).getTime());
    
    // Apply filters and generate KPIs
    this.applyFilters();
    this.calculateKPIs();
  }

  // Getters for Dynamic/Real Visual Rendering in UI
  get criticalEvents(): ExpandedEvento[] {
    return this.filteredEvents.filter(e => e.prioridad === 1).slice(0, 5);
  }

  get recentEventsList(): ExpandedEvento[] {
    return [...this.filteredEvents]
      .filter(e => new Date(e.fechaEvento).getTime() <= new Date().getTime())
      .sort((a, b) => new Date(b.fechaEvento).getTime() - new Date(a.fechaEvento).getTime())
      .slice(0, 5);
  }

  getDaysRemainingLabel(dateStr: string | Date): string {
    const now = new Date();
    const target = new Date(dateStr);
    now.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    
    const diffTime = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Vencido';
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Mañana';
    return `En ${diffDays} días`;
  }

  getPercent(value: number): string {
    if (this.kpis.total === 0) return '0.0%';
    return ((value / this.kpis.total) * 100).toFixed(1) + '%';
  }

  getSinFechaDefinidaCount(): number {
    return this.licitaciones.filter(l => !l.fechaPublicacion && !l.fechaCierre).length;
  }

  applyFilters(): void {
    this.filteredEvents = this.events.filter(e => {
      if (this.searchText) {
        const search = this.searchText.toLowerCase();
        const matchesText = e.titulo.toLowerCase().includes(search) || 
                            e.descripcion.toLowerCase().includes(search) ||
                            (e.responsable && e.responsable.toLowerCase().includes(search));
        if (!matchesText) return false;
      }

      if (this.selectedTipoEvento && e.tipoEvento !== this.selectedTipoEvento) {
        return false;
      }

      if (this.selectedLicitacionId) {
        if (e.referenciaTipo === 'licitacion' && e.referenciaId !== +this.selectedLicitacionId) {
          return false;
        }
      }

      if (this.selectedPrioridad && e.prioridad !== +this.selectedPrioridad) {
        return false;
      }

      if (this.selectedEstado && e.estado !== this.selectedEstado) {
        return false;
      }

      if (e.tipoEvento === 'LICITACION_PUBLICADA' || e.tipoEvento === 'CIERRE_LICITACION') {
        if (!this.filterLicitaciones) return false;
      } else if (e.tipoEvento === 'PROPUESTA_RECIBIDA') {
        if (!this.filterPropuestas) return false;
      } else if (e.tipoEvento === 'EVALUACION_EN_CURSO') {
        if (!this.filterEvaluaciones) return false;
      } else if (e.referenciaTipo === 'adjudicacion') {
        if (!this.filterAdjudicaciones) return false;
      } else if (e.referenciaTipo === 'contrato') {
        if (!this.filterContratos) return false;
      } else {
        if (!this.filterEventos) return false;
      }

      return true;
    });

    this.generateCalendar();
  }

  calculateKPIs(): void {
    const now = new Date().getTime();
    let total = 0;
    let proximos = 0;
    let vencidos = 0;
    let criticos = 0;
    let completados = 0;

    this.events.forEach(e => {
      total++;
      const time = new Date(e.fechaEvento).getTime();
      
      if (e.estado === 'Completado') {
        completados++;
      } else if (e.estado === 'Vencido' || time < now) {
        vencidos++;
      } else {
        proximos++;
      }

      if (e.prioridad === 1) {
        criticos++;
      }
    });

    this.kpis = { total, proximos, vencidos, criticos, completados };
  }

  generateCalendar(): void {
    const year = this.selectedYear;
    const month = this.selectedMonth;

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    const days: CalendarDay[] = [];

    // Pre-month spacer days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthTotalDays - i;
      const date = new Date(year, month - 1, d);
      days.push({
        dayNum: d,
        isCurrentMonth: false,
        date,
        isToday: false,
        events: this.getEventsForDate(date)
      });
    }

    // Current month days
    const today = new Date();
    for (let i = 1; i <= totalDays; i++) {
      const date = new Date(year, month, i);
      const isToday = today.getDate() === i && today.getMonth() === month && today.getFullYear() === year;
      days.push({
        dayNum: i,
        isCurrentMonth: true,
        date,
        isToday,
        events: this.getEventsForDate(date)
      });
    }

    // Next month padding cells
    const totalCells = days.length;
    const paddingCellsNeeded = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= paddingCellsNeeded; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        dayNum: i,
        isCurrentMonth: false,
        date,
        isToday: false,
        events: this.getEventsForDate(date)
      });
    }

    this.calendarDays = days;
  }

  getEventsForDate(date: Date): ExpandedEvento[] {
    return this.filteredEvents.filter(e => {
      const eDate = new Date(e.fechaEvento);
      return eDate.getDate() === date.getDate() &&
             eDate.getMonth() === date.getMonth() &&
             eDate.getFullYear() === date.getFullYear();
    });
  }

  prevMonth(): void {
    if (this.selectedMonth === 0) {
      this.selectedMonth = 11;
      this.selectedYear--;
    } else {
      this.selectedMonth--;
    }
    this.generateCalendar();
  }

  nextMonth(): void {
    if (this.selectedMonth === 11) {
      this.selectedMonth = 0;
      this.selectedYear++;
    } else {
      this.selectedMonth++;
    }
    this.generateCalendar();
  }

  goToToday(): void {
    const today = new Date();
    this.selectedMonth = today.getMonth();
    this.selectedYear = today.getFullYear();
    this.generateCalendar();
  }

  openNewEventModal(): void {
    Swal.fire({
      title: '<h3 style="color:#0f172a;font-weight:800;font-family:\'Inter\',sans-serif;">Registrar Nuevo Evento</h3>',
      html: `
        <div style="text-align:left; font-family:\'Inter\',sans-serif;">
          <label style="font-weight:700; font-size:0.85rem; color:#475569; display:block; margin-bottom:4px;">Título del Evento</label>
          <input id="swal-event-title" class="swal2-input" placeholder="Nombre de la actividad" style="width:90%; margin-top:0; margin-bottom:12px; font-size:0.9rem;">
          
          <label style="font-weight:700; font-size:0.85rem; color:#475569; display:block; margin-bottom:4px;">Tipo de Evento</label>
          <select id="swal-event-type" class="swal2-input" style="width:90%; margin-top:0; margin-bottom:12px; font-size:0.9rem; height:45px; background:white;">
            <option value="EVENTO_GENERAL">Evento General</option>
            <option value="NOTA">Nota / Memorando</option>
            <option value="REUNION_EVALUACION">Reunión de Comité / Evaluación</option>
            <option value="MANTENIMIENTO_SISTEMA">Mantenimiento de Sistema</option>
          </select>

          <label style="font-weight:700; font-size:0.85rem; color:#475569; display:block; margin-bottom:4px;">Fecha y Hora</label>
          <input id="swal-event-date" type="datetime-local" class="swal2-input" style="width:90%; margin-top:0; margin-bottom:12px; font-size:0.9rem;">

          <label style="font-weight:700; font-size:0.85rem; color:#475569; display:block; margin-bottom:4px;">Prioridad</label>
          <select id="swal-event-priority" class="swal2-input" style="width:90%; margin-top:0; margin-bottom:12px; font-size:0.9rem; height:45px; background:white;">
            <option value="1">Alta (Crítico)</option>
            <option value="2" selected>Media (Normal)</option>
            <option value="3">Baja (Opcional)</option>
          </select>

          <label style="font-weight:700; font-size:0.85rem; color:#475569; display:block; margin-bottom:4px;">Descripción</label>
          <textarea id="swal-event-desc" class="swal2-textarea" placeholder="Breve detalle..." style="width:90%; margin-top:0; height:80px; font-size:0.9rem;"></textarea>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Crear Evento',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b',
      preConfirm: () => {
        const title = (document.getElementById('swal-event-title') as HTMLInputElement).value;
        const type = (document.getElementById('swal-event-type') as HTMLSelectElement).value;
        const date = (document.getElementById('swal-event-date') as HTMLInputElement).value;
        const priority = (document.getElementById('swal-event-priority') as HTMLSelectElement).value;
        const desc = (document.getElementById('swal-event-desc') as HTMLTextAreaElement).value;

        if (!title || !date) {
          Swal.showValidationMessage('El título y la fecha son campos obligatorios.');
          return false;
        }

        return {
          titulo: title,
          descripcion: desc,
          tipoEvento: type,
          fechaEvento: date,
          prioridad: +priority
        };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.calendarioService.save(result.value).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Evento Registrado',
              text: 'El evento se ha incorporado al calendario correctamente.',
              confirmButtonColor: '#2563eb'
            });
            this.loadData();
            this.calendarioService.notifyUpdate();
          },
          error: () => {
            Swal.fire({
              icon: 'error',
              title: 'Error al registrar',
              text: 'No se pudo guardar el evento en base de datos.',
              confirmButtonColor: '#2563eb'
            });
          }
        });
      }
    });
  }

  showEventDetails(e: ExpandedEvento): void {
    Swal.fire({
      title: `<h3 style="color:#0f172a;font-weight:800;">${e.titulo}</h3>`,
      html: `
        <div style="text-align:left; font-family:'Inter',sans-serif; font-size:0.9rem; color:#334155; line-height:1.6;">
          <p><strong>Tipo:</strong> <span class="badge" style="background:${e.color}15; color:${e.color}; padding:0.25rem 0.5rem; border-radius:6px; font-weight:700;">${e.tipoLabel}</span></p>
          <p><strong>Fecha Programada:</strong> ${new Date(e.fechaEvento).toLocaleString()}</p>
          <p><strong>Responsable:</strong> ${e.responsable || 'Administración'}</p>
          <p><strong>Estado:</strong> ${e.estado}</p>
          <p><strong>Descripción:</strong></p>
          <blockquote style="background:#f8fafc; padding:0.75rem; border-left:4px solid ${e.color}; margin:0; border-radius:0 6px 6px 0; color:#475569;">
            ${e.descripcion || 'Sin detalle disponible.'}
          </blockquote>
        </div>
      `,
      showCancelButton: e.id !== undefined && e.id > 0 && this.tokenService.isAdmin(),
      confirmButtonText: 'Cerrar',
      cancelButtonText: 'Eliminar Evento',
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#ef4444'
    }).then((result) => {
      if (result.dismiss === Swal.DismissReason.cancel && e.id) {
        Swal.fire({
          title: '¿Estás seguro?',
          text: 'Esta acción no se puede deshacer.',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#ef4444',
          cancelButtonColor: '#64748b',
          confirmButtonText: 'Sí, eliminar',
          cancelButtonText: 'Cancelar'
        }).then((confirmDel) => {
          if (confirmDel.isConfirmed) {
            this.calendarioService.delete(e.id!).subscribe({
              next: () => {
                Swal.fire('Eliminado', 'El evento ha sido eliminado.', 'success');
                this.loadData();
                this.calendarioService.notifyUpdate();
              },
              error: () => {
                Swal.fire('Error', 'No se pudo eliminar el evento.', 'error');
              }
            });
          }
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

  configureAlerts(): void {
    Swal.fire({
      title: 'Configurar Recordatorios',
      html: `
        <div style="text-align: left; padding: 0 1rem;">
          <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Frecuencia de Notificaciones:</label>
          <select id="swal-freq" class="swal2-input" style="width: 100%; margin: 0 0 1rem 0;">
            <option value="1">Diario (Resumen matutino)</option>
            <option value="2" selected>Semanal (Cada lunes)</option>
            <option value="3">Solo alertas críticas</option>
          </select>
          <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Vía de Envío:</label>
          <div style="display: flex; gap: 1rem; margin-bottom: 0.5rem;">
            <label><input type="checkbox" checked /> Correo Electrónico</label>
            <label><input type="checkbox" checked /> Alerta del Sistema</label>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2563eb',
      preConfirm: () => {
        return {
          freq: (document.getElementById('swal-freq') as HTMLSelectElement).value
        };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire('Configurado', 'Los recordatorios se han guardado con éxito.', 'success');
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
