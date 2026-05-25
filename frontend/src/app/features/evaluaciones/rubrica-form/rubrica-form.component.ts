import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { RubricaService } from '../../../core/services/rubrica.service';
import { LicitacionService } from '../../../core/services/licitacion.service';

@Component({
  selector: 'app-rubrica-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './rubrica-form.component.html',
  styleUrls: ['./rubrica-form.component.scss']
})
export class RubricaFormComponent implements OnInit {
  rubricaForm: FormGroup;
  licitacionId!: number;
  licitacion: any;
  loading = false;
  saving = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private rubricaService: RubricaService,
    private licitacionService: LicitacionService
  ) {
    this.rubricaForm = this.fb.group({
      nombre: ['', Validators.required],
      criterios: this.fb.array([])
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('licitacionId');
    if (id) {
      this.licitacionId = Number(id);
      this.loadLicitacion();
      this.addCriterio(); // Start with one criterion
    } else {
      this.router.navigate(['/licitaciones']);
    }
  }

  get criterios() {
    return this.rubricaForm.get('criterios') as FormArray;
  }

  loadLicitacion(): void {
    this.licitacionService.getById(this.licitacionId).subscribe((data: any) => {
      this.licitacion = data;
    });
  }

  addCriterio(): void {
    const criterioForm = this.fb.group({
      nombre: ['', Validators.required],
      peso: [0, [Validators.required, Validators.min(1), Validators.max(100)]],
      puntajeMaximo: [100, [Validators.required, Validators.min(1)]]
    });
    this.criterios.push(criterioForm);
  }

  removeCriterio(index: number): void {
    this.criterios.removeAt(index);
  }

  getTotalPeso(): number {
    return this.criterios.value.reduce((acc: number, curr: any) => acc + (curr.peso || 0), 0);
  }

  onSubmit(): void {
    if (this.rubricaForm.invalid) return;

    const totalPeso = this.getTotalPeso();
    if (Math.abs(totalPeso - 100) > 0.01) {
      alert('La suma de los pesos debe ser exactamente 100%. Actual: ' + totalPeso + '%');
      return;
    }

    this.saving = true;
    const rubricaData = {
      ...this.rubricaForm.value,
      licitacion: { id: this.licitacionId }
    };

    this.rubricaService.create(rubricaData as any).subscribe({
      next: () => {
        alert('Rúbrica guardada correctamente');
        this.router.navigate(['/licitaciones']);
      },
      error: (err: any) => {
        console.error(err);
        alert('Error al guardar la rúbrica: ' + (err.error?.message || err.message));
        this.saving = false;
      }
    });
  }
}
