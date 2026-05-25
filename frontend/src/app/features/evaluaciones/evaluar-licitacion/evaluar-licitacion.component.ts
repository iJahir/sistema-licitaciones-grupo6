import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EvaluacionService } from '../../../core/services/evaluacion.service';
import { PropuestaService } from '../../../core/services/propuesta.service';
import { RubricaService } from '../../../core/services/rubrica.service';
import { UsuarioService } from '../../../core/services/usuario.service';
import { TokenService } from '../../../core/services/token.service';
import { LicitacionService } from '../../../core/services/licitacion.service';
import Swal from 'sweetalert2';
import { API_CONFIG } from '../../../core/config/api-config';

@Component({
  selector: 'app-evaluar-licitacion',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './evaluar-licitacion.component.html',
  styleUrl: './evaluar-licitacion.component.scss'
})
export class EvaluarLicitacionComponent implements OnInit {
  propuestaId!: number;
  propuesta: any;
  licitacion: any;
  evaluacionForm: FormGroup;
  criteriosOnly = false;
  selectedFile: File | null = null;
  isLoading = true;
  isSubmitting = false;
  isReadOnly = true; // Por defecto empezamos en lectura
  isEditable = false; // Control de edición de la propia evaluación
  evaluacionActual: any = null;
  todasEvaluaciones: any[] = [];
  evaluacionSeleccionada: any = null;
  isAdmin = false;
  isGestor = false;
  evaluadoresDisponibles: any[] = [];
  isDraggingOver = false;

  preguntasLibres = [
    { id: 'r1', label: 'Cumplimiento y Puntualidad', placeholder: 'Ej: Cumple con los plazos, historial de entrega...' },
    { id: 'r2', label: 'Análisis de Fortalezas y Debilidades', placeholder: 'Ej: Experiencia técnica, solvencia, puntos débiles...' },
    { id: 'r3', label: 'Conclusiones y Recomendación', placeholder: 'Ej: Se recomienda adjudicar por X motivos...' }
  ];

  preguntasPorArea: { [key: string]: string[] } = {
    'FINANZAS': [
      '¿El precio es competitivo?',
      '¿Cumple con requisitos financieros?',
      '¿La estructura de costos es clara?',
      '¿El riesgo financiero es bajo?',
      '¿El ROI es favorable?'
    ],
    'TI': [
      '¿La solución técnica es adecuada?',
      '¿Cumple requisitos funcionales?',
      '¿Es escalable?',
      '¿Cumple estándares de seguridad?',
      '¿Arquitectura correcta?'
    ],
    'LOGISTICA': [
      '¿Tiempo de entrega adecuado?',
      '¿Capacidad operativa suficiente?',
      '¿Distribución eficiente?',
      '¿Cobertura adecuada?',
      '¿Experiencia comprobada?'
    ],
    'RRHH': [
      '¿Perfil adecuado?',
      '¿Experiencia del equipo?',
      '¿Cumple normativa laboral?',
      '¿Equipo competente?',
      '¿Propuesta clara?'
    ],
    'OPERACIONES': [
      '¿Viabilidad operativa?',
      '¿Optimiza procesos?',
      '¿Reduce costos?',
      '¿Implementación fácil?',
      '¿Impacto bajo?'
    ],
    'COMERCIAL': [
      '¿Valor comercial?',
      '¿Potencial de crecimiento?',
      '¿Competitividad?',
      '¿Mejora posicionamiento?',
      '¿Proveedor confiable?'
    ],
    'JURIDICO': [
      '¿Cumple normativas?',
      '¿Contrato claro?',
      '¿Riesgos legales bajos?',
      '¿Cláusulas favorables?',
      '¿Antecedentes adecuados?'
    ]
  };

  preguntasActuales: string[] = [];
  totalPuntaje = 0;
  estrellas = 0;

  activeTab = 'resumen';
  historial: any[] = [];
  timelineItems: any[] = [];
  loadingHistorial = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private evaluacionService: EvaluacionService,
    private propuestaService: PropuestaService,
    private rubricaService: RubricaService,
    private usuarioService: UsuarioService,
    private tokenService: TokenService,
    private licitacionService: LicitacionService
  ) {
    this.evaluacionForm = this.fb.group({
      p1: [0, [Validators.required, Validators.min(0), Validators.max(10)]],
      p2: [0, [Validators.required, Validators.min(0), Validators.max(10)]],
      p3: [0, [Validators.required, Validators.min(0), Validators.max(10)]],
      p4: [0, [Validators.required, Validators.min(0), Validators.max(10)]],
      p5: [0, [Validators.required, Validators.min(0), Validators.max(10)]],
      observaciones: ['', [Validators.required, Validators.minLength(10)]],
      resultado: ['PENDIENTE', Validators.required],
      sinConflictoInteres: [true, Validators.requiredTrue],
      estadoTramite: ['BORRADOR'],
      puntajeTotal: [0],
      puntajesJson: [''],
      respuestasJson: [''],
      r1: ['', Validators.required],
      r2: ['', Validators.required],
      r3: ['', Validators.required],
      estrellas: [0]
    });

    // Escuchar cambios para calcular el total en tiempo real
    this.evaluacionForm.valueChanges.subscribe(() => {
      this.calculateTotal();
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.criteriosOnly = params['criterios'] === 'true' || params['criteriosOnly'] === 'true';
    });

    const id = this.route.snapshot.paramMap.get('propuestaId');
    if (id) {
      this.propuestaId = +id;
      this.checkUserRole();
      this.loadData();
    }
  }

  loadData(): void {
    this.isLoading = true;
    
    // Primero, cargamos todas las evaluaciones existentes para esta propuesta
    this.evaluacionService.getTodasEvaluacionesPropuesta(this.propuestaId).subscribe({
      next: (evaluaciones: any[]) => {
        this.todasEvaluaciones = evaluaciones || [];
        this.loadEvaluadoresDisponibles();
        
        if (this.isGestor) {
          if (this.todasEvaluaciones.length > 0) {
            this.selectEvaluacion(this.todasEvaluaciones[0]);
          } else {
            this.evaluacionService.getPropuestaInfo(this.propuestaId).subscribe({
              next: (propuesta: any) => {
                this.propuesta = propuesta;
                this.licitacion = propuesta.licitacion;
                if (this.licitacion && this.licitacion.id) {
                  this.licitacionService.getById(this.licitacion.id).subscribe({
                    next: (fullLic: any) => this.licitacion = fullLic
                  });
                }
                this.setPreguntas(this.licitacion.area?.nombre);
                this.loadHistorial(this.propuestaId);
                this.evaluacionActual = null;
                this.evaluacionSeleccionada = null;
                this.isReadOnly = true;
                this.isEditable = false;
                this.evaluacionForm.disable();
                this.isLoading = false;
              },
              error: (err: any) => {
                console.error('Error cargando propuesta para gestor:', err);
                this.isLoading = false;
              }
            });
            return;
          }
          this.isLoading = false;
          return;
        }
        
        // Luego, cargamos la evaluación del usuario logueado actual
        this.evaluacionService.getMiEvaluacionPropuesta(this.propuestaId, 0).subscribe({
          next: (evaluacion: any) => {
            if (evaluacion && evaluacion.propuesta) {
              this.propuesta = evaluacion.propuesta;
              this.licitacion = evaluacion.propuesta.licitacion;
              if (this.licitacion && this.licitacion.id) {
                this.licitacionService.getById(this.licitacion.id).subscribe({
                  next: (fullLic: any) => this.licitacion = fullLic
                });
              }
              
              // Asegurar que evaluacion tenga el evaluador asignado si viene nulo
              if (evaluacion && !evaluacion.evaluador) {
                const currentUser = this.tokenService.getUser() || {};
                evaluacion.evaluador = currentUser?.id ? currentUser : null;
              }
              
              this.evaluacionActual = evaluacion;
              
              this.setPreguntas(this.licitacion.area?.nombre);
              this.loadHistorial(this.propuestaId);

              // Asegurar que nuestra propia evaluación esté en la lista para que su chip sea visible
              const hasOwnEvalInList = this.todasEvaluaciones.some(ev => 
                (ev.id && evaluacion.id && ev.id === evaluacion.id) || 
                (ev.evaluador && evaluacion.evaluador && Number(ev.evaluador.id) === Number(evaluacion.evaluador.id))
              );
              
              if (!hasOwnEvalInList && evaluacion.evaluador) {
                this.todasEvaluaciones.unshift(evaluacion);
              }

              // Siempre seleccionar la del usuario logueado por defecto para editarla de inmediato
              this.selectEvaluacion(evaluacion);
              this.isLoading = false;
            } else {
              this.loadPropuestaOnly();
            }
          },
          error: (err: any) => {
            console.error('Error cargando mi evaluacion:', err);
            this.loadPropuestaOnly();
          }
        });
      },
      error: (err: any) => {
        console.error('Error cargando todas las evaluaciones:', err);
        if (this.isGestor) {
          this.isLoading = false;
          Swal.fire('Error', 'No se pudieron cargar las evaluaciones.', 'error');
        } else {
          this.loadStandardMiEvaluacion();
        }
      }
    });
  }

  loadStandardMiEvaluacion(): void {
    this.evaluacionService.getMiEvaluacionPropuesta(this.propuestaId, 0).subscribe({
      next: (evaluacion: any) => {
        if (evaluacion && evaluacion.propuesta) {
          this.propuesta = evaluacion.propuesta;
          this.licitacion = evaluacion.propuesta.licitacion;
          if (this.licitacion && this.licitacion.id) {
            this.licitacionService.getById(this.licitacion.id).subscribe({
              next: (fullLic: any) => this.licitacion = fullLic
            });
          }
          
          if (evaluacion && !evaluacion.evaluador) {
            const currentUser = this.tokenService.getUser() || {};
            evaluacion.evaluador = currentUser?.id ? currentUser : null;
          }
          
          this.evaluacionActual = evaluacion;
          
          this.setPreguntas(this.licitacion.area?.nombre);
          
          const hasOwnEvalInList = this.todasEvaluaciones.some(ev => 
            (ev.id && evaluacion.id && ev.id === evaluacion.id) || 
            (ev.evaluador && evaluacion.evaluador && Number(ev.evaluador.id) === Number(evaluacion.evaluador.id))
          );
          if (!hasOwnEvalInList && evaluacion.evaluador) {
            this.todasEvaluaciones.unshift(evaluacion);
          }
          
          this.selectEvaluacion(evaluacion);
          this.isLoading = false;
        } else {
          this.loadPropuestaOnly();
        }
      },
      error: (err: any) => {
        console.error('Error fallback mi evaluacion:', err);
        this.loadPropuestaOnly();
      }
    });
  }

  selectEvaluacion(evaluacion: any): void {
    if (!evaluacion) return;
    this.evaluacionSeleccionada = evaluacion;
    
    if (this.isGestor) {
      this.isEditable = false;
      this.isReadOnly = true;
      this.evaluacionForm.disable();
    } else {
      // Obtener rol del usuario para permitir sólo editar la suya propia
      const currentUser = this.tokenService.getUser() || {};
      const isOwnEvaluation = !evaluacion.evaluador || Number(evaluacion.evaluador.id) === Number(currentUser.id);
      const isSuperAdmin = currentUser.roles && currentUser.roles.some((r: any) => {
        const rName = (typeof r === 'string' ? r : (r.name || r.authority || '')).toUpperCase();
        return rName.includes('SUPER_ADMIN') || rName.includes('ADMINISTRADOR') || rName.includes('ADMIN');
      });
      
      const estadoTramite = (evaluacion.estadoTramite || '').toUpperCase();
      const resultado = (evaluacion.resultado || '').toUpperCase();
      
      const isFinalized = estadoTramite === 'FINALIZADO' || 
                          resultado === 'APROBADO' || 
                          resultado === 'RECHAZADO';
      
      // Es editable si NO está finalizada y es el dueño de la evaluación o SUPER_ADMIN
      this.isEditable = !isFinalized && (isOwnEvaluation || isSuperAdmin);
      
      // Si la evaluación es editable, la abrimos en modo edición inmediatamente; de lo contrario, en modo lectura
      if (this.isEditable) {
        this.isReadOnly = false;
        this.evaluacionForm.enable();
      } else {
        this.isReadOnly = true;
        this.evaluacionForm.disable();
      }
    }

    // Detectar si el evaluador no ha iniciado su evaluación (JSON nulo)
    const hasNotStarted = !evaluacion.puntajesJson || evaluacion.puntajesJson === 'null';

    try {
      if (hasNotStarted) {
        // Evaluador asignado pero no ha evaluado — dejar todo limpio
        this.evaluacionForm.patchValue({
          p1: 0, p2: 0, p3: 0, p4: 0, p5: 0,
          observaciones: '',
          resultado: 'PENDIENTE',
          estadoTramite: evaluacion.estadoTramite || 'BORRADOR',
          sinConflictoInteres: evaluacion.sinConflictoInteres !== undefined ? evaluacion.sinConflictoInteres : true,
          r1: '', r2: '', r3: ''
        });
      } else {
        const puntajes = typeof evaluacion.puntajesJson === 'string' 
          ? JSON.parse(evaluacion.puntajesJson || '{}')
          : evaluacion.puntajesJson || {};
          
        this.evaluacionForm.patchValue({
          p1: puntajes.p1 || 0,
          p2: puntajes.p2 || 0,
          p3: puntajes.p3 || 0,
          p4: puntajes.p4 || 0,
          p5: puntajes.p5 || 0,
          observaciones: evaluacion.observaciones || evaluacion.comentarios || '',
          resultado: evaluacion.resultado || 'PENDIENTE',
          estadoTramite: evaluacion.estadoTramite || 'BORRADOR',
          sinConflictoInteres: evaluacion.sinConflictoInteres !== undefined ? evaluacion.sinConflictoInteres : true
        });

        if (evaluacion.respuestasJson && evaluacion.respuestasJson !== 'null') {
          try {
            const respuestas = typeof evaluacion.respuestasJson === 'string'
              ? JSON.parse(evaluacion.respuestasJson)
              : evaluacion.respuestasJson;
            this.evaluacionForm.patchValue({
              r1: respuestas.r1 || '',
              r2: respuestas.r2 || '',
              r3: respuestas.r3 || ''
            });
          } catch (e) { console.error('Error parseando respuestas:', e); }
        } else {
          this.evaluacionForm.patchValue({
            r1: '',
            r2: '',
            r3: ''
          });
        }
      }
    } catch (e) { console.error('Error asignando valores de evaluación:', e); }
    
    this.calculateTotal();
  }

  loadPropuestaOnly(): void {
    this.evaluacionService.getPropuestaInfo(this.propuestaId).subscribe({
      next: (propuesta: any) => {
        this.propuesta = propuesta;
        this.licitacion = propuesta.licitacion;
        if (this.licitacion && this.licitacion.id) {
          this.licitacionService.getById(this.licitacion.id).subscribe({
            next: (fullLic: any) => this.licitacion = fullLic
          });
        }
        this.setPreguntas(this.licitacion.area?.nombre);
        this.loadHistorial(this.propuestaId);
        
        const currentUser = this.tokenService.getUser() || {};
        const nuevaEvaluacion = {
          propuesta,
          evaluador: currentUser?.id ? currentUser : null,
          estadoTramite: 'BORRADOR',
          resultado: 'PENDIENTE',
          sinConflictoInteres: true,
          puntajesJson: null,
          respuestasJson: null,
          puntajeTotal: 0,
          estrellas: 0
        };
        this.evaluacionActual = nuevaEvaluacion;
        
        const hasOwnEvalInList = this.todasEvaluaciones.some(ev => 
          (ev.evaluador && nuevaEvaluacion.evaluador && Number(ev.evaluador.id) === Number(nuevaEvaluacion.evaluador.id))
        );
        if (!hasOwnEvalInList && nuevaEvaluacion.evaluador) {
          this.todasEvaluaciones.unshift(nuevaEvaluacion);
        }

        this.selectEvaluacion(nuevaEvaluacion);
        this.loadEvaluadoresDisponibles();
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Error cargando propuesta:', err);
        this.isLoading = false;
      }
    });
  }

  setPreguntas(areaNombre: string): void {
    const areaKey = areaNombre ? areaNombre.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : 'TI';
    this.preguntasActuales = this.preguntasPorArea[areaKey] || this.preguntasPorArea['TI'];
  }

  getPreguntaDescription(index: number): string {
    const descriptions = [
      'Analizar la pertinencia y adecuación de la solución propuesta frente a los requerimientos.',
      'Verificar el cumplimiento de todos los requisitos funcionales solicitados.',
      'Evaluar la capacidad de la solución para crecer y adaptarse a futuras necesidades.',
      'Revisar el cumplimiento de estándares y buenas prácticas de seguridad.',
      'Evaluar la calidad, diseño y adecuación de la arquitectura propuesta.'
    ];
    return descriptions[index] || 'Evaluar el cumplimiento técnico y de calidad de la propuesta.';
  }

  calculateTotal(): void {
    const vals = this.evaluacionForm.getRawValue(); // Usar getRawValue para obtener datos incluso si el form está deshabilitado
    this.totalPuntaje = (vals.p1 || 0) + (vals.p2 || 0) + (vals.p3 || 0) + (vals.p4 || 0) + (vals.p5 || 0);
    this.estrellas = Math.ceil(this.totalPuntaje / 10);
    if (this.estrellas < 1 && this.totalPuntaje > 0) this.estrellas = 1;
    if (this.estrellas > 5) this.estrellas = 5;
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      this.selectedFile = file;
    } else {
      Swal.fire('Atención', 'Solo se permiten archivos PDF', 'warning');
      event.target.value = '';
    }
  }

  getScoreColor(score: number): string {
    if (score >= 8) return '#10b981';
    if (score >= 5) return '#fbbf24';
    return '#ef4444';
  }

  downloadIndividual(url: string, filename: string): void {
    window.open(this.getDownloadUrl(url), '_blank');
  }

  downloadZip(): void {
    if (!this.licitacion) return;
    this.evaluacionService.downloadZip(this.licitacion.id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `LIC-${this.licitacion.id}-documentos.zip`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err: any) => Swal.fire('Error', 'No se pudo descargar el ZIP de bases', 'error')
    });
  }

  saveDraft(): void {
    this.evaluacionForm.patchValue({ estadoTramite: 'BORRADOR' });
    this.submit(true);
  }

  finalize(): void {
    if (this.evaluacionForm.invalid) {
      this.evaluacionForm.markAllAsTouched();
      Swal.fire('Formulario Incompleto', 'Por favor complete todos los campos obligatorios antes de finalizar.', 'info');
      return;
    }

    // Validar que se haya seleccionado APTO o NO APTO explícitamente
    const resultado = this.evaluacionForm.get('resultado')?.value;
    if (!resultado || resultado === 'PENDIENTE' || resultado === '') {
      Swal.fire({
        icon: 'warning',
        title: 'Veredicto Obligatorio',
        html: `
          <div style="text-align: center; padding: 8px 0;">
            <p style="font-size: 15px; color: #374151; margin-bottom: 16px;">
              Debe seleccionar el veredicto final antes de publicar la evaluación:
            </p>
            <div style="display: flex; gap: 16px; justify-content: center; margin-top: 12px;">
              <div style="background: #d1fae5; border: 2px solid #10b981; border-radius: 12px; padding: 12px 24px;">
                <span style="font-size: 24px;">✅</span>
                <p style="font-weight: bold; color: #065f46; margin: 4px 0 0 0;">APTO</p>
              </div>
              <div style="background: #fee2e2; border: 2px solid #ef4444; border-radius: 12px; padding: 12px 24px;">
                <span style="font-size: 24px;">❌</span>
                <p style="font-weight: bold; color: #991b1b; margin: 4px 0 0 0;">NO APTO</p>
              </div>
            </div>
          </div>
        `,
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }

    this.evaluacionForm.patchValue({ estadoTramite: 'FINALIZADO' });
    this.submit(false);
  }

  submit(isDraft: boolean): void {
    if (this.isSubmitting) return;

    Swal.fire({
      title: isDraft ? 'Guardando Borrador...' : 'Publicando Evaluación...',
      html: 'Por favor espere un momento.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.isSubmitting = true;
    const vals = this.evaluacionForm.getRawValue();
    
    const puntajes = { p1: vals.p1, p2: vals.p2, p3: vals.p3, p4: vals.p4, p5: vals.p5 };
    
    const payload: any = {
      puntajesJson: JSON.stringify(puntajes),
      puntajeTotal: this.totalPuntaje,
      estrellas: this.estrellas,
      observaciones: vals.observaciones,
      comentarios: vals.observaciones,
      resultado: vals.resultado,
      estadoTramite: vals.estadoTramite,
      sinConflictoInteres: vals.sinConflictoInteres,
      respuestasJson: JSON.stringify({
        r1: vals.r1,
        r2: vals.r2,
        r3: vals.r3
      })
    };

    this.evaluacionService.saveEvaluacion(this.propuestaId, payload, this.selectedFile || undefined).subscribe({
      next: () => {
        this.isSubmitting = false;
        Swal.fire({
          title: '¡Operación Exitosa!',
          text: isDraft ? 'El borrador se guardó correctamente.' : 'La evaluación ha sido publicada con éxito.',
          icon: 'success',
          confirmButtonText: 'Listo',
          confirmButtonColor: '#3b82f6'
        }).then(() => {
          if (!isDraft) {
            window.location.reload();
          } else {
            this.router.navigate(['/evaluaciones']);
          }
        });
      },
      error: (err: any) => {
        console.error('Error guardando evaluación:', err);
        this.isSubmitting = false;
        Swal.fire('Error', 'No se pudo guardar la evaluación. Intente nuevamente.', 'error');
      }
    });
  }

  cancelar(): void {
    if (!this.isReadOnly) {
      this.isReadOnly = true;
      this.evaluacionForm.disable();
    } else {
      this.router.navigate(['/evaluaciones']);
    }
  }

  activarEdicion(): void {
    if (this.isEditable) {
      this.isReadOnly = false;
      this.evaluacionForm.enable();
    }
  }

  getDownloadUrl(path: string): string {
    if (!path) return '#';
    if (path.startsWith('http')) return path;
    const baseUrl = API_CONFIG.baseUrl.replace(/\/api\/$/, '');
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    return baseUrl + cleanPath;
  }

  getStatusClass(estado: string): string {
    if (!estado) return '';
    return estado.toLowerCase().replace('_', '-');
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
    if (this.todasEvaluaciones && this.todasEvaluaciones.length > 0) {
      this.todasEvaluaciones.forEach(ev => {
        if (ev.fecha) {
          items.push({
            date: new Date(ev.fecha),
            title: ev.estadoTramite === 'FINALIZADO' ? 'Calificación Consolidada' : 'Evaluación en Borrador',
            description: `Calificación asignada de ${ev.puntajeTotal || 0}/50 puntos. Veredicto: ${ev.resultado || 'PENDIENTE'}. Observaciones: ${ev.observaciones || ev.comentarios || 'Evaluación técnica registrada.'}`,
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
    const ev = this.evaluacionSeleccionada || this.evaluacionActual;
    if (!ev) return 0;
    try {
      const p = typeof ev.puntajesJson === 'string' ? JSON.parse(ev.puntajesJson || '{}') : ev.puntajesJson || {};
      return (p.p1 || 0) + (p.p2 || 0) + (p.p3 || 0) + (p.p4 || 0) + (p.p5 || 0);
    } catch(e) {
      return ev.puntajeTotal || 0;
    }
  }

  getPuntajeEconomico(): number {
    const ev = this.evaluacionSeleccionada || this.evaluacionActual;
    if (!ev) return 0;
    return ev.puntajePrecio || 0;
  }

  getPuntajeTotal(): number {
    const ev = this.evaluacionSeleccionada || this.evaluacionActual;
    if (ev && ev.puntajeTotal != null) {
      return ev.puntajeTotal;
    }
    return this.propuesta?.puntajeTotal || 0;
  }

  getPuntajeMaximo(): number {
    return 50;
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

    this.evaluacionService.downloadResumenPdf(this.propuestaId).subscribe({
      next: (blob) => {
        Swal.close();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `resumen-evaluacion-${this.propuestaId}.pdf`;
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

    this.evaluacionService.downloadConstanciaPdf(this.propuestaId).subscribe({
      next: (blob) => {
        Swal.close();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `constancia-evaluacion-${this.propuestaId}.pdf`;
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
    
    const sendDate = this.propuesta.fechaEnvio ? new Date(this.propuesta.fechaEnvio) : null;
    const estado = this.propuesta.estado ? this.propuesta.estado.toUpperCase() : 'BORRADOR';
    
    const steps = [
      {
        label: 'Postulación creada',
        date: sendDate,
        status: 'completed',
        icon: 'fa-check'
      },
      {
        label: 'Documentación completada',
        date: sendDate,
        status: (this.propuesta.documentos && this.propuesta.documentos.length > 0) ? 'completed' : 'pending',
        icon: (this.propuesta.documentos && this.propuesta.documentos.length > 0) ? 'fa-check' : 'fa-circle-question'
      },
      {
        label: 'Oferta económica enviada',
        date: sendDate,
        status: (this.propuesta.montoOfertado && this.propuesta.montoOfertado > 0) ? 'completed' : 'pending',
        icon: (this.propuesta.montoOfertado && this.propuesta.montoOfertado > 0) ? 'fa-check' : 'fa-circle-question'
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
                : (estado === 'ENVIADA' || estado === 'EN_EVALUACION' ? 'active' : 'pending'),
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
    if (!this.propuesta || !this.propuesta.documentos) return 0;
    return this.propuesta.documentos.length;
  }

  getArchivosSize(): string {
    if (!this.propuesta || !this.propuesta.documentos || this.propuesta.documentos.length === 0) {
      return 'N/D';
    }
    // Estimated average size per document (1.5 MB) since DB doesn't store exact sizes
    const numDocs = this.propuesta.documentos.length;
    const size = numDocs * 1.5;
    return `${size.toFixed(1)} MB`;
  }

  exportarExcel(): void {
    if (!this.propuesta) return;
    
    const entidad = this.licitacion?.creadoPor?.nombre || 'Sistema de Licitaciones';
    const rows = [
      ['DETALLE DE LA POSTULACIÓN'],
      ['Código de Postulación', `POST-${this.propuesta.id || 'N/A'}`],
      ['Nombre del Proyecto', this.propuesta.nombre || 'N/A'],
      ['Licitación Asociada', this.propuesta.licitacion?.titulo || 'N/A'],
      ['Entidad Contratante', entidad],
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
      ['Puntaje Técnico', `${this.getPuntajeTecnico()} / 50.0`],
      ['Puntaje Económico', `${this.getPuntajeEconomico()} / 20.0`],
      ['Puntaje Total', `${this.getPuntajeTotal()} / 50.0`],
      ['Porcentaje Alcanzado', `${this.getPorcentajeAlcanzado()}%`]
    ];

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + rows.map(e => e.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Postulacion_Detalle_${this.propuesta.id}.csv`);
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

  descargarCriteriosPdf(): void {
    if (this.criteriosOnly) {
      if (!this.evaluacionSeleccionada) {
        Swal.fire('Atención', 'No hay ninguna evaluación seleccionada para descargar.', 'warning');
        return;
      }
      
      Swal.fire({
        title: 'Generando PDF',
        text: 'Por favor espere mientras se genera el resumen de la rúbrica del evaluador...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      this.evaluacionService.downloadResumenPdf(this.propuestaId, this.evaluacionSeleccionada.evaluador?.id).subscribe({
        next: (blob) => {
          Swal.close();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const evaluadorName = this.evaluacionSeleccionada.evaluador 
            ? `${this.evaluacionSeleccionada.evaluador.nombre}_${this.evaluacionSeleccionada.evaluador.apellido}`.replace(/\s+/g, '_')
            : 'evaluador';
          a.download = `rubrica-evaluacion-${evaluadorName}-${this.propuestaId}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        },
        error: (err) => {
          console.error('Error downloading custom evaluator summary PDF', err);
          Swal.fire('Error', 'No se pudo generar la rúbrica del evaluador en PDF.', 'error');
        }
      });
      return;
    }

    if (!this.licitacion || !this.licitacion.id) {
      Swal.fire('Error', 'No hay información de la licitación para descargar.', 'error');
      return;
    }
    
    Swal.fire({
      title: 'Generando PDF',
      text: 'Por favor espere mientras se descargan los criterios...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.rubricaService.downloadCriteriosPdf(this.licitacion.id).subscribe({
      next: (blob) => {
        Swal.close();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `criterios-licitacion-${this.licitacion.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error downloading criteria PDF', err);
        Swal.fire('Error', 'No se pudo generar la rúbrica de criterios en PDF.', 'error');
      }
    });
  }

  getPuntajeIndividual(index: number): number {
    const ev = this.evaluacionSeleccionada;
    if (!ev) return 0;
    try {
      const p = typeof ev.puntajesJson === 'string' ? JSON.parse(ev.puntajesJson || '{}') : ev.puntajesJson || {};
      return p['p' + index] || 0;
    } catch(e) {
      return 0;
    }
  }

  checkUserRole(): void {
    this.isAdmin = this.tokenService.isAdmin() && !this.tokenService.isGestor();
    this.isGestor = this.tokenService.isGestor();
  }

  loadEvaluadoresDisponibles(): void {
    if (!this.isAdmin || this.isGestor) return;
    this.usuarioService.getAll('', 0, 1000).subscribe({
      next: (data) => {
        const users = data.content || data || [];
        const allEvaluadores = users.filter((u: any) =>
          u.roles && u.roles.some((r: any) => {
            const rName = (typeof r === 'string' ? r : (r.name || '')).toUpperCase();
            return rName.includes('EVALUADOR');
          })
        );
        const assignedUserIds = this.todasEvaluaciones.map(ev => ev.evaluador?.id).filter(id => !!id);
        this.evaluadoresDisponibles = allEvaluadores.filter((u: any) => !assignedUserIds.includes(u.id));
      },
      error: (err) => {
        console.error('Error cargando directores de evaluadores:', err);
      }
    });
  }

  onDragStart(event: DragEvent, evaluator: any): void {
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', evaluator.id.toString());
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingOver = true;
  }

  onDragLeave(event: DragEvent): void {
    this.isDraggingOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingOver = false;
    if (!event.dataTransfer) return;
    
    const evaluatorIdStr = event.dataTransfer.getData('text/plain');
    if (!evaluatorIdStr) return;
    
    const evaluatorId = +evaluatorIdStr;
    const evaluatorObj = this.evaluadoresDisponibles.find(e => e.id === evaluatorId);
    const evaluatorName = evaluatorObj ? `${evaluatorObj.nombre || ''} ${evaluatorObj.apellido || ''}`.trim() : 'el evaluador';
    
    Swal.fire({
      title: '¿Asignar Evaluador?',
      text: `¿Desea asignar a ${evaluatorName} para calificar esta propuesta?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, asignar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#64748b',
      background: '#ffffff',
      color: '#1e293b'
    }).then((res) => {
      if (res.isConfirmed) {
        Swal.fire({
          title: 'Asignando...',
          html: '<div class="premium-spinner" style="margin: 20px auto;"></div>',
          background: '#ffffff',
          color: '#1e293b',
          showConfirmButton: false,
          allowOutsideClick: false,
          didOpen: () => { Swal.showLoading(); }
        });
        
        this.evaluacionService.asignarEvaluador(this.propuestaId, evaluatorId).subscribe({
          next: (savedEval) => {
            Swal.fire({
              title: 'Asignado',
              text: 'Evaluador asignado exitosamente.',
              icon: 'success',
              timer: 2000,
              showConfirmButton: false,
              background: '#ffffff',
              color: '#1e293b'
            });
            this.refreshEvaluationsList();
          },
          error: (err) => {
            Swal.fire({
              title: 'Error',
              text: 'No se pudo asignar el evaluador.',
              icon: 'error',
              background: '#ffffff',
              color: '#1e293b',
              confirmButtonColor: '#ef4444'
            });
          }
        });
      }
    });
  }

  desasignarEvaluador(event: Event, evId: number, evaluatorName: string): void {
    event.stopPropagation();
    
    Swal.fire({
      title: '¿Desasignar Evaluador?',
      text: `¿Desea desasignar a ${evaluatorName}? Se perderán sus calificaciones en borrador.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, desasignar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      background: '#ffffff',
      color: '#1e293b'
    }).then((res) => {
      if (res.isConfirmed) {
        Swal.fire({
          title: 'Desasignando...',
          html: '<div class="premium-spinner" style="margin: 20px auto;"></div>',
          background: '#ffffff',
          color: '#1e293b',
          showConfirmButton: false,
          allowOutsideClick: false,
          didOpen: () => { Swal.showLoading(); }
        });
        
        this.evaluacionService.desasignarEvaluador(this.propuestaId, evId).subscribe({
          next: () => {
            Swal.fire({
              title: 'Desasignado',
              text: 'Evaluador desasignado exitosamente.',
              icon: 'success',
              timer: 2000,
              showConfirmButton: false,
              background: '#ffffff',
              color: '#1e293b'
            });
            this.refreshEvaluationsList();
          },
          error: (err) => {
            const errMsg = err.error?.message || 'No se pudo desasignar el evaluador.';
            Swal.fire({
              title: 'Error',
              text: errMsg,
              icon: 'error',
              background: '#ffffff',
              color: '#1e293b',
              confirmButtonColor: '#ef4444'
            });
          }
        });
      }
    });
  }

  refreshEvaluationsList(): void {
    this.evaluacionService.getTodasEvaluacionesPropuesta(this.propuestaId).subscribe({
      next: (evaluaciones) => {
        this.todasEvaluaciones = evaluaciones || [];
        this.loadEvaluadoresDisponibles();
        
        if (this.evaluacionActual) {
          const hasOwnEvalInList = this.todasEvaluaciones.some(ev => 
            (ev.id && this.evaluacionActual.id && ev.id === this.evaluacionActual.id) || 
            (ev.evaluador && this.evaluacionActual.evaluador && Number(ev.evaluador.id) === Number(this.evaluacionActual.evaluador.id))
          );
          if (!hasOwnEvalInList && this.evaluacionActual.evaluador) {
            this.todasEvaluaciones.unshift(this.evaluacionActual);
          }
        }
        
        if (this.todasEvaluaciones.length > 0) {
          const stillExists = this.todasEvaluaciones.find(ev => 
            (ev.id && this.evaluacionSeleccionada?.id && ev.id === this.evaluacionSeleccionada?.id) ||
            (ev.evaluador && this.evaluacionSeleccionada?.evaluador && Number(ev.evaluador.id) === Number(this.evaluacionSeleccionada?.evaluador.id))
          );
          if (stillExists) {
            this.selectEvaluacion(stillExists);
          } else {
            const own = this.todasEvaluaciones.find(ev => 
              ev.evaluador && this.evaluacionActual?.evaluador && Number(ev.evaluador.id) === Number(this.evaluacionActual.evaluador.id)
            );
            this.selectEvaluacion(own || this.todasEvaluaciones[0]);
          }
        } else {
          this.evaluacionSeleccionada = null;
          this.evaluacionActual = null;
          this.isReadOnly = true;
          this.evaluacionForm.disable();
        }
      }
    });
  }
}
