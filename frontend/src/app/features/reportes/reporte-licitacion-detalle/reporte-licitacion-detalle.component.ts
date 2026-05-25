import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LicitacionService } from '../../../core/services/licitacion.service';
import { ContratoService } from '../../../core/services/contrato.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-reporte-licitacion-detalle',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './reporte-licitacion-detalle.component.html',
  styleUrls: ['./reporte-licitacion-detalle.component.scss']
})
export class ReporteLicitacionDetalleComponent implements OnInit {
  licitacionId!: number;
  licitacion: any;
  hitos: any[] = [];
  historial: any[] = [];
  ranking: any[] = [];
  contrato: any;
  
  isLoading = true;
  averageScore = 0;
  budgetExecutionPercent = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private licitacionService: LicitacionService,
    private contratoService: ContratoService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.licitacionId = +params['id'];
      if (this.licitacionId) {
        this.loadAllData();
      } else {
        Swal.fire('Error', 'ID de licitación no válido.', 'error');
        this.router.navigate(['/reportes/licitaciones']);
      }
    });
  }

  loadAllData(): void {
    this.isLoading = true;
    
    // Carga paralela de datos
    this.licitacionService.getById(this.licitacionId).subscribe({
      next: (lic) => {
        this.licitacion = lic;
        
        // Cargar hitos
        this.licitacionService.getHitos(this.licitacionId).subscribe({
          next: (hits) => this.hitos = hits || [],
          error: (err) => console.error('Error al cargar hitos:', err)
        });

        // Cargar historial/auditoría
        this.licitacionService.getHistorial(this.licitacionId).subscribe({
          next: (hist) => this.historial = hist || [],
          error: (err) => console.error('Error al cargar historial:', err)
        });

        // Cargar ranking de propuestas
        this.licitacionService.getRanking(this.licitacionId).subscribe({
          next: (rank) => {
            this.ranking = rank || [];
            this.calculateAverageScore();
          },
          error: (err) => console.error('Error al cargar ranking:', err)
        });

        // Cargar contrato asociado
        this.contratoService.getByLicitacionId(this.licitacionId).subscribe({
          next: (cont) => {
            this.contrato = cont;
            this.calculateBudgetExecution();
          },
          error: (err) => {
            // Es normal que no tenga contrato si no está adjudicada o formalizada
            this.contrato = null;
            this.budgetExecutionPercent = 0;
          }
        });

        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error al cargar licitación:', err);
        Swal.fire('Error', 'No se pudo cargar la información de la licitación seleccionada.', 'error');
        this.router.navigate(['/reportes/licitaciones']);
        this.isLoading = false;
      }
    });
  }

  calculateAverageScore(): void {
    if (!this.ranking || this.ranking.length === 0) {
      this.averageScore = 0;
      return;
    }
    const scores = this.ranking.filter(p => p.puntajeTotal !== undefined).map(p => p.puntajeTotal);
    if (scores.length === 0) {
      this.averageScore = 0;
      return;
    }
    const sum = scores.reduce((a, b) => a + b, 0);
    this.averageScore = parseFloat((sum / scores.length).toFixed(1));
  }

  calculateBudgetExecution(): void {
    if (!this.licitacion || !this.contrato || !this.licitacion.presupuesto) {
      this.budgetExecutionPercent = 0;
      return;
    }
    const percent = (this.contrato.monto / this.licitacion.presupuesto) * 100;
    this.budgetExecutionPercent = parseFloat(Math.min(percent, 100).toFixed(1));
  }

  getStatusClass(estado: string): string {
    if (!estado) return 'status-default';
    const classes: {[key: string]: string} = {
      'BORRADOR': 'status-draft',
      'PUBLICADA': 'status-published',
      'EN_EVALUACION': 'status-eval',
      'ADJUDICADA': 'status-awarded',
      'CERRADA': 'status-closed',
      'CANCELADA': 'status-cancelled'
    };
    return classes[estado] || 'status-default';
  }

  volver(): void {
    this.router.navigate(['/reportes/licitaciones']);
  }
}
