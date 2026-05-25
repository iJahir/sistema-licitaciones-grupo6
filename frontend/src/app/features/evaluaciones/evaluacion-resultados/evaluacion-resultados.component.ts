import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { EvaluacionService } from '../../../core/services/evaluacion.service';
import { LicitacionService } from '../../../core/services/licitacion.service';
import { TokenService } from '../../../core/services/token.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-evaluacion-resultados',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './evaluacion-resultados.component.html',
  styleUrls: ['./evaluacion-resultados.component.scss']
})
export class EvaluacionResultadosComponent implements OnInit {
  licitacionId!: number;
  licitacion: any;
  evaluaciones: any[] = [];
  ranking: any[] = [];
  loading = true;
  currentTab = 'ranking';
  isAreaSolicitanteOrAdmin = false;

  constructor(
    private route: ActivatedRoute,
    private evaluacionService: EvaluacionService,
    private licitacionService: LicitacionService,
    private tokenService: TokenService
  ) {}

  ngOnInit(): void {
    this.isAreaSolicitanteOrAdmin = this.tokenService.isAdmin() || 
                                    this.tokenService.isArea() || 
                                    this.tokenService.hasAnyRole('AUTORIDAD');

    const id = this.route.snapshot.paramMap.get('licitacionId');
    if (id) {
      this.licitacionId = Number(id);
      this.loadData();
    }
  }

  loadData(): void {
    this.licitacionService.getById(this.licitacionId).subscribe((data: any) => {
      this.licitacion = data;
    });

    this.evaluacionService.getRanking(this.licitacionId).subscribe({
      next: (data: any[]) => {
        this.ranking = data;
        this.loading = false;
      },
      error: (err: any) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  getStarArray(stars: number): number[] {
    return Array(stars || 0).fill(0);
  }

  getBestScore(): number {
    return this.ranking.length > 0 ? this.ranking[0].puntajeTotal : 0;
  }

  getMaxScore(): number {
    if (this.ranking.length > 0) {
      const best = this.getBestScore();
      return best > 50 ? 100 : 50;
    }
    return 100;
  }

  selectTab(tab: string): void {
    this.currentTab = tab;
  }

  descargarReportePDF(): void {
    Swal.fire({
      title: 'Generando Reporte PDF...',
      text: 'Preparando la vista de impresión oficial de resultados.',
      icon: 'info',
      timer: 1500,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    }).then(() => {
      window.print();
    });
  }

  exportToExcel(): void {
    if (this.ranking.length === 0) {
      Swal.fire('Atención', 'No hay propuestas en el ranking para exportar.', 'warning');
      return;
    }
    
    // Generar formato CSV compatible con Excel
    let csvContent = '\ufeff'; // BOM para soportar tildes en Excel
    csvContent += 'Ranking,Nombre del Proveedor,RUC,Propuesta,Puntaje Técnico,Puntaje Económico,Puntaje Experiencia,Puntaje Total,Puntaje Máximo,Estado Final\n';
    
    this.ranking.forEach((p, idx) => {
      const pos = idx + 1;
      const providerName = `${p.usuario?.nombre || ''} ${p.usuario?.apellido || ''}`.replace(/"/g, '""');
      const ruc = p.usuario?.ruc || p.usuario?.identificacion || 'N/A';
      const propTitle = (p.nombre || 'Propuesta sin título').replace(/"/g, '""');
      
      // Proporciones dinámicas en base al puntaje total
      const scoreTotal = p.puntajeTotal;
      const maxScore = this.getMaxScore();
      const scoreTecnico = (scoreTotal * 0.6).toFixed(2);
      const scoreEconomico = (scoreTotal * 0.3).toFixed(2);
      const scoreExperiencia = (scoreTotal * 0.1).toFixed(2);
      const finalStatus = idx === 0 ? 'ADJUDICADA' : 'EVALUADA';
      
      csvContent += `${pos},"${providerName}",${ruc},"${propTitle}",${scoreTecnico},${scoreEconomico},${scoreExperiencia},${scoreTotal},${maxScore},${finalStatus}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_evaluacion_${this.licitacion?.codigo || 'proceso'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    Swal.fire({
      title: '¡Exportación Exitosa!',
      text: 'El reporte de ranking se ha descargado en formato CSV/Excel.',
      icon: 'success',
      confirmButtonColor: '#10b981'
    });
  }

  imprimirResultado(): void {
    window.print();
  }

  adjudicar(propuestaId?: number): void {
    const pId = propuestaId || (this.ranking.length > 0 ? this.ranking[0].id : null);
    if (!pId) return;

    const provider = this.ranking.find(r => r.id === pId);

    Swal.fire({
      title: '¿Confirmar Adjudicación?',
      text: `¿Está seguro de adjudicar esta licitación a ${provider?.usuario?.nombre || 'la propuesta seleccionada'}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, adjudicar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#22c55e',
      cancelButtonColor: '#ef4444',
      background: '#ffffff',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Procesando...',
          text: 'Estamos formalizando la adjudicación.',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        this.licitacionService.adjudicar(this.licitacionId, pId).subscribe({
          next: () => {
            Swal.fire({
              title: '¡Éxito!',
              text: 'La licitación ha sido adjudicada y el contrato se ha generado automáticamente.',
              icon: 'success',
              confirmButtonColor: '#3b82f6'
            });
            this.loadData();
          },
          error: (err) => {
            console.error('Error al adjudicar', err);
            Swal.fire({
              title: 'Error',
              text: 'No se pudo completar la adjudicación: ' + (err.error?.message || err.message),
              icon: 'error',
              confirmButtonColor: '#ef4444'
            });
          }
        });
      }
    });
  }

  rechazarAdjudicacion(propuestaId?: number): void {
    const pId = propuestaId || (this.ranking.length > 0 ? this.ranking[0].id : null);
    if (!pId) return;

    const provider = this.ranking.find(r => r.id === pId);

    Swal.fire({
      title: '¿Rechazar Adjudicación?',
      text: `Ingrese el motivo para rechazar la adjudicación de la propuesta de "${provider?.usuario?.nombre || 'la propuesta seleccionada'}":`,
      input: 'textarea',
      inputPlaceholder: 'Escriba la justificación detallada aquí...',
      inputAttributes: {
        'aria-label': 'Escriba la justificación'
      },
      showCancelButton: true,
      confirmButtonText: 'Sí, rechazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      preConfirm: (value) => {
        if (!value || !value.trim()) {
          Swal.showValidationMessage('Debe ingresar un motivo para el rechazo');
        }
        return value;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Procesando...',
          text: 'Registrando el rechazo de adjudicación.',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        this.licitacionService.rechazarAdjudicacion(this.licitacionId, pId, result.value).subscribe({
          next: () => {
            Swal.fire({
              title: '¡Éxito!',
              text: 'La adjudicación ha sido rechazada y el estado de la propuesta se ha actualizado.',
              icon: 'success',
              confirmButtonColor: '#3b82f6'
            });
            this.loadData();
          },
          error: (err) => {
            console.error('Error al rechazar adjudicación', err);
            Swal.fire({
              title: 'Error',
              text: 'No se pudo completar el rechazo: ' + (err.error?.message || err.message),
              icon: 'error',
              confirmButtonColor: '#ef4444'
            });
          }
        });
      }
    });
  }
}
