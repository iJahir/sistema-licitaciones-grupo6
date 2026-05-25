import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NoticiaService, Noticia } from '../../../../core/services/noticia.service';
import { CalendarioService, CalendarioEvento } from '../../../../core/services/calendario.service';
import { NotificationService, Notificacion } from '../../../../core/services/notification.service';
import { TokenService } from '../../../../core/services/token.service';
import { LucideAngularModule, Bell, AlertCircle, Info, CheckCircle, Eye, Calendar, Clock, FileText, ChevronLeft, ChevronRight } from 'lucide-angular';
import { forkJoin, map, of, catchError } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-dashboard-news',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="news-card">
      <div class="news-header">
        <div class="news-title">
          <h3>Últimas Noticias</h3>
          <span class="unread-badge" *ngIf="getUnreadCount() > 0">{{ getUnreadCount() }} nuevas</span>
        </div>
        <button class="view-all-btn" (click)="viewAll()">Ver todas</button>
      </div>

      <div class="news-list">
        <div class="news-item" *ngFor="let item of pagedActivityFeed" [class.unread]="isRead(item)" [class.maintenance]="item.tipo === 'MANTENIMIENTO' || item.tipo === 'MANTENIMIENTO_SISTEMA'">
          <div class="news-icon-status" [style.background-color]="getTypeColor(item.tipo) + '15'">
            <lucide-icon [name]="getTypeIcon(item.tipo)" [style.color]="getTypeColor(item.tipo)"></lucide-icon>
          </div>
          
          <div class="news-content">
            <div class="news-meta">
              <span class="type-badge" [style.color]="getTypeColor(item.tipo)">{{ item.tipoLabel || item.tipo }}</span>
              <span class="news-date">{{ item.fecha | date:'dd MMM, yyyy' }}</span>
            </div>
            <h4 class="news-subject" [style.color]="(item.tipo === 'MANTENIMIENTO' || item.tipo === 'MANTENIMIENTO_SISTEMA') ? '#ef4444' : 'inherit'">
              {{ item.titulo }}
            </h4>
            <p class="news-excerpt">{{ item.contenido }}</p>
            
            <div class="news-footer">
              <div class="news-actions">
                <button class="btn-read-more" (click)="showDetail(item)">
                  <lucide-icon [name]="eyeIcon" class="icon-xs"></lucide-icon>
                  {{ item.isEvent ? 'Ver evento' : 'Ver noticia' }}
                </button>
                <button class="btn-mark-read" *ngIf="!isRead(item)" (click)="markAsRead(item, $event)">
                  <lucide-icon [name]="checkIcon" class="icon-xs"></lucide-icon>
                  Leída
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div class="pagination-controls" *ngIf="activityFeed.length > pageSize">
          <button class="pag-btn" [disabled]="currentPage === 1" (click)="prevPage()">
            <lucide-icon [name]="chevronLeftIcon" class="icon-xs"></lucide-icon>
            Anterior
          </button>
          <span class="pag-info">Página {{ currentPage }} de {{ totalPages }}</span>
          <button class="pag-btn" [disabled]="currentPage === totalPages" (click)="nextPage()">
            Siguiente
            <lucide-icon [name]="chevronRightIcon" class="icon-xs"></lucide-icon>
          </button>
        </div>
        
        <div class="empty-news" *ngIf="activityFeed.length === 0">
          <lucide-icon [name]="bellIcon" class="icon-lg"></lucide-icon>
          <p>No hay noticias recientes.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .news-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.05);
      padding: 24px;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    
    .news-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .news-title { display: flex; align-items: center; gap: 12px; }
    .news-title h3 { margin: 0; font-size: 1.25rem; color: #1e293b; font-weight: 800; }
    .unread-badge { background: #ef4444; color: white; font-size: 0.625rem; padding: 2px 10px; border-radius: 20px; font-weight: 700; }
    .view-all-btn { background: none; border: none; color: #3b82f6; font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: color 0.2s; }
    .view-all-btn:hover { color: #2563eb; text-decoration: underline; }

    .news-list {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-right: 8px;
    }
    
    .news-item {
      display: flex;
      gap: 16px;
      padding: 14px;
      border-radius: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      transition: all 0.3s ease;
      min-height: 130px; 
    }
    
    .news-item.unread {
      background: #fff;
      border-color: #3b82f644;
      box-shadow: 0 4px 20px rgba(59, 130, 246, 0.08);
      position: relative;
    }
    
    .news-item.unread::after {
      content: '';
      position: absolute;
      top: 12px;
      right: 12px;
      width: 8px;
      height: 8px;
      background: #3b82f6;
      border-radius: 50%;
    }
    
    .news-icon-status {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    
    .news-content { 
      flex: 1; 
      display: flex;
      flex-direction: column;
    }
    
    .news-meta { 
      display: flex; 
      justify-content: space-between; 
      align-items: center;
      margin-bottom: 8px; 
    }
    
    .type-badge { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
    .news-date { font-size: 0.75rem; color: #94a3b8; font-weight: 500; }
    
    .news-subject { 
      margin: 0 0 8px; 
      font-size: 1rem; 
      color: #1e293b; 
      font-weight: 700; 
      line-height: 1.3;
    }
    
    .news-excerpt { 
      margin: 0 0 12px; 
      font-size: 0.8125rem; 
      color: #64748b; 
      line-height: 1.5; 
      display: -webkit-box; 
      -webkit-line-clamp: 2; 
      -webkit-box-orient: vertical; 
      overflow: hidden; 
    }
    
    .news-footer {
      margin-top: auto; 
      padding-top: 16px;
      border-top: 1px solid #f8fafc;
      display: flex;
      justify-content: center;
    }

    .news-actions {
      display: flex;
      gap: 12px;
      width: 100%;
    }

    .btn-read-more, .btn-mark-read {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 10px 12px;
      border-radius: 10px;
      font-size: 0.75rem;
      font-weight: 700;
      transition: all 0.2s;
      cursor: pointer;
      border: none;
      white-space: nowrap;
    }

    .btn-read-more {
      background: #f1f5f9;
      color: #334155;
    }

    .btn-read-more:hover {
      background: #e2e8f0;
      color: #1e293b;
    }

    .btn-mark-read {
      background: #f0fdf4;
      color: #16a34a;
    }

    .btn-mark-read:hover {
      background: #dcfce7;
      color: #15803d;
    }
    
    .pagination-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 0 8px;
      margin-top: 10px;
      border-top: 2px dashed #f1f5f9;
    }
    
    .pag-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 8px 16px;
      border-radius: 10px;
      font-size: 0.8125rem;
      font-weight: 700;
      color: #64748b;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .pag-btn:hover:not(:disabled) {
      background: white;
      border-color: #3b82f6;
      color: #3b82f6;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    
    .pag-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .pag-info {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #94a3b8;
    }

    .icon-xs { width: 14px; height: 14px; }
    .icon-lg { width: 48px; height: 48px; color: #e2e8f0; margin-bottom: 12px; }
    
    .empty-news { text-align: center; padding: 60px 0; color: #94a3b8; }
    
    /* Scrollbar */
    .news-list::-webkit-scrollbar { width: 6px; }
    .news-list::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
    .news-list::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
    .news-list::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
  `]
})
export class DashboardNewsComponent implements OnInit {
  activityFeed: any[] = [];
  currentUser: any;
  
  // Pagination
  currentPage = 1;
  pageSize = 4;

  // Icons
  readonly bellIcon = Bell;
  readonly infoIcon = Info;
  readonly alertIcon = AlertCircle;
  readonly checkIcon = CheckCircle;
  readonly eyeIcon = Eye;
  readonly calendarIcon = Calendar;
  readonly clockIcon = Clock;
  readonly fileIcon = FileText;
  readonly chevronLeftIcon = ChevronLeft;
  readonly chevronRightIcon = ChevronRight;

  constructor(
    private noticiaService: NoticiaService,
    private calendarioService: CalendarioService,
    private notificationService: NotificationService,
    private tokenService: TokenService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.tokenService.getUser();
    this.loadActivity();
    
    // Listen for updates from other components
    this.calendarioService.refresh$.subscribe(update => {
      if (update) {
        this.loadActivity();
      }
    });
  }

  loadActivity(): void {
    const news$ = this.noticiaService.getRecent(20).pipe(catchError(() => of([])));
    const events$ = this.calendarioService.getEvents().pipe(catchError(() => of([])));
    const notifications$ = this.notificationService.getRecent().pipe(
      map(notifs => notifs.filter(n => n.titulo !== 'Inicio de Sesión')), // Exclude login alerts
      catchError(() => of([]))
    );

    forkJoin([news$, events$, notifications$]).pipe(
      map(([news, events, notifications]) => {
        // Transform News
        const newsActivity = news.map(n => ({
          ...n,
          tipoLabel: n.tipo,
          isEvent: false,
          isNotification: false
        }));

        // Transform Events
        const eventActivity = events.map(e => ({
          id: e.id,
          titulo: e.titulo,
          contenido: e.descripcion,
          tipo: e.tipoEvento,
          tipoLabel: this.getEventLabel(e.tipoEvento),
          fecha: e.fechaEvento,
          isEvent: true,
          isNotification: false,
          leidoPor: []
        }));

        // Transform Notifications
        const notifActivity = notifications.map(n => ({
          id: n.id,
          titulo: n.titulo,
          contenido: n.mensaje,
          tipo: n.tipo,
          tipoLabel: n.tipo,
          fecha: n.fecha,
          leida: n.leida,
          isEvent: ['NOTA', 'EVENTO_GENERAL', 'MANTENIMIENTO_SISTEMA', 'REUNION_EVALUACION'].includes(n.tipo),
          isNotification: true,
          icono: n.icono,
          color: n.color,
          link: n.link
        }));

        // Deduplicate: If an event is also a notification (like a manual Note), prefer the notification
        // because it has the "leida" status.
        const filteredEvents = eventActivity.filter(e => 
          !notifActivity.some(n => n.titulo === e.titulo && Math.abs(new Date(n.fecha).getTime() - new Date(e.fecha).getTime()) < 5000)
        );

        // Merge and sort
        return [...newsActivity, ...filteredEvents, ...notifActivity]
          .sort((a, b) => {
            const dateA = new Date(a.fecha).getTime();
            const dateB = new Date(b.fecha).getTime();
            return dateB - dateA;
          });
      })
    ).subscribe(combined => {
      this.activityFeed = combined;
    });
  }

  get pagedActivityFeed(): any[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.activityFeed.slice(startIndex, startIndex + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.activityFeed.length / this.pageSize);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  getEventLabel(tipo: string): string {
    switch (tipo) {
      case 'MANTENIMIENTO_SISTEMA': return 'MANTENIMIENTO';
      case 'LICITACION_PUBLICADA': return 'LICITACIÓN';
      case 'REUNION_EVALUACION': return 'REUNIÓN DE EVALUACIÓN';
      case 'EVENTO_GENERAL': return 'EVENTO GENERAL';
      case 'PROPUESTA_RECIBIDA': return 'PROPUESTA';
      case 'NOTA': return 'NOTA';
      default: return 'EVENTO';
    }
  }

  getTypeIcon(tipo: string): any {
    switch (tipo) {
      case 'URGENTE': 
      case 'MANTENIMIENTO': 
      case 'MANTENIMIENTO_SISTEMA': return this.alertIcon;
      case 'RESULTADO': return this.checkIcon;
      case 'PROCESO': return this.infoIcon;
      case 'LICITACION_PUBLICADA': return this.calendarIcon;
      case 'REUNION_EVALUACION': return this.clockIcon;
      case 'PROPUESTA_RECIBIDA': 
      case 'PROPUESTA': return this.fileIcon;
      case 'NOTA': return this.fileIcon;
      case 'EVENTO_GENERAL': return this.bellIcon;
      default: return this.bellIcon;
    }
  }

  getTypeColor(tipo: string): string {
    switch (tipo) {
      case 'URGENTE': 
      case 'MANTENIMIENTO': 
      case 'MANTENIMIENTO_SISTEMA': return '#ef4444';
      case 'RESULTADO': return '#10b981';
      case 'PROCESO': return '#3b82f6';
      case 'LICITACION_PUBLICADA': return '#2563eb';
      case 'REUNION_EVALUACION': return '#8b5cf6';
      case 'PROPUESTA_RECIBIDA': 
      case 'PROPUESTA': return '#06b6d4'; // Cyan for proposals
      case 'NOTA': return '#8b5cf6'; // Purple for notes
      case 'EVENTO_GENERAL': return '#64748b';
      default: return '#64748b';
    }
  }

  isRead(item: any): boolean {
    if (item.isNotification) return item.leida;
    if (item.isEvent) return true; // Standard calendar events (like system-generated ones) don't have read status
    if (!item.leidoPor) return false;
    return item.leidoPor.some((u: any) => u.id === this.currentUser?.id);
  }

  getUnreadCount(): number {
    return this.activityFeed.filter((item: any) => !this.isRead(item)).length;
  }

  markAsRead(item: any, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    
    if (item.isNotification) {
      this.notificationService.markAsRead(item.id).subscribe(() => {
        this.loadActivity();
        this.notificationService.updateCount(); // Sync with header bell
      });
    } else if (!item.isEvent) {
      this.noticiaService.marcarComoLeida(item.id).subscribe(() => {
        this.loadActivity();
        this.notificationService.updateCount(); // Sync with header bell
      });
    }
  }

  showDetail(item: Noticia): void {
    Swal.fire({
      title: item.titulo,
      html: `<div style="text-align: left; font-size: 0.9rem;">${item.contenido}</div>`,
      icon: 'info',
      confirmButtonText: 'Cerrar',
      confirmButtonColor: this.getTypeColor(item.tipo)
    });
    if (!this.isRead(item)) {
       this.markAsRead(item);
    }
  }

  viewAll(): void {
    Swal.fire('Función en desarrollo', 'El historial completo de noticias pronto estará disponible.', 'info');
  }
}
