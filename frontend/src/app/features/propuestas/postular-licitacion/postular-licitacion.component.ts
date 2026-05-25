import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LicitacionService } from '../../../core/services/licitacion.service';
import { PropuestaService } from '../../../core/services/propuesta.service';
import { Licitacion } from '../../../data/models/licitacion.model';
import Swal from 'sweetalert2';
import { 
  Building2, 
  DollarSign, 
  ClipboardList, 
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  CloudUpload,
  FileText,
  Trash2,
  Info,
  User,
  Mail,
  Phone,
  IdCard,
  Globe,
  Clock,
  Shield
} from 'lucide-angular';
import { LucideAngularModule } from 'lucide-angular';
import { TokenService } from '../../../core/services/token.service';

@Component({
  selector: 'app-postular-licitacion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
  templateUrl: './postular-licitacion.component.html',
  styleUrls: ['./postular-licitacion.component.scss']
})
export class PostularLicitacionComponent implements OnInit {
  // Icons
  readonly IconBuilding = Building2;
  readonly IconDollar = DollarSign;
  readonly IconClipboard = ClipboardList;
  readonly IconCheck = CheckCircle;
  readonly IconNext = ArrowRight;
  readonly IconPrev = ArrowLeft;
  readonly IconUpload = CloudUpload;
  readonly IconFile = FileText;
  readonly IconTrash = Trash2;
  readonly IconInfo = Info;
  readonly IconUser = User;
  readonly IconMail = Mail;
  readonly IconPhone = Phone;
  readonly IconId = IdCard;
  readonly IconGlobe = Globe;
  readonly IconClock = Clock;
  readonly IconShield = Shield;

  licitacionId: number = 0;
  licitacion?: Licitacion;
  currentUser: any;
  propuestaForm: FormGroup;
  selectedFiles: File[] = [];
  currentStep: number = 1;
  isSubmitting: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';
  existingPropuestaId?: number;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private licitacionService: LicitacionService,
    private propuestaService: PropuestaService,
    private tokenService: TokenService
  ) {
    this.licitacionId = Number(this.route.snapshot.paramMap.get('id'));
    this.propuestaForm = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: ['', Validators.required],
      montoOfertado: [null, [Validators.required, Validators.min(1)]],
      moneda: ['USD', Validators.required],
      detalleCosto: [''],
      tiempoEntregaDias: [null, [Validators.required, Validators.min(1)]],
      
      // Info Proveedor
      empresaNombre: ['', Validators.required],
      identificacionRuc: ['', Validators.required],
      contactoNombre: ['', Validators.required],
      contactoEmail: ['', [Validators.required, Validators.email]],
      contactoTelefono: ['', Validators.required],
      
      // Datos Dinámicos (Area)
      datosArea: this.fb.group({}), // Sub-form group for area specific fields
      
      comentarios: [''],
      declaracionVeracidad: [false, Validators.requiredTrue],
      aceptacionBases: [false, Validators.requiredTrue],
      noConflictoInteres: [false, Validators.requiredTrue]
    });
  }

  ngOnInit(): void {
    this.currentUser = this.tokenService.getUser();
    this.loadLicitacion();
    this.checkExistingPropuesta();
  }

  prepopulateFromProfile(): void {
    if (this.currentUser) {
      this.propuestaForm.patchValue({
        empresaNombre: this.currentUser.empresaNombre || '',
        identificacionRuc: this.currentUser.ruc || '',
        contactoNombre: this.currentUser.nombre ? `${this.currentUser.nombre} ${this.currentUser.apellido || ''}`.trim() : '',
        contactoEmail: this.currentUser.email || ''
      });
    }
  }

  loadLicitacion(): void {
    this.licitacionService.getById(this.licitacionId).subscribe({
      next: (data) => {
        this.licitacion = data;
        this.initAreaFields(data.area?.nombre);
      },
      error: (err) => this.errorMessage = 'No se pudo cargar la licitacion.'
    });
  }

  initAreaFields(areaNombre?: string): void {
    const areaGroup = this.propuestaForm.get('datosArea') as FormGroup;
    
    // Clear existing
    Object.keys(areaGroup.controls).forEach(key => areaGroup.removeControl(key));

    if (!areaNombre) return;

    const normalizedArea = areaNombre.toUpperCase();
    
    const fieldConfig: { [key: string]: string[] } = {
      'FINANZAS': ['estructuraCostos', 'justificacionPrecio', 'proyeccionFinanciera', 'analisisRiesgo', 'roiEstimado'],
      'TI': ['descripcionSolucion', 'tecnologias', 'arquitectura', 'seguridad', 'escalabilidad'],
      'LOGÍSTICA': ['tiempoEntregaDetalle', 'capacidadOperativa', 'planDistribucion', 'cobertura', 'experienciaLogistica'],
      'RECURSOS HUMANOS': ['perfilEquipo', 'experienciaPrevia', 'certificaciones', 'cumplimientoLegal', 'organizacionEquipo'],
      'OPERACIONES': ['planOperativo', 'optimizacionProcesos', 'reduccionCostos', 'implementacion', 'impactoOperativo'],
      'COMERCIAL': ['estrategiaComercial', 'valorAgregado', 'proyeccionCrecimiento', 'competitividad', 'posicionamiento'],
      'JURÍDICO': ['cumplimientoLegalJur', 'tipoContrato', 'riesgosLegales', 'condiciones', 'antecedentes']
    };

    const fields = fieldConfig[normalizedArea] || [];
    fields.forEach(f => {
      areaGroup.addControl(f, this.fb.control('', Validators.required));
    });
  }

  checkExistingPropuesta(): void {
    this.propuestaService.getMiPropuesta(this.licitacionId).subscribe(data => {
      if (data && data.id) {
        // UPDATE MODE: El proveedor ya tiene una propuesta para ESTA licitación — cargar todo
        this.existingPropuestaId = data.id;
        this.propuestaForm.patchValue({
          nombre: data.nombre,
          descripcion: data.descripcion,
          montoOfertado: data.montoOfertado,
          moneda: data.moneda || 'USD',
          detalleCosto: data.detalleCosto,
          tiempoEntregaDias: data.tiempoEntregaDias,
          empresaNombre: data.empresaNombre,
          identificacionRuc: data.identificacionRuc,
          contactoNombre: data.contactoNombre,
          contactoEmail: data.contactoEmail,
          contactoTelefono: data.contactoTelefono,
          comentarios: data.comentarios,
          declaracionVeracidad: data.declaracionVeracidad,
          aceptacionBases: data.aceptacionBases,
          noConflictoInteres: data.noConflictoInteres
        });

        if (data.datosAreaJson) {
           try {
             const areaData = JSON.parse(data.datosAreaJson);
             (this.propuestaForm.get('datosArea') as FormGroup).patchValue(areaData);
           } catch(e) { console.error('Error parsing area data', e); }
        }
      } else {
        // NUEVA PROPUESTA: solo pre-rellenar datos básicos del perfil del usuario
        // NO cargar observaciones, montos, documentos, ni datos técnicos de propuestas anteriores
        this.prepopulateFromProfile();
      }
    });
  }

  getAreaControls() {
    return (this.propuestaForm.get('datosArea') as FormGroup).controls;
  }

  onFileSelected(event: any): void {
    if (event.target.files.length > 0) {
      this.selectedFiles = Array.from(event.target.files);
    }
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
  }

  nextStep(): void {
    let fieldsToValidate: string[] = [];
    
    if (this.currentStep === 1) {
      fieldsToValidate = ['nombre', 'empresaNombre', 'identificacionRuc', 'contactoNombre', 'contactoEmail', 'contactoTelefono'];
    } else if (this.currentStep === 2) {
      fieldsToValidate = ['montoOfertado', 'moneda', 'tiempoEntregaDias', 'descripcion'];
    } else if (this.currentStep === 3) {
      // Validar dinámicamente el sub-grupo datosArea
      const areaGroup = this.propuestaForm.get('datosArea') as FormGroup;
      if (areaGroup.invalid) {
        areaGroup.markAllAsTouched();
        this.showValidationError('Por favor complete los requisitos específicos del área.');
        return;
      }
    }

    // Validar campos del paso actual
    const isStepValid = fieldsToValidate.every(f => {
      const control = this.propuestaForm.get(f);
      if (control?.invalid) {
        control.markAsTouched();
        return false;
      }
      return true;
    });

    if (!isStepValid) {
      this.showValidationError('Hay campos obligatorios vacíos o con formato incorrecto.');
      return;
    }

    if (this.currentStep < 4) {
      this.currentStep++;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  private showValidationError(msg: string): void {
    Swal.fire({
      icon: 'warning',
      title: 'Paso Incompleto',
      text: msg,
      confirmButtonColor: '#3b82f6'
    });
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  onSubmit(enviar: boolean): void {
    if (this.propuestaForm.invalid && enviar) {
      this.propuestaForm.markAllAsTouched();
      Swal.fire({
        icon: 'warning',
        title: 'Formulario Incompleto',
        text: 'Por favor complete todos los campos obligatorios y acepte las declaraciones legales.',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }

    this.isSubmitting = true;
    
    // Alerta de carga
    Swal.fire({
      title: enviar ? 'Enviando Propuesta...' : 'Guardando Borrador...',
      text: 'Por favor espere un momento.',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    const formValue = this.propuestaForm.value;
    const areaData = formValue.datosArea;
    const { datosArea, ...rest } = formValue;

    const propuestaData = {
      ...rest,
      montoOfertado: rest.montoOfertado ? +rest.montoOfertado : 0,
      tiempoEntregaDias: rest.tiempoEntregaDias ? +rest.tiempoEntregaDias : 0,
      datosAreaJson: JSON.stringify(areaData),
      licitacion: { id: this.licitacionId },
      estado: enviar ? 'ENVIADA' : 'BORRADOR'
    };

    const action = this.existingPropuestaId 
      ? this.propuestaService.updateWithFiles(this.existingPropuestaId, propuestaData, this.selectedFiles)
      : this.propuestaService.createWithFiles(propuestaData, this.selectedFiles);

    action.subscribe({
      next: (res) => {
        this.isSubmitting = false;
        Swal.fire({
          icon: 'success',
          title: '¡Confirmado!',
          text: enviar ? 'Tu propuesta ha sido enviada con éxito.' : 'El borrador se ha guardado correctamente.',
          confirmButtonText: 'Listo',
          confirmButtonColor: '#10b981'
        }).then(() => {
          this.router.navigate(['/licitaciones']);
        });
      },
      error: (err) => {
        this.isSubmitting = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err.error?.message || 'Hubo un problema al procesar la propuesta. Intente de nuevo.',
          confirmButtonColor: '#ef4444'
        });
      }
    });
  }
}
