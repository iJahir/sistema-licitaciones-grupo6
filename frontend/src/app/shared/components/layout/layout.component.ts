import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TokenService } from '../../../core/services/token.service';
import { NotificationService, Notificacion } from '../../../core/services/notification.service';
import { UsuarioService } from '../../../core/services/usuario.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent implements OnInit {
  currentUser: any;
  isReportsMenuOpen = false;
  isSidebarMobileOpen = false;
  
  // Notificaciones
  notifications: Notificacion[] = [];
  unreadCount = 0;
  isNotificationsOpen = false;

  // Sidebar Desktop State
  isSidebarCollapsed = false;
  logoError = false;

  breadcrumbs: Array<{ label: string, url: string }> = [];

  constructor(
    private tokenService: TokenService,
    private notificationService: NotificationService,
    private usuarioService: UsuarioService,
    public router: Router
  ) {
    this.router.events.subscribe(() => {
      this.updateBreadcrumbs();
    });
  }

  ngOnInit(): void {
    this.updateBreadcrumbs();
    const user = this.tokenService.getUser();
    if (user && user.id) {
      this.usuarioService.getById(user.id).subscribe({
        next: (fullUser) => {
          this.currentUser = fullUser;
          // Actualizamos el cache en localStorage
          this.tokenService.saveUser({
            ...user,
            urlFoto: fullUser.urlFoto
          });
        },
        error: () => {
          this.currentUser = user;
        }
      });
    } else {
      this.currentUser = user;
    }
    
    // Suscribirse al contador de no leídas
    this.notificationService.unreadCount$.subscribe(count => {
      this.unreadCount = count;
    });

    // Cargar estado del sidebar
    const savedState = localStorage.getItem('sidebarCollapsed');
    this.isSidebarCollapsed = savedState === 'true';
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    localStorage.setItem('sidebarCollapsed', String(this.isSidebarCollapsed));
  }

  loadNotifications(): void {
    this.notificationService.getRecent().subscribe(notifs => {
      this.notifications = notifs;
    });
  }

  toggleNotifications(event: Event): void {
    event.stopPropagation();
    this.isNotificationsOpen = !this.isNotificationsOpen;
    if (this.isNotificationsOpen) {
      this.loadNotifications();
      this.isReportsMenuOpen = false;
    }
  }

  marcarLeida(notif: Notificacion, event: Event): void {
    event.stopPropagation();
    if (!notif.leida) {
      this.notificationService.markAsRead(notif.id).subscribe(() => {
        notif.leida = true;
        this.notificationService.updateCount();
      });
    }
    if (notif.link) {
      this.isNotificationsOpen = false;
      this.router.navigate([notif.link]);
    }
  }

  marcarTodasLeidas(): void {
    this.notificationService.markAllAsRead().subscribe(() => {
      this.notifications.forEach(n => n.leida = true);
      this.notificationService.updateCount();
    });
  }

  toggleReportsMenu(event: Event): void {
    event.stopPropagation();
    this.isReportsMenuOpen = !this.isReportsMenuOpen;
  }

  toggleSidebarMobile(): void {
    this.isSidebarMobileOpen = !this.isSidebarMobileOpen;
  }

  navigateBack(): void {
    window.history.back();
  }

  logout(): void {
    this.tokenService.signOut();
    this.router.navigate(['/login']);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    this.isNotificationsOpen = false;
    this.isReportsMenuOpen = false;
  }

  getFullName(): string {
    const name = this.currentUser?.nombre || '';
    const lastName = this.currentUser?.apellido || '';
    const fullName = (name + ' ' + lastName).trim();
    return fullName || this.currentUser?.username || 'Usuario';
  }

  getPhotoUrl(): string | null {
    return this.usuarioService.getFileUrl(this.currentUser?.urlFoto || null);
  }

  getRoleLabel(): string {
    if (this.hasAnyRole('ROLE_SUPER_ADMIN', 'SUPER_ADMIN')) return 'Super Administrador';
    if (this.hasAnyRole('ROLE_GESTOR_LICITACIONES', 'GESTOR_LICITACIONES')) return 'Gestor de Licitaciones';
    if (this.hasAnyRole('ROLE_AUDITOR', 'AUDITOR')) return 'Auditor';
    if (this.hasAnyRole('ROLE_AUTORIDAD', 'AUTORIDAD')) return 'Autoridad';
    if (this.tokenService.isEvaluador()) return 'Evaluador';
    if (this.tokenService.isProveedor()) return 'Proveedor';
    if (this.tokenService.isArea()) return 'Área Solicitante';
    if (this.hasAnyRole('ROLE_ADMINISTRADOR', 'ROLE_ADMIN', 'ADMINISTRADOR', 'ADMIN')) return 'Administrador';
    
    const user = this.tokenService.getUser();
    const roles = user?.roles || [];
    if (roles.length > 0) {
      const firstRole = roles[0];
      const roleStr = typeof firstRole === 'string' ? firstRole : (firstRole.name || firstRole.authority || '');
      return roleStr.replace('ROLE_', '');
    }
    return 'Usuario';
  }

  get isPrivileged(): boolean {
    return this.tokenService.isAdmin() || this.tokenService.isAutoridad() || this.tokenService.hasAnyRole('ROLE_AUTORIDAD');
  }

  get isEvaluadorOnly(): boolean {
    return this.tokenService.isEvaluador() && !this.tokenService.isAdmin();
  }

  hasAnyRole(...roleNames: string[]): boolean {
    return this.tokenService.hasAnyRole(...roleNames);
  }

  private updateBreadcrumbs(): void {
    const url = this.router.url;
    const segments = url.split('/').filter(s => s);
    const breadcrumbs = [{ label: 'Dashboard', url: '/dashboard' }];
    
    let currentUrl = '';
    segments.forEach((segment, index) => {
      if (segment === 'dashboard') return;
      currentUrl += `/${segment}`;
      
      // Don't add breadcrumb for IDs (numeric or UUID-like)
      if (segment.match(/^[0-9a-fA-F-]+$/)) {
        breadcrumbs.push({ label: 'Detalle', url: currentUrl });
        return;
      }

      let label = segment.charAt(0).toUpperCase() + segment.slice(1);
      
      // Custom labels
      if (segment === 'planificacion') label = 'Planificación';
      if (segment === 'licitaciones') label = 'Licitaciones';
      if (segment === 'propuestas') label = 'Propuestas';
      if (segment === 'evaluaciones') label = 'Evaluaciones';
      if (segment === 'usuarios') label = 'Usuarios';
      if (segment === 'administracion') label = 'Administración';
      if (segment === 'roles-permisos') label = 'Roles y Permisos';
      if (segment === 'auditoria') label = 'Auditoría';
      if (segment === 'contratos') label = 'Contratos';
      if (segment === 'resultados') label = 'Resultados';
      if (segment === 'reportes') label = 'Reportes';

      breadcrumbs.push({ label, url: currentUrl });
    });
    
    this.breadcrumbs = breadcrumbs;
  }
}
