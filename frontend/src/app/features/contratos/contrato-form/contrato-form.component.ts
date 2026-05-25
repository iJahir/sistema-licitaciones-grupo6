import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ContratoService } from '../../../core/services/contrato.service';
import { LicitacionService } from '../../../core/services/licitacion.service';

@Component({
  selector: 'app-contrato-form',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="management-container" *ngIf="licitacion">
      <header class="management-header">
        <div class="title-section">
          <h1>Generar Contrato</h1>
          <p>Licitación: {{ licitacion.titulo }}</p>
        </div>
      </header>

      <div class="glass form-container">
        <form (ngSubmit)="generar()">
          <div class="form-group">
            <label>Código de Contrato (Auto-generado si vacío)</label>
            <input type="text" [(ngModel)]="contrato.codigoContrato" name="codigo" class="form-control" placeholder="CONTR-2024-XXX">
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Fecha Inicio</label>
              <input type="date" [(ngModel)]="contrato.fechaInicio" name="fechaInicio" class="form-control" required>
            </div>
            <div class="form-group">
              <label>Fecha Fin</label>
              <input type="date" [(ngModel)]="contrato.fechaFin" name="fechaFin" class="form-control" required>
            </div>
          </div>

          <div class="form-group">
            <label>Cláusulas del Contrato</label>
            <textarea [(ngModel)]="contrato.clausulas" name="clausulas" class="form-control" rows="10" required></textarea>
          </div>

          <div class="form-actions">
            <button type="button" class="btn-cancel" (click)="cancelar()">Cancelar</button>
            <button type="submit" class="btn-submit">Generar y Notificar</button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .form-container { padding: 2rem; border-radius: 12px; max-width: 800px; margin: 0 auto; }
    .form-group { margin-bottom: 1.5rem; }
    .form-group label { display: block; margin-bottom: 0.5rem; color: #94a3b8; }
    .form-control { width: 100%; padding: 0.8rem; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: white; font-family: inherit; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem; }
    .btn-submit { padding: 0.8rem 2rem; background: #38bdf8; color: #0f172a; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; }
    .btn-cancel { padding: 0.8rem 2rem; background: transparent; color: #94a3b8; border: 1px solid #94a3b8; border-radius: 8px; cursor: pointer; }
  `]
})
export class ContratoFormComponent implements OnInit {
  licitacion: any = null;
  contrato: any = {
    codigoContrato: '',
    fechaInicio: '',
    fechaFin: '',
    clausulas: 'PRIMERA: OBJETO DEL CONTRATO...\n\nSEGUNDA: MONTO Y FORMA DE PAGO...\n\nTERCERA: PLAZO DE EJECUCIÓN...'
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private contratoService: ContratoService,
    private licitacionService: LicitacionService
  ) {}

  ngOnInit(): void {
    const licId = this.route.snapshot.paramMap.get('licitacionId');
    if (licId) {
      this.licitacionService.getById(+licId).subscribe(l => {
        this.licitacion = l;
        // Default fin = 1 year later
        const today = new Date();
        this.contrato.fechaInicio = today.toISOString().split('T')[0];
        const nextYear = new Date();
        nextYear.setFullYear(today.getFullYear() + 1);
        this.contrato.fechaFin = nextYear.toISOString().split('T')[0];
      });
    }
  }

  generar() {
    this.contratoService.crear(this.licitacion.id, this.contrato).subscribe({
      next: (res) => {
        alert('Contrato generado y notificado al ganador.');
        this.router.navigate(['/licitaciones', this.licitacion.id]);
      },
      error: (err) => alert('Error al generar contrato')
    });
  }

  cancelar() {
    this.router.navigate(['/licitaciones', this.licitacion.id]);
  }
}
