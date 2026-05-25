import { Component, OnInit, OnDestroy, HostListener, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { LicitacionService } from '../../../core/services/licitacion.service';
import { AreaService } from '../../../core/services/area.service';
import { UsuarioService } from '../../../core/services/usuario.service';
import { TokenService } from '../../../core/services/token.service';
import { Licitacion, EstadoLicitacion } from '../../../data/models/licitacion.model';
import { Area } from '../../../data/models/area.model';
import { Usuario } from '../../../data/models/usuario.model';
import { Subscription, interval } from 'rxjs';
import Swal from 'sweetalert2';
import { 
  Check, 
  Type, 
  Building, 
  Filter, 
  DollarSign, 
  Lock, 
  Upload, 
  FileText, 
  Calendar, 
  ArrowLeft,
  Trash2
} from 'lucide-angular';
import { LucideAngularModule } from 'lucide-angular';
import { ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-crear-licitacion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
  templateUrl: './crear-licitacion.component.html',
  styleUrls: ['./crear-licitacion.component.scss']
})
export class CrearLicitacionComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
  @Input() editId?: number; // Receive ID for modal mode
  @Output() onComplete = new EventEmitter<void>();
  @Output() onCancel = new EventEmitter<void>();

  EstadoLicitacion = EstadoLicitacion;
  licitacionForm: FormGroup;
  selectedFiles: File[] = [];
  isSubmitting = false;
  
  // Wizard State
  currentStep = 1;
  steps = [
    { id: 1, title: 'Información General' },
    { id: 2, title: 'Bases y Requisitos' },
    { id: 3, title: 'Presupuesto y Documentos' },
    { id: 4, title: 'Fechas Clave' }
  ];

  tiposLicitacion = ['Pública', 'Privada', 'Interna', 'Directa'];
  areas: Area[] = [];
  evaluadoresDisponibles: Usuario[] = [];
  
  private STORAGE_KEY = 'licitacion_draft';
  private autosaveSub?: Subscription;

  // Icons
  readonly IconCheck = Check;
  readonly IconType = Type;
  readonly IconBuilding = Building;
  readonly IconFilter = Filter;
  readonly IconDollarSign = DollarSign;
  readonly IconLock = Lock;
  readonly IconUpload = Upload;
  readonly IconFileText = FileText;
  readonly IconCalendar = Calendar;
  readonly IconArrowLeft = ArrowLeft;
  readonly IconTrash2 = Trash2;

  constructor(
    private fb: FormBuilder,
    private licitacionService: LicitacionService,
    private areaService: AreaService,
    private usuarioService: UsuarioService,
    private tokenService: TokenService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.licitacionForm = this.fb.group({
      titulo: ['', [Validators.required, Validators.minLength(5)]],
      descripcion: ['', [Validators.required]],
      area: [null, [Validators.required]],
      tipo: ['', [Validators.required]],
      bases: ['', [Validators.required]],
      requisitos: ['', [Validators.required]],
      presupuesto: [null, [Validators.min(1)]],
      fechaPublicacion: ['', [Validators.required]],
      fechaCierre: ['', [Validators.required]],
      fechaEvaluacion: ['', [Validators.required]],
      fechaAdjudicacion: ['', [Validators.required]],
      estado: [EstadoLicitacion.BORRADOR]
    });
  }

  isEditMode = false;
  editingLicitacionId?: number;
  isAdmin = false;

  ngOnInit(): void {
    this.isAdmin = this.tokenService.isAdmin();

    // Handle Input first (Modal mode)
    if (this.editId) {
      this.isEditMode = true;
      this.editingLicitacionId = this.editId;
      this.loadEditingData(this.editId);
    } else {
      // Check Route (Standard page mode)
      const id = this.route.snapshot.paramMap.get('id');
      if (id && !isNaN(+id)) {
        this.isEditMode = true;
        this.editingLicitacionId = +id;
        this.loadEditingData(+id);
      }
    }

    this.loadInitialData();
    if (!this.isEditMode) this.restoreDraft();
    this.startAutosave();
  }

  loadInitialData(): void {
    this.areaService.getAreas().subscribe(areas => this.areas = areas);
    this.usuarioService.getEvaluadores().subscribe(users => this.evaluadoresDisponibles = users);
  }

  loadEditingData(id: number): void {
    this.licitacionService.getById(id).subscribe(l => {
      this.licitacionForm.patchValue(l);
      
      this.licitacionForm.patchValue({
        fechaPublicacion: l.fechaPublicacion ? new Date(l.fechaPublicacion).toISOString().slice(0, 16) : '',
        fechaCierre: l.fechaCierre ? new Date(l.fechaCierre).toISOString().slice(0, 16) : '',
        fechaEvaluacion: l.fechaEvaluacion ? new Date(l.fechaEvaluacion).toISOString().slice(0, 16) : '',
        fechaAdjudicacion: l.fechaAdjudicacion ? new Date(l.fechaAdjudicacion).toISOString().slice(0, 16) : ''
      });
    });
  }

  compareAreas(a1: any, a2: any): boolean {
    return a1 && a2 ? a1.id === a2.id : a1 === a2;
  }

  ngOnDestroy(): void {
    if (this.autosaveSub) this.autosaveSub.unsubscribe();
  }

  // --- WIZARD LOGIC ---
  nextStep(): void {
    if (this.currentStep < 4) {
      this.currentStep++;
      this.scrollToTop();
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.scrollToTop();
    }
  }

  scrollToTop(): void {
    const container = document.querySelector('.modal-content');
    if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  goToStep(step: number): void {
    if (step < this.currentStep || this.isStepValid(this.currentStep)) {
      this.currentStep = step;
    }
  }

  isStepValid(step: number): boolean {
    const controls = this.getStepControls(step);
    return controls.every(c => this.licitacionForm.get(c)?.valid);
  }

  private getStepControls(step: number): string[] {
    switch (step) {
      case 1: return ['titulo', 'descripcion', 'area', 'tipo'];
      case 2: return ['bases', 'requisitos'];
      case 3: return ['presupuesto'];
      case 4: return ['fechaPublicacion', 'fechaCierre', 'fechaEvaluacion', 'fechaAdjudicacion'];
      default: return [];
    }
  }

  // --- PERSISTENCE ---
  private startAutosave(): void {
    this.autosaveSub = interval(30000).subscribe(() => this.saveToLocal());
  }

  private saveToLocal(): void {
    if (this.licitacionForm.dirty) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.licitacionForm.value));
    }
  }

  private restoreDraft(): void {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.licitacionForm.patchValue(data);
      } catch (e) {}
    }
  }

  clearDraft(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  // --- FILE HANDLING ---
  triggerFileUpload(event?: Event): void {
    if (event) event.stopPropagation();
    if (this.fileInput) {
      this.fileInput.nativeElement.click();
    }
  }

  onFileSelected(event: any): void {
    const files = event.target?.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        this.selectedFiles.push(files[i]);
      }
    }
    // Limpiar para permitir seleccionar el mismo archivo si se desea
    if (event.target) event.target.value = '';
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
  }

  // --- ACTIONS ---
  saveDraft(): void {
    this.licitacionForm.patchValue({ estado: EstadoLicitacion.BORRADOR });
    this.onSubmit(false);
  }

  async publicarAhora(): Promise<void> {
    console.log("--- DEBUG PUBLICACIÓN ---");
    console.log("Estado Formulario:", this.licitacionForm.status);
    console.log("Valores Formulario:", this.licitacionForm.value);

    // Revisar errores por campo
    const fieldErrors: any = {};
    Object.keys(this.licitacionForm.controls).forEach(key => {
      const control = this.licitacionForm.get(key);
      if (control?.invalid) {
        fieldErrors[key] = control.errors;
      }
    });
    console.log("Errores por campo:", fieldErrors);

    try {
      if (this.licitacionForm.invalid) {
        this.licitacionForm.markAllAsTouched();
        const errors = this.getFormValidationErrors();
        const invalidFields = Object.keys(errors).map(key => {
          const names: any = {
            titulo: 'Título', descripcion: 'Descripción', area: 'Área', 
            tipo: 'Tipo', bases: 'Bases', requisitos: 'Requisitos',
            presupuesto: 'Presupuesto', fechaPublicacion: 'Fecha Publicación',
            fechaCierre: 'Fecha Cierre', fechaEvaluacion: 'Fecha Evaluación',
            fechaAdjudicacion: 'Fecha Adjudicación'
          };
          return names[key] || key;
        }).join(', ');

        console.warn("Faltan campos:", invalidFields);
        Swal.fire({
          icon: 'warning',
          title: 'Formulario Incompleto',
          text: `Faltan los siguientes campos obligatorios: ${invalidFields}`,
          confirmButtonColor: '#3b82f6',
          target: 'body' // Asegura que aparezca sobre cualquier modal
        });
        this.scrollToFirstError();
        return;
      }

      console.log("Formulario válido. Enviando directamente al backend...");
      this.licitacionForm.patchValue({ estado: EstadoLicitacion.PUBLICADA });
      this.onSubmit(true);
    } catch (error) {
      console.error("Error crítico en publicarAhora:", error);
      Swal.fire('Error del Sistema', 'Ocurrió un error inesperado al intentar publicar. Revisa la consola.', 'error');
    }
  }

  onSubmit(isPublish: boolean): void {
    this.isSubmitting = true;
    
    Swal.fire({
      title: isPublish ? 'Procesando...' : 'Guardando cambios...',
      text: 'Por favor espere un momento.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });
    
    const formValue = { ...this.licitacionForm.getRawValue() };
    
    // Forzar estado si es publicación
    if (isPublish) {
      formValue.estado = EstadoLicitacion.PUBLICADA;
    }
    
    console.log('--- DIAGNÓSTICO DE ENVÍO ---');
    console.log('Modo Edición:', this.isEditMode);
    console.log('Archivos seleccionados:', this.selectedFiles.length);

    try {
      // Forzar conversión numérica para presupuesto
      if (formValue.presupuesto) {
        formValue.presupuesto = Number(formValue.presupuesto);
      }

      console.log('Preparando petición HTTP...');
      const request = this.isEditMode && this.editingLicitacionId
        ? this.licitacionService.update(this.editingLicitacionId, formValue)
        : this.licitacionService.createWithFiles(formValue, this.selectedFiles);

      console.log('Iniciando suscripción al servicio...');
      request.subscribe({
        next: (response) => {
          console.log('✅ RESPUESTA EXITOSA DEL SERVIDOR:', response);
          this.clearDraft();
          this.isSubmitting = false;

          Swal.fire({
            icon: 'success',
            title: '¡Publicación Exitosa!',
            text: 'La licitación se ha guardado y publicado correctamente.',
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#1cc88a',
            target: 'body',
            didOpen: () => {
              (Swal.getContainer() as HTMLElement).style.zIndex = '10000';
            }
          }).then(() => {
            this.onComplete.emit();
            if (!this.editId) this.router.navigate(['/licitaciones']);
          });
        },
        error: (err) => {
          console.error('❌ ERROR EN LA PETICIÓN:', err);
          this.isSubmitting = false;
          Swal.fire({
            icon: 'error',
            title: 'Fallo al Publicar',
            text: err.error?.message || err.message || 'Error de conexión con el servidor.',
            confirmButtonColor: '#e74a3b',
            target: 'body',
            didOpen: () => {
              (Swal.getContainer() as HTMLElement).style.zIndex = '10000';
            }
          });
        }
      });
    } catch (err) {
      console.error('❌ ERROR CRÍTICO EN ONSUBMIT:', err);
      this.isSubmitting = false;
      Swal.fire({
        icon: 'error',
        title: 'Error de Código',
        text: 'Ocurrió un fallo antes de enviar la petición.',
        target: 'body'
      });
    }
  }

  private getFormValidationErrors() {
    const errors: any = {};
    Object.keys(this.licitacionForm.controls).forEach(key => {
      const controlErrors = this.licitacionForm.get(key)?.errors;
      if (controlErrors != null) {
        errors[key] = controlErrors;
      }
    });
    return errors;
  }

  private scrollToFirstError(): void {
    const firstInvalidControl = document.querySelector('.ng-invalid[formControlName]');
    if (firstInvalidControl) {
      const controlName = firstInvalidControl.getAttribute('formControlName');
      for (let i = 1; i <= 4; i++) {
        if (this.getStepControls(i).includes(controlName || '')) {
          this.currentStep = i;
          break;
        }
      }
      setTimeout(() => firstInvalidControl.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    }
  }


  cancelar(): void {
    this.onCancel.emit();
    if (!this.editId) this.router.navigate(['/licitaciones']);
  }
}
