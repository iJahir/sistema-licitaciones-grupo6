import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EvaluacionService } from '../../../core/services/evaluacion.service';
import { PropuestaService } from '../../../core/services/propuesta.service';

@Component({
  selector: 'app-evaluacion-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './evaluacion-form.component.html',
  styleUrls: ['./evaluacion-form.component.scss']
})
export class EvaluacionFormComponent implements OnInit {
  evaluacionForm: FormGroup;
  propuestaId!: number;
  propuesta: any;
  loading = true;
  saving = false;
  totalScore = 0;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private evaluacionService: EvaluacionService,
    private propuestaService: PropuestaService
  ) {
    this.evaluacionForm = this.fb.group({
      puntajePrecio: [0, [Validators.required, Validators.min(0), Validators.max(10)]],
      puntajeCalidad: [0, [Validators.required, Validators.min(0), Validators.max(10)]],
      puntajeExperiencia: [0, [Validators.required, Validators.min(0), Validators.max(10)]],
      puntajeTiempo: [0, [Validators.required, Validators.min(0), Validators.max(10)]],
      comentarios: ['', Validators.required],
      observaciones: [''],
      estado: ['PENDIENTE', Validators.required]
    });

    // Calcular total automáticamente al cambiar cualquier valor
    this.evaluacionForm.valueChanges.subscribe(() => {
      this.calculateTotal();
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('propuestaId');
    if (id) {
      this.propuestaId = Number(id);
      this.loadPropuesta();
    }
  }

  loadPropuesta(): void {
    this.propuestaService.getById(this.propuestaId).subscribe({
      next: (data) => {
        this.propuesta = data;
        this.loading = false;
        this.checkExistingEvaluation();
      },
      error: (err) => {
        console.error('Error al cargar propuesta', err);
        this.router.navigate(['/licitaciones']);
      }
    });
  }

  checkExistingEvaluation(): void {
    this.evaluacionService.getMiEvaluacionPropuesta(this.propuestaId, 0).subscribe({
      next: (evaluacion: any) => {
        if (evaluacion) {
          this.evaluacionForm.patchValue({
            puntajePrecio: evaluacion.puntajePrecio,
            puntajeCalidad: evaluacion.puntajeCalidad,
            puntajeExperiencia: evaluacion.puntajeExperiencia,
            puntajeTiempo: evaluacion.puntajeTiempo,
            comentarios: evaluacion.comentarios,
            observaciones: evaluacion.observaciones,
            estado: evaluacion.estado || 'PENDIENTE'
          });
          this.calculateTotal();
        }
      },
      error: () => {
        // No hay evaluación previa, no pasa nada
      }
    });
  }

  calculateTotal(): void {
    const v = this.evaluacionForm.value;
    const sum = (Number(v.puntajePrecio) + Number(v.puntajeCalidad) + 
                 Number(v.puntajeExperiencia) + Number(v.puntajeTiempo));
    this.totalScore = sum / 4.0;
  }

  onSubmit(): void {
    if (this.evaluacionForm.invalid) {
      this.evaluacionForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    const evaluacionDTO = {
      ...this.evaluacionForm.value,
      propuesta: { id: this.propuestaId },
      puntajeTotal: this.totalScore
    };

    this.evaluacionService.create(evaluacionDTO).subscribe({
      next: () => {
        alert('✅ Evaluación guardada con éxito.');
        this.router.navigate(['/evaluaciones', this.propuesta.licitacion.id]);
      },
      error: (err) => {
        console.error('Error al guardar evaluación', err);
        alert('Ocurrió un error al guardar la evaluación.');
        this.saving = false;
      }
    });
  }
}
