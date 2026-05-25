import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalendarioService, CalendarioEvento } from '../../../../core/services/calendario.service';
import { TokenService } from '../../../../core/services/token.service';
import { LucideAngularModule, ChevronLeft, ChevronRight, Calendar, Info, Clock, AlertTriangle } from 'lucide-angular';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-dashboard-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="calendar-card">
      <div class="calendar-header-main">
        <div class="calendar-title">
          <h3>Calendario de Actividades</h3>
          <p>Gestión de eventos y cierres</p>
        </div>
        
        <div class="calendar-header-actions">
          <div class="calendar-actions" *ngIf="isAdmin()">
            <button class="btn-create-event" (click)="openCreateEventModal()">
              <i class="fa-solid fa-plus"></i> Nuevo Evento
            </button>
          </div>
          
          <div class="calendar-filters">
            <div class="date-picker-container">
              <lucide-icon [name]="calendarIcon" class="icon-sm color-muted"></lucide-icon>
              <input type="date" [(ngModel)]="selectedDateFilter" (change)="onDateFilterChange()" class="filter-input">
            </div>
          </div>
        </div>
      </div>

      <div class="calendar-body">
        <div class="calendar-nav">
          <button class="nav-btn" (click)="prevMonth()" title="Mes anterior">
            <lucide-icon [name]="chevronLeft" class="icon-nav"></lucide-icon>
          </button>
          <span class="current-month">{{ monthNames[currentMonth] }} {{ currentYear }}</span>
          <button class="nav-btn" (click)="nextMonth()" title="Siguiente mes">
            <lucide-icon [name]="chevronRight" class="icon-nav"></lucide-icon>
          </button>
        </div>

        <div class="calendar-grid">
          <div class="day-header" *ngFor="let day of weekDays">{{ day }}</div>
          
          <div class="calendar-day empty" *ngFor="let empty of emptyDays"></div>
          
          <div class="calendar-day" 
               *ngFor="let day of daysInMonth" 
               [class.today]="isToday(day)"
               [class.selected]="isSelected(day)"
               [class.has-cierre]="hasCierre(day)"
               (click)="selectDay(day)">
            
            <div class="day-header-cell">
               <span class="day-number">{{ day }}</span>
            </div>

            <div class="event-dots" *ngIf="getEventsForDay(day).length > 0">
              <span *ngFor="let event of getEventsForDay(day) | slice:0:3" 
                    class="dot" 
                    [style.background-color]="getEventColor(event.tipoEvento)"
                    [title]="event.titulo"></span>
              <span class="more-dots" *ngIf="getEventsForDay(day).length > 3">+</span>
            </div>
            
            <div class="day-tooltip" *ngIf="getEventsForDay(day).length > 0">
              <div class="tooltip-header">{{ getEventsForDay(day).length }} Eventos</div>
              <div class="tooltip-item" *ngFor="let event of getEventsForDay(day) | slice:0:3">
                <span *ngIf="event.tipoEvento === 'MANTENIMIENTO_SISTEMA'" class="text-red-highlight">
                  • MANTENIMIENTO: {{ event.descripcion }}
                </span>
                <span *ngIf="event.tipoEvento !== 'MANTENIMIENTO_SISTEMA'">
                  • {{ event.titulo }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Detail Sidebar (integrated) -->
      <div class="day-detail-panel" *ngIf="selectedDayEvents.length > 0">
        <div class="detail-header">
          <div class="detail-title-group">
            <lucide-icon [name]="calendarIcon" class="icon-md text-primary"></lucide-icon>
            <h4>Eventos del {{ selectedDate | date:'dd/MM/yyyy' }}</h4>
          </div>
          <button class="close-btn" (click)="selectedDayEvents = []">&times;</button>
        </div>
        
        <div class="event-list">
          <div class="event-item" *ngFor="let event of selectedDayEvents" [style.border-left-color]="getEventColor(event.tipoEvento)">
            <div class="event-info">
              <div class="event-badge-row">
                <span class="event-type-badge" [style.background-color]="getEventColor(event.tipoEvento) + '22'" [style.color]="getEventColor(event.tipoEvento)">
                  {{ event.tipoEvento.replace('_', ' ') }}
                </span>
                <span class="event-time" *ngIf="event.fechaEvento">
                  <lucide-icon [name]="clockIcon" class="icon-xs"></lucide-icon>
                  {{ event.fechaEvento | date:'HH:mm' }}
                </span>
              </div>
              <h6>{{ event.titulo }}</h6>
              <p>{{ event.descripcion }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .calendar-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.05);
      padding: 10px;
      width: 100%;
      max-width: 550px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    
    .calendar-header-main {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      gap: 16px;
      flex-wrap: wrap;
    }
    
    .calendar-title h3 { 
      margin: 0; 
      font-size: 1.1rem; 
      color: #1e293b; 
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .calendar-title p { font-size: 0.75rem; margin-top: 2px; }
    
    .calendar-header-actions {
      display: flex;
      align-items: center;
      gap: 20px;
      flex-wrap: wrap;
    }
    
    .btn-create-event {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 12px;
      font-size: 0.9375rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 12px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
    }
    
    .btn-create-event:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(37, 99, 235, 0.3);
      filter: brightness(1.1);
    }
    
    .date-picker-container {
      display: flex;
      align-items: center;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 0 16px;
      height: 48px;
      transition: all 0.2s;
    }
    
    .date-picker-container:focus-within {
      border-color: #3b82f6;
      background: white;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    
    .filter-input {
      border: none;
      background: transparent;
      padding: 10px;
      font-size: 0.9375rem;
      outline: none;
      color: #334155;
      font-weight: 600;
    }
    
    .calendar-body {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    
    .calendar-nav {
      display: flex;
      justify-content: center;
      align-items: center;
      margin-bottom: 12px;
      gap: 20px;
      background: #f8fafc;
      padding: 8px;
      border-radius: 12px;
    }
    
    .current-month { 
      font-weight: 800; 
      font-size: 0.95rem; 
      color: #1e293b; 
      min-width: 140px; 
      text-align: center;
      text-transform: capitalize;
    }
    
    .nav-btn { 
      background: white; 
      border: 1px solid #e2e8f0;
      border-radius: 10px; 
      width: 32px; 
      height: 32px; 
      cursor: pointer; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      transition: all 0.2s;
      color: #64748b;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    
    .nav-btn:hover { 
      background: #3b82f6; 
      color: white;
      border-color: #3b82f6;
      transform: scale(1.05);
    }
    
    .icon-nav { width: 24px; height: 24px; }

    .calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 4px;
      flex: 1;
    }
    
    .day-header { 
      text-align: center; 
      font-size: 0.75rem; 
      font-weight: 800; 
      color: #94a3b8; 
      text-transform: uppercase; 
      letter-spacing: 0.5px;
      padding-bottom: 8px; 
    }
    
    .calendar-day {
      aspect-ratio: 1;
      border-radius: 4px;
      font-size: 0.65rem;
      border: 1px solid #f8fafc;
      padding: 1px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      position: relative;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      background: #fff;
    }
    
    .calendar-day:hover { 
      background: #f8fafc; 
      border-color: #cbd5e1;
      transform: scale(1.02);
      z-index: 2;
    }
    
    .calendar-day.selected { 
      background: #eff6ff; 
      border-color: #3b82f6;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
    }
    
    .calendar-day.today { 
      border-color: #3b82f6; 
      background: #f0f9ff; 
    }
    
    .calendar-day.today .day-number { 
      background: #3b82f6;
      color: white;
      width: 20px;
      height: 20px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .calendar-day.has-cierre { 
      border: 2px solid #ef4444; 
    }
    
    .day-header-cell {
      display: flex;
      justify-content: center;
      margin-bottom: 4px;
    }
    
    .day-number {
      font-size: 0.9rem;
      font-weight: 700;
      color: #1e293b;
      text-align: center;
    }
    
    .event-dots { 
      display: flex; 
      gap: 2px; 
      margin-top: auto; 
      justify-content: center; 
      flex-wrap: wrap;
    }
    
    .dot { 
      width: 4px; 
      height: 4px; 
      border-radius: 50%; 
    }
    
    .more-dots { font-size: 0.625rem; color: #94a3b8; font-weight: 700; }
    
    /* Side Panel */
    .day-detail-panel {
      position: absolute;
      top: 0;
      right: 0;
      width: 100%;
      height: 100%;
      background: white;
      z-index: 100;
      border-radius: 16px;
      padding: 30px;
      box-shadow: -10px 0 30px rgba(0,0,0,0.1);
      animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      overflow-y: auto;
    }
    
    @keyframes slideIn { 
      from { transform: translateX(100%); opacity: 0; } 
      to { transform: translateX(0); opacity: 1; } 
    }
    
    .detail-header { 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
      margin-bottom: 24px; 
      border-bottom: 1px solid #f1f5f9; 
      padding-bottom: 16px; 
    }
    
    .detail-title-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .detail-header h4 { margin: 0; font-size: 1.125rem; color: #1e293b; font-weight: 700; }
    
    .close-btn { 
      background: #f1f5f9; 
      border: none; 
      width: 32px;
      height: 32px;
      border-radius: 50%;
      font-size: 1.25rem; 
      cursor: pointer; 
      color: #64748b; 
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .close-btn:hover { background: #e2e8f0; color: #1e293b; }
    
    .event-list { display: flex; flex-direction: column; gap: 16px; }
    
    .event-item {
      display: flex;
      padding: 16px;
      border-left: 4px solid #3b82f6;
      background: #f8fafc;
      border-radius: 12px;
      transition: transform 0.2s;
    }
    
    .event-item:hover { transform: translateX(5px); }
    
    .event-badge-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    
    .event-type-badge { 
      font-size: 0.65rem; 
      padding: 3px 8px; 
      border-radius: 6px; 
      font-weight: 800; 
      text-transform: uppercase; 
      letter-spacing: 0.5px;
    }
    
    .event-info { flex: 1; }
    .event-info h6 { margin: 0; font-size: 1rem; color: #1e293b; font-weight: 700; }
    .event-info p { margin: 6px 0 0; font-size: 0.875rem; color: #64748b; line-height: 1.5; }
    
    .event-time { 
      font-size: 0.75rem; 
      color: #94a3b8; 
      display: flex; 
      align-items: center; 
      gap: 6px; 
      font-weight: 600;
    }
    
    .day-tooltip {
      display: none;
      position: absolute;
      bottom: 105%;
      left: 50%;
      transform: translateX(-50%);
      background: #1e293b;
      color: white;
      padding: 12px;
      border-radius: 12px;
      width: 200px;
      z-index: 50;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
    }
    
    .calendar-day:hover .day-tooltip { display: block; }
    
    .tooltip-header { 
      font-size: 0.8rem; 
      font-weight: 800; 
      border-bottom: 1px solid rgba(255,255,255,0.1); 
      padding-bottom: 6px; 
      margin-bottom: 8px; 
      color: #3b82f6;
    }
    
    .tooltip-item { 
      font-size: 0.75rem; 
      margin-bottom: 4px; 
      white-space: nowrap; 
      overflow: hidden; 
      text-overflow: ellipsis; 
      opacity: 0.9; 
    }

    .icon-xs { width: 14px; height: 14px; }
    .icon-sm { width: 18px; height: 18px; }
    .icon-md { width: 22px; height: 22px; }
    .color-muted { color: #94a3b8; }
    .text-red-highlight { color: #ef4444; font-weight: 800; }
  `]
})
export class DashboardCalendarComponent implements OnInit {
  // Icons
  readonly chevronLeft = ChevronLeft;
  readonly chevronRight = ChevronRight;
  readonly calendarIcon = Calendar;
  readonly infoIcon = Info;
  readonly clockIcon = Clock;
  readonly alertIcon = AlertTriangle;

  events: CalendarioEvento[] = [];
  selectedDateFilter: string = '';
  
  currentDate = new Date();
  currentMonth = new Date().getMonth();
  currentYear = new Date().getFullYear();
  selectedDate: Date = new Date();
  
  weekDays = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];
  monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  
  daysInMonth: number[] = [];
  emptyDays: number[] = [];
  
  selectedDayEvents: CalendarioEvento[] = [];

  constructor(
    private calendarioService: CalendarioService,
    private tokenService: TokenService
  ) {}

  ngOnInit(): void {
    this.generateCalendar();
    this.loadEvents();
  }

  loadEvents(): void {
    const start = new Date(this.currentYear, this.currentMonth, 1).toISOString();
    const end = new Date(this.currentYear, this.currentMonth + 1, 0).toISOString();
    
    this.calendarioService.getEvents(start, end).subscribe(events => {
      this.events = events;
    });
  }

  generateCalendar(): void {
    const startOfMonth = new Date(this.currentYear, this.currentMonth, 1);
    const endOfMonth = new Date(this.currentYear, this.currentMonth + 1, 0);
    
    // Calculate empty days (start of month padding)
    // getDay() gives 0 for Sunday, 1 for Monday... 
    // We want 1 for Monday, so we convert: (day + 6) % 7
    let firstDayOfWeek = (startOfMonth.getDay() + 6) % 7;
    this.emptyDays = Array(firstDayOfWeek).fill(0);
    
    const days = endOfMonth.getDate();
    this.daysInMonth = Array.from({length: days}, (_, i) => i + 1);
  }

  prevMonth(): void {
    this.currentMonth--;
    if (this.currentMonth < 0) {
      this.currentMonth = 11;
      this.currentYear--;
    }
    this.generateCalendar();
    this.loadEvents();
  }

  nextMonth(): void {
    this.currentMonth++;
    if (this.currentMonth > 11) {
      this.currentMonth = 0;
      this.currentYear++;
    }
    this.generateCalendar();
    this.loadEvents();
  }

  selectDay(day: number): void {
    this.selectedDate = new Date(this.currentYear, this.currentMonth, day);
    this.selectedDayEvents = this.getEventsForDay(day);
  }

  isToday(day: number): boolean {
    const today = new Date();
    return today.getDate() === day && today.getMonth() === this.currentMonth && today.getFullYear() === this.currentYear;
  }

  isSelected(day: number): boolean {
    return this.selectedDate.getDate() === day && this.selectedDate.getMonth() === this.currentMonth && this.selectedDate.getFullYear() === this.currentYear;
  }

  getEventsForDay(day: number): CalendarioEvento[] {
    return this.events.filter(e => {
      const eDate = new Date(e.fechaEvento);
      return eDate.getDate() === day && eDate.getMonth() === this.currentMonth && eDate.getFullYear() === this.currentYear;
    });
  }

  hasCierre(day: number): boolean {
    return this.getEventsForDay(day).some(e => e.tipoEvento === 'CIERRE_LICITACION');
  }

  getEventColor(tipo: string): string {
    switch (tipo) {
      case 'LICITACION_PUBLICADA': return '#3b82f6'; // Azul
      case 'PROPUESTA_RECIBIDA': return '#10b981'; // Verde
      case 'EVALUACION_EN_CURSO': return '#f59e0b'; // Amarillo
      case 'CIERRE_LICITACION': return '#e74c3c'; // Rojo
      case 'MANTENIMIENTO_SISTEMA': return '#e74c3c'; // Rojo (Identidad Mantenimiento)
      case 'NOTA': return '#8e44ad'; // Morado (Identidad Notas)
      case 'REUNION_EVALUACION': return '#3f51b5'; // Índigo (Identidad Reuniones)
      case 'EVENTO_GENERAL': return '#7f8c8d'; // Gris (Identidad Eventos)
      default: return '#64748b';
    }
  }

  onDateFilterChange(): void {
    if (this.selectedDateFilter) {
      const date = new Date(this.selectedDateFilter);
      this.currentMonth = date.getMonth();
      this.currentYear = date.getFullYear();
      this.generateCalendar();
      this.loadEvents();
      
      // Select the specific day
      this.selectedDate = date;
      this.calendarioService.getEventsByDay(date.toISOString()).subscribe(events => {
        this.selectedDayEvents = events;
      });
    }
  }

  isAdmin(): boolean {
    return this.tokenService.isAdmin();
  }

  getEventIcon(tipo: string): any {
    switch (tipo) {
      case 'LICITACION_PUBLICADA': return this.calendarIcon;
      case 'PROPUESTA_RECIBIDA': return this.infoIcon;
      case 'EVALUACION_EN_CURSO': return this.clockIcon;
      case 'CIERRE_LICITACION': return this.alertIcon;
      case 'MANTENIMIENTO_SISTEMA': return this.alertIcon;
      case 'NOTA': return this.infoIcon;
      case 'REUNION_EVALUACION': return this.clockIcon;
      default: return this.infoIcon;
    }
  }

  openCreateEventModal(): void {
    const today = new Date().toISOString().split('T')[0];
    const time = new Date().toTimeString().split(' ')[0].substring(0, 5);
    
    Swal.fire({
      title: '<span style="font-weight: 800; color: #1e293b; letter-spacing: -0.5px;">Nuevo Evento Estratégico</span>',
      width: '500px',
      padding: '24px',
      background: '#fff',
      html: `
        <div class="swal-form-container" style="text-align: left; padding: 10px 0;">
          <style>
            .swal-label { display: block; margin-bottom: 8px; font-weight: 700; font-size: 0.85rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
            .swal-group { margin-bottom: 20px; }
            .swal-input-group { position: relative; display: flex; align-items: center; }
            .swal-icon { position: absolute; left: 16px; color: #94a3b8; font-size: 1.1rem; }
            .swal-custom-input { 
              width: 100%; padding: 12px 16px 12px 48px; border-radius: 12px; border: 2px solid #f1f5f9; 
              background: #f8fafc; font-size: 0.95rem; font-weight: 600; color: #1e293b; transition: all 0.2s;
            }
            .swal-custom-input:focus { border-color: #3b82f6; background: #fff; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.05); }
            .swal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          </style>

          <div class="swal-group">
            <label class="swal-label">Título del Evento</label>
            <div class="swal-input-group">
              <i class="fa-solid fa-heading swal-icon"></i>
              <input id="swal-title" class="swal-custom-input" placeholder="Ej: Comité de Evaluación">
            </div>
          </div>
          
          <div class="swal-group">
            <label class="swal-label">Descripción</label>
            <div class="swal-input-group">
              <i class="fa-solid fa-align-left swal-icon" style="top: 15px;"></i>
              <textarea id="swal-desc" class="swal-custom-input" placeholder="Detalles importantes..." style="min-height: 80px; padding-left: 48px; resize: none;"></textarea>
            </div>
          </div>
          
          <div class="swal-grid">
            <div class="swal-group">
              <label class="swal-label">Clasificación</label>
              <div class="swal-input-group">
                <i class="fa-solid fa-tag swal-icon"></i>
                <select id="swal-type" class="swal-custom-input" style="appearance: none;">
                  <option value="EVENTO_GENERAL" selected>📅 Evento General</option>
                  <option value="NOTA">📝 Nota Adminsitrativa</option>
                  <option value="MANTENIMIENTO_SISTEMA">⚠️ Mantenimiento</option>
                  <option value="REUNION_EVALUACION">🤝 Reunión de Evaluación</option>
                </select>
              </div>
            </div>

            <div class="swal-group">
              <label class="swal-label">Fecha y Hora</label>
              <div class="swal-input-group">
                <i class="fa-solid fa-clock swal-icon"></i>
                <input id="swal-date" type="datetime-local" class="swal-custom-input" value="${today}T${time}">
              </div>
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'GUARDAR EVENTO',
      cancelButtonText: 'CANCELAR',
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#94a3b8',
      preConfirm: () => {
        const title = (document.getElementById('swal-title') as HTMLInputElement).value;
        const desc = (document.getElementById('swal-desc') as HTMLTextAreaElement).value;
        const type = (document.getElementById('swal-type') as HTMLSelectElement).value;
        const date = (document.getElementById('swal-date') as HTMLInputElement).value;

        if (!title || !date) {
          Swal.showValidationMessage('Título y Fecha son obligatorios');
          return false;
        }
        return { titulo: title, descripcion: desc, tipoEvento: type, fechaEvento: date };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const newEvent: CalendarioEvento = {
          ...result.value,
          prioridad: 2
        };
        this.calendarioService.save(newEvent).subscribe({
          next: () => {
            Swal.fire({
              title: '¡Evento Publicado!',
              text: 'El evento ha sido registrado y sincronizado en todo el sistema.',
              icon: 'success',
              timer: 2000,
              showConfirmButton: false,
              background: '#fff',
              color: '#1e293b'
            });
            this.loadEvents();
            this.calendarioService.notifyUpdate(); // Trigger refresh on News Feed
          },
          error: (err) => {
            console.error('Error saving event', err);
            Swal.fire('Error', 'No se pudo guardar el evento.', 'error');
          }
        });
      }
    });
  }
}
