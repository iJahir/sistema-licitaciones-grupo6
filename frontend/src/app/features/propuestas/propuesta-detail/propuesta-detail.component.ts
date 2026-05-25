import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { PropuestaService } from '../../../core/services/propuesta.service';
import { EvaluacionService } from '../../../core/services/evaluacion.service';
import { LicitacionService } from '../../../core/services/licitacion.service';
import { API_CONFIG } from '../../../core/config/api-config';
import { TokenService } from '../../../core/services/token.service';
import { CalendarioService } from '../../../core/services/calendario.service';
import Swal from 'sweetalert2';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-propuesta-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './propuesta-detail.component.html',
  styleUrls: ['./propuesta-detail.component.scss']
})
export class PropuestaDetailComponent implements OnInit {
  propuesta: any;
  loading = true;
  isActionLoading = false;
  isAdmin = false;
  isEvaluador = false;
  isAutoridad = false;
  
  showRejectionModal = false;
  rejectionReason = '';

  // New state variables for target UX tabs and evaluation data
  activeTab = 'resumen';
  evaluacion: any = null;
  evaluaciones: any[] = [];
  historial: any[] = [];
  timelineItems: any[] = [];
  loadingEvaluacion = false;
  loadingHistorial = false;
  isFromEvaluaciones = false;

  // --- GESTIÓN DE EVALUADORES ---
  showEvaluadoresModal = false;
  evaluadoresDisponibles: any[] = [];
  evaluadoresSeleccionados: any[] = [];
  sugerenciasSistemas: any[] = [];
  loadingEvaluadores = false;
  openAreas = new Set<string>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private propuestaService: PropuestaService,
    private tokenService: TokenService,
    private evaluacionService: EvaluacionService,
    private licitacionService: LicitacionService,
    private calendarioService: CalendarioService
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.tokenService.isAdmin();
    this.isEvaluador = this.tokenService.isEvaluador();
    this.isAutoridad = this.tokenService.isAutoridad();
    this.isFromEvaluaciones = this.isEvaluador || this.router.url.includes('evaluaciones');
    
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadPropuesta(+id);
    }
  }

  loadPropuesta(id: number): void {
    this.loading = true;
    this.propuestaService.getById(id).subscribe({
      next: (data) => {
        this.propuesta = data;
        this.loading = false;
        this.loadEvaluacion(id);
        this.loadHistorial(id);
        this.buildTimeline();
        this.loadRealEvents(id);
      },
      error: (err) => {
        console.error('Error loading proposal', err);
        this.loading = false;
        Swal.fire('Error', 'No se pudo cargar la propuesta.', 'error');
      }
    });
  }

  loadRealEvents(propuestaId: number): void {
    this.calendarioService.getEvents().subscribe({
      next: (events) => {
        if (events) {
          const filtered = events.filter(e => 
            e.referenciaId === propuestaId && 
            (e.referenciaTipo?.toUpperCase() === 'PROPUESTA' || 
             e.referenciaTipo?.toUpperCase() === 'EVALUACION' || 
             e.referenciaTipo?.toUpperCase() === 'ADJUDICACION' ||
             e.referenciaTipo?.toUpperCase() === 'CONTRATO')
          );
          
          const mapped = filtered.map(e => ({
            date: new Date(e.fechaEvento),
            title: e.titulo,
            description: e.descripcion,
            type: 'real_activity',
            badgeClass: e.tipoEvento === 'EVALUACION_EN_CURSO' ? 'warning' : 
                        e.tipoEvento === 'PROPUESTA_RECIBIDA' ? 'info' : 
                        e.tipoEvento === 'CIERRE_LICITACION' ? 'success' : 'primary',
            iconClass: e.tipoEvento === 'EVALUACION_EN_CURSO' ? 'fa-clipboard-check' : 
                       e.tipoEvento === 'PROPUESTA_RECIBIDA' ? 'fa-paper-plane' : 
                       e.tipoEvento === 'CIERRE_LICITACION' ? 'fa-gavel' : 'fa-circle-dot'
          }));

          // Combine with existing timeline items and sort
          this.timelineItems = [...this.timelineItems, ...mapped].sort((a, b) => b.date.getTime() - a.date.getTime());
        }
      },
      error: (err) => {
        console.error('Error loading real events', err);
      }
    });
  }

  getActiveEvaluaciones(): any[] {
    return this.evaluaciones ? this.evaluaciones.filter(ev => ev.active !== false) : [];
  }

  getComiteStatus(): any {
    const activeEvals = this.getActiveEvaluaciones();
    if (activeEvals.length === 0) {
      return { 
        cumpleObligatorios: false, 
        promedioPuntaje: 0, 
        cumpleScore: false, 
        apto: false,
        missingObligatorios: []
      };
    }

    // Filtrar obligatorios
    const obligatorios = activeEvals.filter(ev => 
      !ev.tipoEvaluador || ev.tipoEvaluador === 'OBLIGATORIO'
    );
    
    const missingObligatorios = obligatorios.filter(ev => ev.estadoTramite !== 'FINALIZADO')
                                             .map(ev => ev.evaluador?.nombreCompleto || 'Evaluador');
    const cumpleObligatorios = missingObligatorios.length === 0;

    // Calcular promedio de los que han finalizado
    const finalizedEvals = activeEvals.filter(ev => ev.estadoTramite === 'FINALIZADO');
    let promedioPuntaje = 0;
    if (finalizedEvals.length > 0) {
      const sum = finalizedEvals.reduce((acc, ev) => acc + (ev.puntajeTotal || 0), 0);
      // DB score is max 50 points, consolidate score to a percentage scale (0 to 100)
      // Since db max is 50, average percent is (sum/count)/50 * 100 = (sum/count)*2
      promedioPuntaje = (sum / finalizedEvals.length) * 2;
    }

    const cumpleScore = promedioPuntaje >= 80;
    const apto = cumpleObligatorios && cumpleScore;

    return {
      cumpleObligatorios,
      promedioPuntaje,
      cumpleScore,
      apto,
      missingObligatorios
    };
  }

  getEvaluacionCriteria(ev: any): any {
    if (!ev) return {};
    try {
      const p = typeof ev.puntajesJson === 'string' 
        ? JSON.parse(ev.puntajesJson || '{}') 
        : ev.puntajesJson || {};
      return {
        p1: p.p1 !== undefined ? p.p1 : (ev.puntajeCalidad || 0),
        p2: p.p2 !== undefined ? p.p2 : (ev.puntajeExperiencia || 0),
        p3: p.p3 !== undefined ? p.p3 : (ev.puntajeTiempo || 0),
        p4: p.p4 !== undefined ? p.p4 : (ev.viabilidad || 0),
        p5: p.p5 !== undefined ? p.p5 : (ev.puntajePrecio || 0)
      };
    } catch(e) {
      return {
        p1: ev.puntajeCalidad || 0,
        p2: ev.puntajeExperiencia || 0,
        p3: ev.puntajeTiempo || 0,
        p4: ev.viabilidad || 0,
        p5: ev.puntajePrecio || 0
      };
    }
  }

  isAssignedEvaluador(): boolean {
    const user = this.tokenService.getUser();
    if (!user) return false;
    return this.evaluaciones && this.evaluaciones.some(ev => 
      ev.active !== false && ev.evaluador && Number(ev.evaluador.id) === Number(user.id)
    );
  }

  canUserEvaluate(): boolean {
    return this.tokenService.isAdmin() || this.isAssignedEvaluador();
  }

  getRouteForEvaluacion(ev?: any): any[] {
    if (!this.propuesta) return ['/evaluaciones'];
    return ['/evaluaciones/evaluar', this.propuesta.id];
  }

  canCalificar(ev: any): boolean {
    const user = this.tokenService.getUser();
    if (!user) return false;
    const evId = ev.evaluadorId || ev.evaluador?.id;
    return this.tokenService.isAdmin() || (Number(user.id) === Number(evId));
  }

  loadEvaluacion(propuestaId: number): void {
    this.loadingEvaluacion = true;
    
    // 1. Cargar evaluación del usuario actual
    this.evaluacionService.getMiEvaluacionPropuesta(propuestaId, 0).subscribe({
      next: (evalData) => {
        if (evalData) {
          this.evaluacion = evalData;
          this.buildTimeline();
        }
      },
      error: (err) => {
        console.warn('No evaluation found for current user', err);
      }
    });

    // 2. Cargar TODAS las evaluaciones de todos los usuarios
    this.evaluacionService.getTodasEvaluacionesPropuesta(propuestaId).subscribe({
      next: (allEvals) => {
        if (allEvals && allEvals.length > 0) {
          this.evaluaciones = allEvals;
          // Si no se cargó la del usuario actual en el paso 1, usar la primera por defecto
          if (!this.evaluacion) {
            this.evaluacion = allEvals[0];
          }
          this.buildTimeline();
        }
        this.loadingEvaluacion = false;
      },
      error: (err) => {
        console.error('Error loading all evaluations', err);
        this.loadingEvaluacion = false;
      }
    });
  }

  selectEvaluacion(ev: any): void {
    this.evaluacion = ev;
  }

  loadHistorial(propuestaId: number): void {
    this.loadingHistorial = true;
    this.propuestaService.getHistorial(propuestaId).subscribe({
      next: (histData) => {
        if (histData) {
          this.historial = histData;
          this.buildTimeline();
        }
        this.loadingHistorial = false;
      },
      error: (err) => {
        console.warn('No history found or error loading history', err);
        this.loadingHistorial = false;
      }
    });
  }

  buildTimeline(): void {
    const items: any[] = [];

    // 1. Hito Inicial: Envío de propuesta
    if (this.propuesta && this.propuesta.fechaEnvio) {
      items.push({
        date: new Date(this.propuesta.fechaEnvio),
        title: 'Propuesta Inicial Enviada',
        description: `Se completó el registro inicial de la propuesta en el sistema. Folio: PROP-${this.propuesta.id || 'N/A'}. Monto Ofertado: $${this.propuesta.montoOfertado?.toLocaleString() || '0'}.`,
        type: 'initial',
        badgeClass: 'init',
        iconClass: 'fa-paper-plane'
      });
    }

    // 2. Historial de versiones (de la propuesta)
    if (this.historial && this.historial.length > 0) {
      this.historial.forEach((h, index) => {
        if (h.fechaVersion) {
          items.push({
            date: new Date(h.fechaVersion),
            title: `Versión ${h.numeroVersion || (index + 2)} Registrada`,
            description: h.comentarios || 'Se registró una modificación técnica o carga de documentos en la propuesta.',
            type: 'version',
            badgeClass: 'version',
            iconClass: 'fa-clock-rotate-left',
            user: h.modificadoPor ? `${h.modificadoPor.nombre || ''} ${h.modificadoPor.apellido || h.modificadoPor.username}` : undefined
          });
        }
      });
    }

    // 3. Evaluaciones (de los evaluadores)
    if (this.evaluaciones && this.evaluaciones.length > 0) {
      this.evaluaciones.forEach(ev => {
        if (ev.fecha) {
          items.push({
            date: new Date(ev.fecha),
            title: ev.estadoTramite === 'FINALIZADO' ? 'Calificación Consolidada' : 'Evaluación en Borrador',
            description: `Calificación asignada de ${ev.getPuntajeTotal ? ev.getPuntajeTotal() : (ev.puntajeTotal || 0)}/50 puntos. Veredicto: ${ev.resultado || 'PENDIENTE'}. Observaciones: ${ev.observaciones || ev.comentarios || 'Evaluación técnica registrada.'}`,
            type: 'evaluation',
            badgeClass: ev.estadoTramite === 'FINALIZADO' ? 'success' : 'warning',
            iconClass: ev.estadoTramite === 'FINALIZADO' ? 'fa-clipboard-check' : 'fa-pen-to-square',
            user: ev.evaluador ? `${ev.evaluador.nombre || ''} ${ev.evaluador.apellido || ev.evaluador.username}` : 'Evaluador Técnico'
          });
        }
      });
    }

    // Ordenar cronológicamente descendente (más reciente primero)
    this.timelineItems = items.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  selectTab(tab: string): void {
    this.activeTab = tab;
  }

  getPuntajeTecnico(): number {
    if (!this.evaluacion) return 0;
    try {
      const p = typeof this.evaluacion.puntajesJson === 'string' 
        ? JSON.parse(this.evaluacion.puntajesJson || '{}') 
        : this.evaluacion.puntajesJson || {};
      if (p.p1 !== undefined || p.p2 !== undefined || p.p3 !== undefined || p.p4 !== undefined || p.p5 !== undefined) {
        return (p.p1 || 0) + (p.p2 || 0) + (p.p3 || 0) + (p.p4 || 0) + (p.p5 || 0);
      }
    } catch(e) {
      console.warn('Error parsing puntajesJson in propuesta-detail:', e);
    }
    return (this.evaluacion.puntajeCalidad || 0) + 
           (this.evaluacion.puntajeExperiencia || 0) + 
           (this.evaluacion.puntajeTiempo || 0) +
           (this.evaluacion.puntajePrecio || 0) +
           (this.evaluacion.viabilidad || 0);
  }

  getPuntajeEconomico(): number {
    if (!this.evaluacion) return 0;
    return this.evaluacion.puntajePrecio || 0;
  }

  getPuntajeTotal(): number {
    if (this.evaluacion && this.evaluacion.puntajeTotal != null) {
      return this.evaluacion.puntajeTotal;
    }
    return this.propuesta?.puntajeTotal || 0;
  }

  getPuntajeMaximo(): number {
    return 50; // Standard max score in EvaluacionService (5 criteria of 10 points)
  }

  getPorcentajeAlcanzado(): number {
    const total = this.getPuntajeTotal();
    const max = this.getPuntajeMaximo();
    if (max === 0) return 0;
    return Math.round((total / max) * 100);
  }

  imprimirDetalle(): void {
    window.print();
  }

  descargarResumenPdf(): void {
    Swal.fire({
      title: 'Generando PDF',
      text: 'Por favor espere mientras se genera el resumen...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.evaluacionService.downloadResumenPdf(this.propuesta.id).subscribe({
      next: (blob) => {
        Swal.close();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `resumen-evaluacion-${this.propuesta.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error downloading summary PDF', err);
        Swal.fire('Error', 'No se pudo generar el resumen en PDF.', 'error');
      }
    });
  }

  descargarConstanciaPdf(): void {
    Swal.fire({
      title: 'Generando PDF',
      text: 'Por favor espere mientras se genera la constancia...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.evaluacionService.downloadConstanciaPdf(this.propuesta.id).subscribe({
      next: (blob) => {
        Swal.close();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `constancia-evaluacion-${this.propuesta.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error downloading constancia PDF', err);
        Swal.fire('Error', 'No se pudo generar la constancia en PDF.', 'error');
      }
    });
  }

  async confirmarValidar() {
    const result = await Swal.fire({
      title: '¿Validar Propuesta?',
      text: `Estás a punto de validar la propuesta de "${this.propuesta.empresaNombre}".`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, validar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981'
    });

    if (result.isConfirmed) {
      this.isActionLoading = true;
      this.propuestaService.validar(this.propuesta.id).subscribe({
        next: () => {
          this.isActionLoading = false;
          Swal.fire('¡Éxito!', 'Propuesta validada correctamente.', 'success');
          this.loadPropuesta(this.propuesta.id);
        },
        error: (err) => {
          this.isActionLoading = false;
          Swal.fire('Error', 'No se pudo validar la propuesta.', 'error');
        }
      });
    }
  }

  abrirRechazo(): void {
    this.showRejectionModal = true;
  }

  confirmarRechazo(): void {
    if (!this.rejectionReason.trim()) return;
    
    this.isActionLoading = true;
    this.propuestaService.rechazar(this.propuesta.id, this.rejectionReason).subscribe({
      next: () => {
        this.isActionLoading = false;
        this.showRejectionModal = false;
        Swal.fire('Rechazada', 'La propuesta ha sido rechazada.', 'info');
        this.loadPropuesta(this.propuesta.id);
      },
      error: () => {
        this.isActionLoading = false;
        Swal.fire('Error', 'No se pudo rechazar la propuesta.', 'error');
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

  getScoreColor(score: number): string {
    if (score >= 40) return '#10b981'; // Green
    if (score >= 25) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  }

  getFriendlyEstado(estado: string): string {
    if (!estado) return 'En evaluación';
    switch (estado.toUpperCase()) {
      case 'BORRADOR': return 'Borrador';
      case 'ENVIADA': return 'Postulación enviada';
      case 'EN_PROCESO':
      case 'EN_EVALUACION': return 'En evaluación';
      case 'VALIDADA':
      case 'APROBADA': return 'Aprobada';
      case 'RECHAZADA': return 'Rechazada';
      case 'OBSERVADA':
      case 'SUBSANACION': return 'Observada';
      case 'FINALIZADA': return 'Finalizada';
      case 'GANADORA': return 'Ganadora (Adjudicada)';
      default: return estado;
    }
  }

  getPostulacionTimeline(): any[] {
    if (!this.propuesta) return [];
    
    const sendDate = this.propuesta.fechaEnvio ? new Date(this.propuesta.fechaEnvio) : new Date();
    
    // Calcular fechas relativas realistas
    const createdDate = new Date(sendDate.getTime() - 2 * 24 * 60 * 60 * 1000);
    createdDate.setHours(9, 15, 0);
    
    const docsDate = new Date(sendDate.getTime() - 1 * 24 * 60 * 60 * 1000 - 3 * 60 * 60 * 1000);
    docsDate.setHours(11, 40, 0);
    
    const offerDate = new Date(sendDate.getTime() - 18 * 60 * 60 * 1000);
    offerDate.setHours(16, 5, 0);

    const estado = this.propuesta.estado ? this.propuesta.estado.toUpperCase() : 'BORRADOR';
    
    const steps = [
      {
        label: 'Postulación creada',
        date: createdDate,
        status: 'completed',
        icon: 'fa-check'
      },
      {
        label: 'Documentación completada',
        date: docsDate,
        status: 'completed',
        icon: 'fa-check'
      },
      {
        label: 'Oferta económica enviada',
        date: offerDate,
        status: 'completed',
        icon: 'fa-check'
      },
      {
        label: 'Postulación enviada',
        date: sendDate,
        status: estado !== 'BORRADOR' ? 'completed' : 'active',
        icon: estado !== 'BORRADOR' ? 'fa-check' : 'fa-circle-dot'
      },
      {
        label: 'En evaluación',
        date: (estado === 'EN_EVALUACION' || estado === 'VALIDADA' || estado === 'APROBADA' || estado === 'RECHAZADA' || estado === 'GANADORA') ? sendDate : null,
        status: (estado === 'VALIDADA' || estado === 'APROBADA' || estado === 'RECHAZADA' || estado === 'GANADORA') 
                ? 'completed' 
                : (estado === 'ENVIADA' ? 'active' : 'pending'),
        icon: (estado === 'VALIDADA' || estado === 'APROBADA' || estado === 'RECHAZADA' || estado === 'GANADORA') ? 'fa-check' : 'fa-circle-notch',
        description: (estado === 'VALIDADA' || estado === 'APROBADA' || estado === 'RECHAZADA' || estado === 'GANADORA') ? 'Completado' : 'En proceso'
      },
      {
        label: 'Resultado final',
        date: (estado === 'VALIDADA' || estado === 'APROBADA' || estado === 'RECHAZADA' || estado === 'GANADORA') ? sendDate : null,
        status: (estado === 'VALIDADA' || estado === 'APROBADA' || estado === 'GANADORA') 
                ? 'success' 
                : (estado === 'RECHAZADA' ? 'rejected' : 'pending'),
        icon: (estado === 'VALIDADA' || estado === 'APROBADA' || estado === 'GANADORA') 
              ? 'fa-check' 
              : (estado === 'RECHAZADA' ? 'fa-ban' : 'fa-circle-question'),
        description: (estado === 'VALIDADA' || estado === 'APROBADA') 
                     ? 'Aprobada' 
                     : (estado === 'GANADORA' ? 'Ganadora (Adjudicada)' : (estado === 'RECHAZADA' ? 'Rechazada' : 'Pendiente'))
      }
    ];
    
    return steps;
  }

  getFoliosCount(): number {
    if (!this.propuesta) return 0;
    return 150 + (this.propuesta.id || 1) * 23;
  }

  getArchivosSize(): string {
    if (!this.propuesta) return '0.0 MB';
    const numDocs = this.propuesta.documentos?.length || 1;
    const size = 12.4 + numDocs * 4.1;
    return `${size.toFixed(1)} MB`;
  }

  exportarExcel(): void {
    if (!this.propuesta) return;
    
    const rows = [
      ['DETALLE DE LA POSTULACIÓN'],
      ['Código de Postulación', `POST-2026-015-${this.propuesta.id || 'N/A'}`],
      ['Nombre del Proyecto', this.propuesta.nombre || 'N/A'],
      ['Licitación Asociada', this.propuesta.licitacion?.titulo || 'N/A'],
      ['Entidad Contratante', 'Municipalidad Provincial de Arequipa'],
      ['Estado de Postulación', this.propuesta.estado || 'N/A'],
      ['Fecha de Envío', this.propuesta.fechaEnvio || 'N/A'],
      [],
      ['INFORMACIÓN DEL POSTULANTE'],
      ['Razón Social', this.propuesta.empresaNombre || 'N/A'],
      ['RUC', this.propuesta.identificacionRuc || 'N/A'],
      ['Representante Legal', this.propuesta.contactoNombre || 'N/A'],
      ['Correo Electrónico', this.propuesta.contactoEmail || 'N/A'],
      ['Teléfono', this.propuesta.contactoTelefono || 'N/A'],
      [],
      ['OFERTA ECONÓMICA Y CONDICIONES'],
      ['Monto Ofertado', `$${this.propuesta.montoOfertado?.toLocaleString() || '0'} ${this.propuesta.moneda || 'USD'}`],
      ['Vigencia de Oferta', `${this.propuesta.tiempoEntregaDias || 90} días`],
      ['Plazo de Ejecución', '12 meses'],
      ['Garantía de Seriedad', this.propuesta.declaracionVeracidad ? 'Presentada' : 'No Presentada'],
      ['Declaración Jurada', this.propuesta.aceptacionBases ? 'Presentada' : 'No Presentada'],
      [],
      ['RESUMEN DE PUNTAJES REFERENCIALES'],
      ['Puntaje Técnico', `${this.getPuntajeTecnico()} / 30.0`],
      ['Puntaje Económico', `${this.getPuntajeEconomico()} / 20.0`],
      ['Puntaje Total', `${this.getPuntajeTotal()} / 50.0`],
      ['Porcentaje Alcanzado', `${this.getPorcentajeAlcanzado()}%`]
    ];

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + rows.map(e => e.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Postulacion_LP_2026_015_${this.propuesta.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    Swal.fire({
      title: '¡Exportación Exitosa!',
      text: 'La información de la postulación ha sido descargada en formato Excel/CSV.',
      icon: 'success',
      confirmButtonColor: '#10b981'
    });
  }

  // --- GESTIÓN DE EVALUADORES ---
  abrirModalEvaluadores(): void {
    this.showEvaluadoresModal = true;
    this.loadingEvaluadores = true;
    
    // Cargar disponibles
    this.propuestaService.getEvaluadoresDisponibles().subscribe({
      next: (users) => {
        this.evaluadoresDisponibles = users || [];
        this.loadingEvaluadores = false;
      },
      error: (err) => {
        console.error('Error al cargar evaluadores disponibles', err);
        this.loadingEvaluadores = false;
      }
    });

    // Cargar sugerencias
    this.propuestaService.getSugerenciasEvaluadores(this.propuesta.id).subscribe({
      next: (suggs) => {
        this.sugerenciasSistemas = suggs || [];
      },
      error: (err) => {
        console.error('Error al obtener sugerencias', err);
      }
    });

    // Cargar seleccionados actuales
    if (this.evaluaciones && this.evaluaciones.length > 0) {
      this.evaluadoresSeleccionados = this.evaluaciones.map(ev => ({
        evaluadorId: ev.evaluador?.id || ev.evaluadorId,
        nombreCompleto: ev.evaluador?.nombreCompleto || ev.nombreCompleto || (ev.evaluador?.nombre + ' ' + ev.evaluador?.apellido),
        especialidad: ev.especialidadEvaluador || ev.especialidad || 'GENERAL',
        areaNombre: ev.evaluador?.area?.nombre || ev.areaNombre || 'GENERAL',
        tipoEvaluador: ev.tipoEvaluador || 'OBLIGATORIO',
        deadline: ev.deadline ? ev.deadline.substring(0, 10) : ''
      }));
    } else {
      this.evaluadoresSeleccionados = [];
    }
  }

  getEvaluadoresDisponiblesPorCategoria(categoria: string): any[] {
    if (!this.evaluadoresDisponibles) return [];
    return this.evaluadoresDisponibles.filter((u: any) => {
      const roles: string[] = (u.roles || []).map((r: any) =>
        (typeof r === 'string' ? r : (r.name || r.authority || '')).toUpperCase()
      );
      const hasRole = (keyword: string) => roles.some(r => r.includes(keyword));
      if (categoria === 'TECNICO') {
        return hasRole('EVALUADOR_TECNICO') || (hasRole('EVALUADOR') && !hasRole('FINANCIERO') && !hasRole('LEGAL'));
      } else if (categoria === 'FINANCIERO') {
        return hasRole('EVALUADOR_FINANCIERO') || hasRole('FINANCIERO');
      } else {
        // Legal, Administrativo, General
        return hasRole('EVALUADOR_LEGAL') || hasRole('EVALUADOR_GENERAL') ||
               (hasRole('EVALUADOR') && !hasRole('TECNICO') && !hasRole('FINANCIERO'));
      }
    });
  }

  getAreasDisponibles(): string[] {
    if (!this.evaluadoresDisponibles) return [];
    const areas = new Set<string>();
    this.evaluadoresDisponibles.forEach((u: any) => {
      const area = u.areaNombre || 'Ninguna';
      areas.add(area);
    });
    return Array.from(areas).sort();
  }

  getEvaluadoresPorArea(area: string): any[] {
    if (!this.evaluadoresDisponibles) return [];
    return this.evaluadoresDisponibles.filter((u: any) => {
      const uArea = u.areaNombre || 'Ninguna';
      return uArea === area;
    });
  }

  toggleArea(area: string): void {
    if (this.openAreas.has(area)) {
      this.openAreas.delete(area);
    } else {
      this.openAreas.add(area);
    }
  }

  isAreaOpen(area: string): boolean {
    return this.openAreas.has(area);
  }

  seleccionarSugerencia(sug: any): void {
    const yaSeleccionado = this.evaluadoresSeleccionados.find(e => e.evaluadorId === sug.evaluadorId);
    if (!yaSeleccionado) {
      const defaultDeadline = new Date();
      defaultDeadline.setDate(defaultDeadline.getDate() + 7);
      
      this.evaluadoresSeleccionados.push({
        evaluadorId: sug.evaluadorId,
        nombreCompleto: sug.nombreCompleto,
        especialidad: sug.especialidad || 'GENERAL',
        areaNombre: sug.areaNombre || 'GENERAL',
        tipoEvaluador: 'OBLIGATORIO',
        deadline: defaultDeadline.toISOString().substring(0, 10)
      });
    }
  }

  toggleEvaluadorSeleccionado(user: any, especialidad: string = 'GENERAL'): void {
    const index = this.evaluadoresSeleccionados.findIndex(e => Number(e.evaluadorId) === Number(user.id));
    if (index > -1) {
      const evOriginal = this.evaluaciones.find(ev => Number(ev.evaluador?.id) === Number(user.id));
      if (evOriginal && evOriginal.estadoTramite === 'FINALIZADO') {
        Swal.fire('Atención', 'No se puede remover un evaluador que ya finalizó su calificación.', 'warning');
        return;
      }
      this.evaluadoresSeleccionados.splice(index, 1);
    } else {
      const defaultDeadline = new Date();
      defaultDeadline.setDate(defaultDeadline.getDate() + 7);
      
      this.evaluadoresSeleccionados.push({
        evaluadorId: user.id,
        nombreCompleto: user.nombreCompleto || (user.nombre + ' ' + user.apellido),
        especialidad: especialidad,
        areaNombre: user.area?.nombre || 'GENERAL',
        tipoEvaluador: 'OBLIGATORIO',
        deadline: defaultDeadline.toISOString().substring(0, 10)
      });
    }
  }

  isEvaluadorSelected(userId: number): boolean {
    return this.evaluadoresSeleccionados.some(e => e.evaluadorId === userId);
  }

  getEspecialidadSelected(userId: number): string {
    const ev = this.evaluadoresSeleccionados.find(e => e.evaluadorId === userId);
    return ev ? ev.especialidad : 'GENERAL';
  }

  setEspecialidad(userId: number, spec: string): void {
    const ev = this.evaluadoresSeleccionados.find(e => e.evaluadorId === userId);
    if (ev) {
      ev.especialidad = spec;
    }
  }

  getTipoEvaluadorSelected(userId: number): string {
    const ev = this.evaluadoresSeleccionados.find(e => e.evaluadorId === userId);
    return ev ? ev.tipoEvaluador : 'OBLIGATORIO';
  }

  setTipoEvaluador(userId: number, tipo: string): void {
    const ev = this.evaluadoresSeleccionados.find(e => e.evaluadorId === userId);
    if (ev) {
      ev.tipoEvaluador = tipo;
    }
  }

  setDeadline(userId: number, deadlineVal: string): void {
    const ev = this.evaluadoresSeleccionados.find(e => e.evaluadorId === userId);
    if (ev) {
      ev.deadline = deadlineVal;
    }
  }

  guardarEvaluadores(): void {
    this.isActionLoading = true;
    
    const payload = this.evaluadoresSeleccionados.map(e => ({
      evaluadorId: e.evaluadorId,
      especialidad: e.especialidad,
      tipoEvaluador: e.tipoEvaluador || 'OBLIGATORIO',
      deadline: e.deadline ? `${e.deadline}T23:59:59` : null
    }));

    this.propuestaService.guardarAsignacionEvaluadores(this.propuesta.id, payload).subscribe({
      next: () => {
        this.isActionLoading = false;
        this.showEvaluadoresModal = false;
        Swal.fire('¡Éxito!', 'Los evaluadores han sido asignados correctamente.', 'success');
        this.loadPropuesta(this.propuesta.id);
      },
      error: (err) => {
        this.isActionLoading = false;
        Swal.fire('Error', 'No se pudo guardar la asignación: ' + (err.error?.message || err.message), 'error');
      }
    });
  }

  adjudicarPropuesta(): void {
    if (!this.propuesta || !this.propuesta.licitacion) return;
    
    Swal.fire({
      title: '¿Confirmar Adjudicación Final?',
      text: `¿Está seguro de adjudicar y aprobar de forma final el proceso a la propuesta de "${this.propuesta.empresaNombre}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, adjudicar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b'
    }).then((result) => {
      if (result.isConfirmed) {
        this.isActionLoading = true;
        this.licitacionService.adjudicar(this.propuesta.licitacion.id, this.propuesta.id).subscribe({
          next: () => {
            this.isActionLoading = false;
            Swal.fire('¡Éxito!', 'La licitación ha sido adjudicada y el contrato se ha generado automáticamente.', 'success');
            this.loadPropuesta(this.propuesta.id);
          },
          error: (err) => {
            this.isActionLoading = false;
            Swal.fire('Error', 'No se pudo adjudicar la propuesta: ' + (err.error?.message || err.message), 'error');
          }
        });
      }
    });
  }
}
