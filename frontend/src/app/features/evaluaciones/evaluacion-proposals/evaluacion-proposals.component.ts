import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { EvaluacionService } from '../../../core/services/evaluacion.service';
import { LicitacionService } from '../../../core/services/licitacion.service';
import { TokenService } from '../../../core/services/token.service';
import { Licitacion } from '../../../data/models/licitacion.model';
import { API_CONFIG } from '../../../core/config/api-config';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-evaluacion-proposals',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './evaluacion-proposals.component.html',
  styleUrls: ['./evaluacion-proposals.component.scss']
})
export class EvaluacionProposalsComponent implements OnInit {
  licitacionId!: number;
  licitacion?: Licitacion;
  propuestas: any[] = [];
  loading = true;
  downloadingZip = false;
  isAdjudicating = false;
  isAdmin = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private evaluacionService: EvaluacionService,
    private licitacionService: LicitacionService,
    private tokenService: TokenService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.licitacionId = Number(id);
      this.isAdmin = this.tokenService.isAdmin();
      this.loadData();
    } else {
      this.router.navigate(['/evaluaciones']);
    }
  }

  loadData(): void {
    this.licitacionService.getById(this.licitacionId).subscribe({
      next: (data) => this.licitacion = data,
      error: (err) => console.error('Error al cargar licitación', err)
    });

    this.evaluacionService.getPropuestasByLicitacion(this.licitacionId).subscribe({
      next: (data) => {
        this.propuestas = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar propuestas', err);
        this.loading = false;
      }
    });
  }

  getEvalStatusLabel(propuesta: any): string {
    const status = propuesta.estadoEvaluacion;
    if (status === 'PENDIENTE') return 'Pendiente';
    if (status === 'BORRADOR') return 'En Borrador';
    if (status === 'FINALIZADO') return 'Evaluado';
    return status;
  }

  getStatusIcon(propuesta: any): string {
    const status = propuesta.estadoEvaluacion;
    if (status === 'PENDIENTE') return '⏳';
    if (status === 'BORRADOR') return '📝';
    if (status === 'FINALIZADO') return '✔️';
    return '❓';
  }

  adjudicar(): void {
    Swal.fire({
      title: '¿Cerrar Evaluaciones y Adjudicar?',
      text: '¿Está seguro de cerrar las evaluaciones y adjudicar al ganador con mayor puntaje? Esta acción finalizará el proceso.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, Adjudicar Ganador',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#8b5cf6',
      cancelButtonColor: '#64748b'
    }).then((result) => {
      if (result.isConfirmed) {
        this.isAdjudicating = true;
        this.evaluacionService.adjudicar(this.licitacionId).subscribe({
          next: () => {
            Swal.fire('¡Proceso Finalizado!', 'La licitación ha sido adjudicada con éxito.', 'success').then(() => {
              this.router.navigate(['/evaluaciones']);
            });
          },
          error: (err) => {
            console.error('Error al adjudicar', err);
            Swal.fire('Error', 'No se pudo adjudicar: ' + (err.error?.message || 'Error desconocido'), 'error');
            this.isAdjudicating = false;
          }
        });
      }
    });
  }

  downloadZip(): void {
    if (this.downloadingZip) return;
    this.downloadingZip = true;
    
    this.evaluacionService.downloadPropuestasZip(this.licitacionId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `LIC-${this.licitacionId}-propuestas.zip`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.downloadingZip = false;
      },
      error: (err) => {
        console.error('Error al descargar ZIP', err);
        this.downloadingZip = false;
      }
    });
  }

  viewDocument(url: string): void {
    if (url) window.open(this.getDownloadUrl(url), '_blank');
  }

  getDownloadUrl(path: string): string {
    if (!path) return '#';
    if (path.startsWith('http')) return path;
    const baseUrl = API_CONFIG.baseUrl.replace(/\/api\/$/, '');
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    return baseUrl + cleanPath;
  }
}
