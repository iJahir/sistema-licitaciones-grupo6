import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TokenService } from '../../core/services/token.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { EvaluacionService } from '../../core/services/evaluacion.service';
import { interval, Subscription } from 'rxjs';
import Swal from 'sweetalert2';



@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  currentUser: any;
  isEvaluador = false;
  isAdmin = false;
  isArea = false;
  isProveedor = false;
  isPrivileged = false;
  evaluatorStats: any = {
    pendientes: 0,
    enRevision: 0,
    finalizadas: 0,
    totalAsignadas: 0,
    porcentajeCompletado: 0,
    porcentajePendiente: 0,
    porcentajeRevision: 0,
    propuestas: []
  };
  stats: any = {
    stats: {
      totalLicitaciones: 0,
      enProceso: 0,
      evaluadas: 0,
      participantes: 0,
      totalContratos: 0,
      valorEstimadoTotal: 0,
      valorAdjudicadoTotal: 0,
      ahorroEstimado: 0,
      porcentajeAhorroPromedio: 0,
      totalTrend: '',
      enProcesoTrend: '',
      evaluadasTrend: '',
      participantesTrend: '',
      accionesHoy: 0,
      usuariosEnLinea: 0
    },
    recentLicitaciones: [],
    alerts: []
  };
  isLoading = true;

  // Header Clock
  currentDate: Date = new Date();
  currentTime: string = '';
  currentLocalTime: string = ''; // Keep for compatibility if needed
  private clockSubscription?: Subscription;

  // Multi-Timer Logic
  private timersSubscription?: Subscription;

  constructor(
    private tokenService: TokenService, 
    private router: Router,
    private dashboardService: DashboardService,
    private evaluacionService: EvaluacionService
  ) { }

  ngOnInit(): void {
    this.currentUser = this.tokenService.getUser();
    this.checkRoles();
    this.loadDashboardData();
    
    // Start Header Clock
    this.startHeaderClock();

    // Polling Dashboard Data every 60 seconds
    const pollingSub = interval(60000).subscribe(() => {
      this.loadDashboardData();
    });
    this.clockSubscription?.add(pollingSub);

    // Welcome Notification (Session-only)
    this.checkAndShowWelcome();
  }

  ngOnDestroy(): void {
    this.clockSubscription?.unsubscribe();
    this.timersSubscription?.unsubscribe();
  }

  startHeaderClock(): void {
    this.clockSubscription = interval(1000).subscribe(() => {
      const now = new Date();
      this.currentDate = now;
      this.currentTime = now.toLocaleTimeString();
      this.currentLocalTime = this.currentTime;
    });
  }

  checkAndShowWelcome(): void {
    const welcomeShown = sessionStorage.getItem('welcomeAlertShown');
    if (!welcomeShown) {
      this.showWelcomeAlert();
      sessionStorage.setItem('welcomeAlertShown', 'true');
    }
  }

  showWelcomeAlert(): void {
    const fullName = this.getFullName();
    
    Swal.fire({
      title: `¡Bienvenido de nuevo!`,
      text: `${fullName}`,
      icon: 'success',
      confirmButtonColor: '#324E66',
      background: '#F7F4F3',
      color: '#324E66',
      timer: 3000,
      timerProgressBar: true,
      showConfirmButton: false,
      position: 'center'
    });
  }

  checkRoles(): void {
    this.isAdmin = this.tokenService.isAdmin() || this.tokenService.hasAnyRole('OBSERVADOR', 'AUTORIDAD');
    this.isEvaluador = this.tokenService.isEvaluador();
    this.isArea = this.tokenService.isArea();
    this.isProveedor = this.tokenService.isProveedor();
    this.isPrivileged = this.tokenService.isAdmin() || this.tokenService.isAutoridad() || this.tokenService.hasAnyRole('ROLE_AUTORIDAD');
  }

  computeEvaluatorStats(asignaciones: any[]): void {
    let pendientes = 0;
    let enRevision = 0;
    let finalizadas = 0;
    
    const misAsignaciones = asignaciones || [];
    misAsignaciones.forEach((p: any) => {
      const myEv = p.evaluadores && p.evaluadores.length > 0 ? p.evaluadores[0] : null;
      if (myEv) {
        if (myEv.estadoTramite === 'FINALIZADO') {
          finalizadas++;
        } else if (myEv.estadoTramite === 'BORRADOR') {
          if (myEv.puntajeTotal > 0 || myEv.resultado !== 'PENDIENTE') {
            enRevision++;
          } else {
            pendientes++;
          }
        } else {
          pendientes++;
        }
      } else {
        if (p.estadoEvaluacion === 'FINALIZADO') {
          finalizadas++;
        } else if (p.progreso > 0 && p.progreso < 100) {
          enRevision++;
        } else {
          pendientes++;
        }
      }
    });

    const total = misAsignaciones.length || 1;
    this.evaluatorStats = {
      pendientes,
      enRevision,
      finalizadas,
      totalAsignadas: misAsignaciones.length,
      porcentajeCompletado: Math.round((finalizadas / total) * 100),
      porcentajeRevision: Math.round((enRevision / total) * 100),
      porcentajePendiente: Math.round((pendientes / total) * 100),
      propuestas: misAsignaciones
    };
  }

  get evaluatorDonutSegments() {
    const total = this.evaluatorStats.totalAsignadas || 1;
    const finalizadasPct = (this.evaluatorStats.finalizadas / total) * 100;
    const enRevisionPct = (this.evaluatorStats.enRevision / total) * 100;
    const pendientesPct = (this.evaluatorStats.pendientes / total) * 100;

    const lenFinalizadas = (finalizadasPct / 100) * 251.2;
    const lenRevision = (enRevisionPct / 100) * 251.2;
    const lenPendientes = (pendientesPct / 100) * 251.2;

    return {
      finalizadas: {
        dasharray: `${lenFinalizadas} 251.2`,
        dashoffset: 0
      },
      enRevision: {
        dasharray: `${lenRevision} 251.2`,
        dashoffset: -lenFinalizadas
      },
      pendientes: {
        dasharray: `${lenPendientes} 251.2`,
        dashoffset: -(lenFinalizadas + lenRevision)
      }
    };
  }

  get licitacionesStats() {
    const map = this.stats?.licitacionesPorEstado || {};
    const publicada = Number(map['PUBLICADA'] || 0);
    const enProgreso = Number(map['BORRADOR'] || 0);
    const enEvaluacion = Number(map['EN_EVALUACION'] || 0) + Number(map['EVALUADA'] || 0);
    const adjudicada = Number(map['ADJUDICADA'] || 0) + Number(map['CONTRATADA'] || 0);
    const cerrada = Number(map['CERRADA'] || 0) + Number(map['DESIERTA'] || 0) + Number(map['CANCELADA'] || 0);
    
    const total = publicada + enProgreso + enEvaluacion + adjudicada + cerrada || 1;
    
    const publicadaPct = (publicada / total) * 100;
    const enProgresoPct = (enProgreso / total) * 100;
    const enEvaluacionPct = (enEvaluacion / total) * 100;
    const adjudicadaPct = (adjudicada / total) * 100;
    const cerradaPct = (cerrada / total) * 100;

    const lenPublicada = (publicadaPct / 100) * 251.2;
    const lenProgreso = (enProgresoPct / 100) * 251.2;
    const lenEvaluacion = (enEvaluacionPct / 100) * 251.2;
    const lenAdjudicada = (adjudicadaPct / 100) * 251.2;
    const lenCerrada = (cerradaPct / 100) * 251.2;

    return {
      total: total === 1 && publicada + enProgreso + enEvaluacion + adjudicada + cerrada === 0 ? 0 : (publicada + enProgreso + enEvaluacion + adjudicada + cerrada),
      publicada,
      enProgreso,
      enEvaluacion,
      adjudicada,
      cerrada,
      publicadaPct: Math.round(publicadaPct),
      enProgresoPct: Math.round(enProgresoPct),
      enEvaluacionPct: Math.round(enEvaluacionPct),
      adjudicadaPct: Math.round(adjudicadaPct),
      cerradaPct: Math.round(cerradaPct),
      segments: {
        publicada: { dasharray: `${lenPublicada} 251.2`, dashoffset: 0 },
        enProgreso: { dasharray: `${lenProgreso} 251.2`, dashoffset: -lenPublicada },
        enEvaluacion: { dasharray: `${lenEvaluacion} 251.2`, dashoffset: -(lenPublicada + lenProgreso) },
        adjudicada: { dasharray: `${lenAdjudicada} 251.2`, dashoffset: -(lenPublicada + lenProgreso + lenEvaluacion) },
        cerrada: { dasharray: `${lenCerrada} 251.2`, dashoffset: -(lenPublicada + lenProgreso + lenEvaluacion + lenAdjudicada) }
      }
    };
  }

  get propuestasStats() {
    const map = this.stats?.propuestasPorEstado || {};
    // Sumar todos los estados de propuestas de la BD real
    const recibida = Number(map['RECIBIDA'] || 0) + Number(map['ENVIADA'] || 0) + Number(map['BORRADOR'] || 0) + Number(map['VALIDADA'] || 0) + Number(map['ACEPTADA'] || 0) + Number(map['PENDIENTE_EVALUACION'] || 0);
    const subsanacion = Number(map['SUBSANACION'] || 0) + Number(map['INCOMPLETA'] || 0) + Number(map['EN_REVISION'] || 0);
    const descalificada = Number(map['DESCALIFICADA'] || 0) + Number(map['RECHAZADA'] || 0);
    const enEvaluacion = Number(map['EN_EVALUACION'] || 0) + Number(map['EVALUADA'] || 0);
    const ganadora = Number(map['GANADORA'] || 0) + Number(map['PENDIENTE_ADJUDICACION'] || 0);
    
    const total = recibida + subsanacion + descalificada + enEvaluacion + ganadora;
    const totalCalculable = total || 1;
    
    const recibidaPct = (recibida / totalCalculable) * 100;
    const subsanacionPct = (subsanacion / totalCalculable) * 100;
    const descalificadaPct = (descalificada / totalCalculable) * 100;
    const enEvaluacionPct = (enEvaluacion / totalCalculable) * 100;
    const ganadoraPct = (ganadora / totalCalculable) * 100;

    const lenRecibida = (recibidaPct / 100) * 251.2;
    const lenSubsanacion = (subsanacionPct / 100) * 251.2;
    const lenDescalificada = (descalificadaPct / 100) * 251.2;
    const lenEvaluacion = (enEvaluacionPct / 100) * 251.2;
    const lenGanadora = (ganadoraPct / 100) * 251.2;

    return {
      total: total,
      recibida,
      subsanacion,
      descalificada,
      enEvaluacion,
      ganadora,
      recibidaPct: Math.round(recibidaPct),
      subsanacionPct: Math.round(subsanacionPct),
      descalificadaPct: Math.round(descalificadaPct),
      enEvaluacionPct: Math.round(enEvaluacionPct),
      ganadoraPct: Math.round(ganadoraPct),
      segments: {
        recibida: { dasharray: `${lenRecibida} 251.2`, dashoffset: 0 },
        subsanacion: { dasharray: `${lenSubsanacion} 251.2`, dashoffset: -lenRecibida },
        descalificada: { dasharray: `${lenDescalificada} 251.2`, dashoffset: -(lenRecibida + lenSubsanacion) },
        enEvaluacion: { dasharray: `${lenEvaluacion} 251.2`, dashoffset: -(lenRecibida + lenSubsanacion + lenDescalificada) },
        ganadora: { dasharray: `${lenGanadora} 251.2`, dashoffset: -(lenRecibida + lenSubsanacion + lenDescalificada + lenEvaluacion) }
      }
    };
  }

  get lineChartData() {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul'];
    const creadasMap = this.stats?.creadasPorMes || {};
    const adjudicadasMap = this.stats?.adjudicadasPorMes || {};
    
    const creadas = months.map(m => Number(creadasMap[m] || 0));
    const adjudicadas = months.map(m => Number(adjudicadasMap[m] || 0));
    
    const maxVal = Math.max(...creadas, ...adjudicadas, 5);
    
    const getSvgPoints = (dataArray: number[]) => {
      const xStart = 30;
      const xStep = 50;
      return dataArray.map((val, idx) => {
        const x = xStart + idx * xStep;
        const y = 110 - ((val / maxVal) * 90);
        return { x, y, val };
      });
    };
    
    const pointsCreadas = getSvgPoints(creadas);
    const pointsAdjudicadas = getSvgPoints(adjudicadas);
    
    const polylineCreadas = pointsCreadas.map(p => `${p.x},${p.y}`).join(' ');
    const polylineAdjudicadas = pointsAdjudicadas.map(p => `${p.x},${p.y}`).join(' ');
    
    // Gradient paths: M 30,120 L point1 L point2 ... L 330,120 Z
    const pathCreadas = `M 30,120 L ` + polylineCreadas + ` L 330,120 Z`;
    const pathAdjudicadas = `M 30,120 L ` + polylineAdjudicadas + ` L 330,120 Z`;
    
    return {
      months,
      creadas: pointsCreadas,
      adjudicadas: pointsAdjudicadas,
      polylineCreadas,
      polylineAdjudicadas,
      pathCreadas,
      pathAdjudicadas
    };
  }

  loadDashboardData(): void {
    this.dashboardService.getDashboardData().subscribe({
      next: (data) => {
        this.stats = data;
        if (this.isEvaluador && !this.isAdmin) {
          this.evaluacionService.getMisAsignaciones().subscribe({
            next: (asignaciones) => {
              this.computeEvaluatorStats(asignaciones);
              this.isLoading = false;
              this.startMultiTimers();
            },
            error: (err) => {
              console.error('Error loading evaluator assignments', err);
              this.isLoading = false;
            }
          });
        } else {
          this.isLoading = false;
          this.startMultiTimers();
        }
      },
      error: (err) => {
        console.error('Error loading dashboard data', err);
        if (this.isEvaluador && !this.isAdmin) {
          this.evaluacionService.getMisAsignaciones().subscribe({
            next: (asignaciones) => {
              this.computeEvaluatorStats(asignaciones);
              this.isLoading = false;
            },
            error: (e) => {
              console.error('Error loading evaluator assignments in fallback', e);
              this.isLoading = false;
            }
          });
        } else {
          this.isLoading = false;
        }
      }
    });
  }

  startMultiTimers(): void {
    this.timersSubscription?.unsubscribe();
    
    this.timersSubscription = interval(1000).subscribe(() => {
      const recent = this.stats.recentLicitaciones;
      if (!recent) return;
      
      recent.forEach((l: any) => {
        // Map DTO flattened properties to template variables
        l.usuarioNombre = l.creadorNombre || 'Admin';
        l.categoriaLabel = l.area || 'General';
        
        if (l.estado === 'PUBLICADA' && l.fechaCierre) {
          l.timeLeft = this.calculateTimeLeft(l.fechaCierre);
          l.isUrgent = this.isUrgent(l.fechaCierre);
          l.progress = this.calculateProgress(l.createdAt || new Date(), l.fechaCierre);
        } else {
          l.timeLeft = l.estado;
          l.isUrgent = false;
          l.progress = 100;
        }
      });
    });
  }

  calculateTimeLeft(dateStr: string): string {
    const now = new Date().getTime();
    const target = new Date(dateStr).getTime();
    const diff = target - now;

    if (diff <= 0) return 'CERRADA';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  calculateProgress(creationDate: string | Date, closureDate: string | Date): number {
    const start = new Date(creationDate).getTime();
    const end = new Date(closureDate).getTime();
    const now = new Date().getTime();
    
    if (now >= end) return 100;
    if (now <= start) return 0;
    
    const total = end - start;
    const elapsed = now - start;
    return Math.round((elapsed / total) * 100);
  }

  isUrgent(dateStr: string): boolean {
    const diff = new Date(dateStr).getTime() - new Date().getTime();
    return diff > 0 && diff < (24 * 60 * 60 * 1000); // Less than 24h
  }

  getRoles(): string {
    return this.currentUser?.roles?.join(', ') || 'Sin Rol';
  }

  getFullName(): string {
    return this.currentUser?.nombreCompleto || this.currentUser?.username || 'Usuario';
  }

  get licitaciones(): any[] {
    const list = this.stats?.recentLicitaciones || [];
    // Limit to 5 items (latest) as requested
    return list.slice(0, 5);
  }

  getActiveLicitaciones(): any[] {
    const list = this.stats?.recentLicitaciones || [];
    // Filter for active ones (with close date), show up to 25 items for scrollable feed
    return list.filter((l: any) => l.estado === 'PUBLICADA' && l.fechaCierre).slice(0, 25);
  }

  padId(id?: number): string {
    if (id === undefined || id === null) return '000';
    return id.toString().padStart(3, '0');
  }

  formatEstado(estado: string): string {
    if (!estado) return '';
    const mappings: { [key: string]: string } = {
      'PUBLICADA': 'Publicada',
      'EN_PROCESO': 'En progreso',
      'EN_INSCRIPCION': 'En inscripción',
      'EN_EVALUACION': 'En evaluación',
      'EVALUADA': 'Evaluada',
      'ADJUDICADA': 'Adjudicada',
      'CONTRATADA': 'Contratada',
      'CERRADA': 'Cerrada',
      'BORRADOR': 'Borrador',
      'DESIERTA': 'Desierta',
      'CANCELADA': 'Cancelada'
    };
    return mappings[estado.toUpperCase()] || estado;
  }

  getAlertIcon(type: string): string {
    const t = type?.toLowerCase();
    if (t === 'success') return 'fa-circle-check';
    if (t === 'warning') return 'fa-triangle-exclamation';
    if (t === 'danger' || t === 'urgent' || t === 'error') return 'fa-circle-xmark';
    if (t === 'licitacion') return 'fa-folder-open';
    if (t === 'propuesta') return 'fa-file-import';
    if (t === 'evaluacion') return 'fa-scale-balanced';
    if (t === 'contrato') return 'fa-file-contract';
    if (t === 'auditoria') return 'fa-shield-halved';
    if (t === 'login') return 'fa-right-to-bracket';
    if (t === 'test') return 'fa-flask';
    return 'fa-circle-info';
  }
  
  getAlertTitle(msg: string): string {
    if (!msg) return '';
    if (msg.includes(': ')) {
      return msg.split(': ')[0];
    }
    if (msg.includes('para Licitación')) {
      return 'Nueva propuesta recibida';
    }
    if (msg.includes('pasó a')) {
      return 'Cambio de estado de licitación';
    }
    if (msg.includes('próximo a vencer')) {
      return 'Evento próximo a vencer';
    }
    return msg;
  }

  getAlertSub(msg: string): string {
    if (!msg) return '';
    if (msg.includes(': ')) {
      return msg.split(': ').slice(1).join(': ');
    }
    if (msg.includes('para Licitación')) {
      const parts = msg.split('para Licitación');
      return 'Licitación' + parts[1];
    }
    if (msg.includes('Cambio de estado de licitación')) {
      return msg.replace('Cambio de estado de licitación ', '');
    }
    if (msg.includes('Evento próximo a vencer:')) {
      return msg.replace('Evento próximo a vencer: ', '');
    }
    return msg;
  }
}
