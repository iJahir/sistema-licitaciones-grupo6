import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { LicitacionService } from '../../core/services/licitacion.service';
import { ContratoService } from '../../core/services/contrato.service';
import { TokenService } from '../../core/services/token.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

interface TimelineHito {
  titulo: string;
  codigo: string;
  fecha: string | Date;
  active: boolean;
  color: string;
  icon: string;
}

@Component({
  selector: 'app-planificacion',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './planificacion.component.html',
  styleUrls: ['./planificacion.component.scss']
})
export class PlanificacionComponent implements OnInit, OnDestroy {
  activeTab: string = 'calendario';
  timelineHitos: TimelineHito[] = [];
  private routerSub!: Subscription;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private licitacionService: LicitacionService,
    private contratoService: ContratoService,
    public tokenService: TokenService
  ) {
    // Intercept active tab changes on route changes immediately inside constructor
    this.syncActiveTab(this.router.url);
    this.routerSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.syncActiveTab(event.urlAfterRedirects || event.url);
    });
  }

  ngOnInit(): void {
    this.loadTimelineData();
  }

  ngOnDestroy(): void {
    if (this.routerSub) {
      this.routerSub.unsubscribe();
    }
  }

  syncActiveTab(url: string): void {
    if (url.includes('/cronograma')) {
      this.activeTab = 'cronograma';
    } else if (url.includes('/eventos')) {
      this.activeTab = 'eventos';
    } else {
      this.activeTab = 'calendario';
    }
  }

  loadTimelineData(): void {
    this.licitacionService.getAll({ size: 10 }).subscribe({
      next: (res) => {
        const lics = res.content || res || [];
        this.contratoService.getAll().subscribe({
          next: (contracts) => {
            const tempHitos: TimelineHito[] = [];

            // Add real licitaciones as hitos dynamically
            lics.forEach((l: any) => {
              if (l.fechaPublicacion) {
                tempHitos.push({
                  titulo: `Publicación: ${l.titulo.slice(0, 20)}...`,
                  codigo: l.codigo || `LIC-${l.id}`,
                  fecha: l.fechaPublicacion,
                  active: true,
                  color: '#3b82f6',
                  icon: 'fa-bullhorn'
                });
              }
              if (l.fechaCierre) {
                tempHitos.push({
                  titulo: `Cierre: ${l.titulo.slice(0, 20)}...`,
                  codigo: l.codigo || `LIC-${l.id}`,
                  fecha: l.fechaCierre,
                  active: l.estado === 'PUBLICADA' || l.estado === 'EN_INSCRIPCION',
                  color: '#10b981',
                  icon: 'fa-calendar-check'
                });
              }
            });

            // Add real contracts as hitos dynamically
            contracts.forEach((c: any) => {
              if (c.fechaFirma) {
                tempHitos.push({
                  titulo: `Firma de Contrato`,
                  codigo: c.codigo || `CONT-${c.id}`,
                  fecha: c.fechaFirma,
                  active: c.estado === 'FIRMADO',
                  color: '#06b6d4',
                  icon: 'fa-file-signature'
                });
              }
            });

            // Sort chronologically and limit to a reasonable amount (e.g. 10)
            this.timelineHitos = tempHitos
              .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
              .slice(0, 10);
          },
          error: () => this.timelineHitos = []
        });
      },
      error: () => this.timelineHitos = []
    });
  }
}
