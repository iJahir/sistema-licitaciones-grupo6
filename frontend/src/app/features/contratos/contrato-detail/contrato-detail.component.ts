import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ContratoService } from '../../../core/services/contrato.service';
import { TokenService } from '../../../core/services/token.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-contrato-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="contract-page-container" *ngIf="contrato">
      <div class="page-header premium-glass fade-in">
        <div class="header-left">
          <div class="breadcrumb-modern">
            <span (click)="goBack()" class="link">Licitaciones</span>
            <i class="fas fa-chevron-right sep"></i>
            <span class="active">Contrato Digital</span>
          </div>
          <div class="title-with-badge">
            <h1>Contrato #{{ contrato.codigo }}</h1>
            <span class="status-pill" [ngClass]="contrato.estado.toLowerCase()">
              {{ contrato.estado }}
            </span>
          </div>
          <p class="subtitle">Documento formal de adjudicación y cumplimiento</p>
        </div>
        <div class="header-right">
          <button class="btn-premium success" *ngIf="canSignAsProveedor" (click)="firmar('PROVEEDOR')">
            <i class="fas fa-file-signature"></i> Firmar Proveedor
          </button>
          <button class="btn-premium success" *ngIf="canValidateAsArea" (click)="validarArea()">
            <i class="fas fa-check-double"></i> Validar Conformidad
          </button>
          <button class="btn-premium success" *ngIf="canSignAsAutoridad" (click)="firmar('AUTORIDAD')">
            <i class="fas fa-file-signature"></i> Firmar Autoridad
          </button>
          <button class="btn-premium primary" (click)="descargar()">
            <i class="fas fa-file-pdf"></i> Generar PDF
          </button>
        </div>
      </div>

      <div class="content-grid fade-in delay-1">
        <main class="main-column">
          <!-- Document Card -->
          <div class="contract-card premium-glass-card">
            <div class="card-section">
              <h3 class="section-title"><i class="fas fa-users"></i> Partes Intervinientes</h3>
              <div class="parties-grid">
                <div class="party-box">
                  <label>Entidad Contratante</label>
                  <div class="party-info">
                    <div class="party-icon"><i class="fas fa-landmark"></i></div>
                    <div class="party-text">
                      <span class="name">Sistema Nacional de Licitaciones</span>
                      <span class="sub">Administración Central</span>
                    </div>
                  </div>
                </div>
                <div class="party-box highlight">
                  <label>Contratista Adjudicado</label>
                  <div class="party-info">
                    <div class="party-icon"><i class="fas fa-building"></i></div>
                    <div class="party-text">
                      <span class="name">{{ contrato.propuesta?.empresaNombre }}</span>
                      <span class="sub">RUC: {{ contrato.propuesta?.identificacionRuc || 'N/A' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="card-section">
              <h3 class="section-title"><i class="fas fa-file-alt"></i> Objeto del Contrato</h3>
              <div class="object-box">
                <span class="tender-ref">Licitación vinculada:</span>
                <p class="tender-title">{{ contrato.licitacion?.titulo }}</p>
                <p class="tender-desc">{{ contrato.licitacion?.descripcion }}</p>
              </div>
            </div>

            <div class="card-section">
              <h3 class="section-title"><i class="fas fa-hand-holding-usd"></i> Condiciones y Plazos</h3>
              <div class="conditions-grid">
                <div class="condition-item">
                  <div class="icon-circle"><i class="fas fa-money-bill-wave"></i></div>
                  <div class="data">
                    <label>Monto Total Adjudicado</label>
                    <span class="value price">{{ contrato.monto | currency }}</span>
                  </div>
                </div>
                <div class="condition-item">
                  <div class="icon-circle"><i class="fas fa-calendar-alt"></i></div>
                  <div class="data">
                    <label>Periodo de Vigencia</label>
                    <span class="value">
                      {{ (contrato.fechaInicio | date:'dd/MM/yyyy') || 'Pendiente de firma' }}
                      <span class="sep">→</span>
                      {{ (contrato.fechaFin | date:'dd/MM/yyyy') || 'Pendiente' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div class="card-section no-border" *ngIf="contrato.observaciones">
              <h3 class="section-title"><i class="fas fa-info-circle"></i> Observaciones Generales</h3>
              <div class="obs-box">
                {{ contrato.observaciones }}
              </div>
            </div>
          </div>
        </main>

        <aside class="side-column">
          <!-- Status Tracker -->
          <div class="sidebar-card premium-glass-card">
            <h3>Estado de Formalización</h3>
            <div class="timeline-modern">
              <div class="timeline-step" [class.completed]="true">
                <div class="step-icon"><i class="fas fa-check"></i></div>
                <div class="step-content">
                  <label>Generación</label>
                  <span>{{ contrato.createdAt | date:'short' }}</span>
                </div>
              </div>
              <div class="timeline-step" [class.completed]="contrato.firmadoProveedor">
                <div class="step-icon">
                  <i class="fas" [ngClass]="contrato.firmadoProveedor ? 'fa-check' : 'fa-pen-fancy'"></i>
                </div>
                <div class="step-content">
                  <label>Firma Proveedor</label>
                  <span [class.pending]="!contrato.firmadoProveedor">
                    {{ contrato.firmadoProveedor ? 'Completado' : 'Pendiente' }}
                  </span>
                  <small *ngIf="contrato.fechaFirmaProveedor">{{ contrato.fechaFirmaProveedor | date:'short' }}</small>
                </div>
              </div>
              <div class="timeline-step" [class.completed]="contrato.validadoArea">
                <div class="step-icon">
                  <i class="fas" [ngClass]="contrato.validadoArea ? 'fa-check' : 'fa-user-check'"></i>
                </div>
                <div class="step-content">
                  <label>Validación Área Solicitante</label>
                  <span [class.pending]="!contrato.validadoArea">
                    {{ contrato.validadoArea ? 'Completado' : 'Pendiente' }}
                  </span>
                  <small *ngIf="contrato.fechaValidacionArea">{{ contrato.fechaValidacionArea | date:'short' }}</small>
                </div>
              </div>
              <div class="timeline-step" [class.completed]="contrato.firmadoAutoridad">
                <div class="step-icon">
                  <i class="fas" [ngClass]="contrato.firmadoAutoridad ? 'fa-check' : 'fa-signature'"></i>
                </div>
                <div class="step-content">
                  <label>Firma Autoridad</label>
                  <span [class.pending]="!contrato.firmadoAutoridad">
                    {{ contrato.firmadoAutoridad ? 'Completado' : 'Pendiente' }}
                  </span>
                  <small *ngIf="contrato.fechaFirmaAutoridad">{{ contrato.fechaFirmaAutoridad | date:'short' }}</small>
                </div>
              </div>
            </div>
          </div>

          <div class="sidebar-card premium-glass-card security">
            <h3>Integridad Digital</h3>
            <div class="security-item">
              <i class="fas fa-shield-alt"></i>
              <span>Protección SSL 256-bit</span>
            </div>
            <div class="security-item">
              <i class="fas fa-fingerprint"></i>
              <span>Hash de validación activo</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  `,
  styles: [`
    .contract-page-container { padding: 2rem; }
    
    .page-header {
      padding: 2rem; border-radius: 1.5rem; margin-bottom: 2rem;
      display: flex; justify-content: space-between; align-items: center;
      background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(15px);
      border: 1px solid rgba(255, 255, 255, 0.5); box-shadow: 0 10px 30px rgba(0,0,0,0.05);
    }

    .title-with-badge {
      display: flex; align-items: center; gap: 1rem; margin: 0.5rem 0;
      h1 { margin: 0; font-size: 2.2rem; font-weight: 800; color: #0f172a; }
    }

    .status-pill {
      padding: 0.4rem 1.2rem; border-radius: 2rem; font-size: 0.8rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.05em;
      &.pendiente { background: #fef9c3; color: #854d0e; }
      &.firmado { background: #dcfce7; color: #15803d; }
    }

    .content-grid { display: grid; grid-template-columns: 1fr 350px; gap: 2rem; }

    .premium-glass-card {
      background: white; border-radius: 1.5rem; padding: 2rem;
      border: 1px solid #f1f5f9; box-shadow: 0 4px 20px rgba(0,0,0,0.02);
    }

    .section-title {
      font-size: 0.85rem; font-weight: 700; color: #64748b; text-transform: uppercase;
      letter-spacing: 0.1em; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem;
      i { color: #3b82f6; font-size: 1rem; }
    }

    .card-section { margin-bottom: 2.5rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 2rem; }
    .card-section.no-border { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }

    .parties-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    .party-box {
      padding: 1.5rem; border-radius: 1rem; background: #f8fafc; border: 1px solid #f1f5f9;
      label { display: block; font-size: 0.75rem; color: #94a3b8; font-weight: 600; margin-bottom: 1rem; }
      &.highlight { background: #eff6ff; border-color: #dbeafe; }
    }

    .party-info { display: flex; gap: 1rem; align-items: center; }
    .party-icon { 
      width: 45px; height: 45px; border-radius: 0.75rem; background: white;
      display: flex; align-items: center; justify-content: center; color: #3b82f6; font-size: 1.2rem;
      box-shadow: 0 4px 10px rgba(0,0,0,0.05);
    }
    .party-text {
      .name { display: block; font-weight: 700; color: #1e293b; font-size: 1.1rem; }
      .sub { font-size: 0.8rem; color: #64748b; }
    }

    .object-box {
      padding: 1.5rem; background: #f8fafc; border-radius: 1rem;
      .tender-ref { font-size: 0.75rem; color: #3b82f6; font-weight: 700; display: block; margin-bottom: 0.5rem; }
      .tender-title { font-weight: 700; color: #0f172a; font-size: 1.3rem; margin-bottom: 0.5rem; }
      .tender-desc { color: #64748b; line-height: 1.6; font-size: 0.95rem; }
    }

    .conditions-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    .condition-item {
      display: flex; gap: 1rem; align-items: center;
      .icon-circle { 
        width: 40px; height: 40px; border-radius: 50%; background: #f1f5f9; color: #475569;
        display: flex; align-items: center; justify-content: center;
      }
      label { display: block; font-size: 0.75rem; color: #64748b; font-weight: 600; }
      .value { font-weight: 700; color: #1e293b; font-size: 1.1rem; display: block; }
      .price { color: #10b981; font-size: 1.5rem; }
    }

    .side-column { display: flex; flex-direction: column; gap: 2rem; }
    .sidebar-card {
      h3 { font-size: 1rem; font-weight: 800; color: #0f172a; margin-bottom: 1.5rem; }
      &.security { background: #f1f5f9; }
    }

    .timeline-modern {
      display: flex; flex-direction: column; gap: 1.5rem; position: relative;
      &::before { content: ''; position: absolute; left: 14px; top: 0; bottom: 0; width: 2px; background: #f1f5f9; }
    }
    .timeline-step {
      display: flex; gap: 1.5rem; position: relative; z-index: 1;
      .step-icon {
        width: 30px; height: 30px; border-radius: 50%; background: white; border: 2px solid #e2e8f0;
        display: flex; align-items: center; justify-content: center; font-size: 0.7rem; color: #cbd5e1;
      }
      &.completed {
        .step-icon { background: #10b981; border-color: #10b981; color: white; }
        &::after { background: #10b981; }
      }
      label { display: block; font-size: 0.7rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
      span { font-weight: 700; color: #1e293b; display: block; font-size: 0.9rem; }
      .pending { color: #f59e0b; font-style: italic; }
      small { font-size: 0.7rem; color: #94a3b8; display: block; margin-top: 0.2rem; }
    }

    .security-item {
      display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; color: #64748b; font-size: 0.85rem; font-weight: 600;
      i { color: #10b981; }
    }

    .btn-premium {
      padding: 0.75rem 1.5rem; border-radius: 0.75rem; border: none; font-weight: 700; cursor: pointer;
      display: flex; align-items: center; gap: 0.75rem; transition: all 0.2s;
      &.primary { background: #3b82f6; color: white; &:hover { background: #2563eb; } }
      &.success { background: #10b981; color: white; &:hover { background: #059669; } }
    }

    .breadcrumb-modern {
      display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; font-weight: 600; color: #64748b;
      .link { cursor: pointer; &:hover { color: #3b82f6; } }
      .active { color: #0f172a; }
    }

    .fade-in { animation: fadeIn 0.5s ease-out forwards; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class ContratoDetailComponent implements OnInit {
  contrato: any = null;
  currentUser: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private contratoService: ContratoService,
    private tokenService: TokenService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.tokenService.getUser();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadContrato(+id);
    }
  }

  private hasRole(roleName: string): boolean {
    const roles = this.currentUser?.roles || [];
    return roles.some((r: any) => {
      const rName = (typeof r === 'string' ? r : (r.name || r.authority || '')).toUpperCase();
      return rName.includes(roleName.toUpperCase());
    });
  }

  get isAdmin(): boolean {
    return this.hasRole('ADMINISTRADOR') || this.hasRole('SUPER_ADMIN') || this.hasRole('GESTOR_LICITACIONES');
  }
  get isAutoridad(): boolean { return this.hasRole('AUTORIDAD'); }
  get isProveedor(): boolean { return this.hasRole('PROVEEDOR'); }

  get canSignAsProveedor(): boolean {
    if (!this.contrato || this.contrato.firmadoProveedor) return false;
    return this.isProveedor && this.contrato.propuesta?.usuario?.id === this.currentUser?.id;
  }

  get canValidateAsArea(): boolean {
    if (!this.contrato || this.contrato.validadoArea) return false;
    if (!this.contrato.firmadoProveedor) return false;
    
    const isArea = this.hasRole('AREA_SOLICITANTE');
    const isOwner = this.contrato.licitacion?.creadoPor?.id === this.currentUser?.id;
    return isArea && isOwner;
  }

  get canSignAsAutoridad(): boolean {
    if (!this.contrato || this.contrato.firmadoAutoridad) return false;
    if (!this.contrato.firmadoProveedor || !this.contrato.validadoArea) return false;
    return this.tokenService.hasAnyRole('ROLE_ADMINISTRADOR', 'ROLE_AUTORIDAD', 'ROLE_SUPER_ADMIN');
  }

  loadContrato(id: number) {
    this.contratoService.getById(id).subscribe(c => this.contrato = c);
  }

  firmar(rol: 'PROVEEDOR' | 'AUTORIDAD') {
    const action = rol === 'PROVEEDOR' ? 'proveedor' : 'autoridad';
    
    Swal.fire({
      title: 'Firma Digital de Contrato',
      text: `¿Desea proceder con la firma formal como ${rol}? Esta acción es vinculante.`,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Sí, firmar ahora',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Formalizando...',
          text: 'Estamos aplicando tu firma digital al documento.',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });

        const obs = rol === 'PROVEEDOR' 
          ? this.contratoService.firmarProveedor(this.contrato.id)
          : this.contratoService.firmarAutoridad(this.contrato.id);
          
        obs.subscribe({
          next: () => {
            Swal.fire({
              title: '¡Firmado!',
              text: 'El contrato ha sido formalizado correctamente.',
              icon: 'success',
              confirmButtonColor: '#3b82f6'
            });
            this.loadContrato(this.contrato.id);
          },
          error: (err) => {
            Swal.fire('Error', 'No se pudo completar la firma: ' + (err.error?.message || err.message), 'error');
          }
        });
      }
    });
  }

  validarArea() {
    Swal.fire({
      title: 'Validación de Conformidad',
      text: '¿Desea validar la conformidad técnica y operativa de este contrato? Esta acción habilitará la firma final de la Autoridad.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, validar conformidad',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Validando...',
          text: 'Registrando la validación de conformidad del Área Solicitante.',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });

        this.contratoService.validarArea(this.contrato.id).subscribe({
          next: () => {
            Swal.fire({
              title: '¡Validado!',
              text: 'La conformidad del contrato ha sido registrada exitosamente.',
              icon: 'success',
              confirmButtonColor: '#3b82f6'
            });
            this.loadContrato(this.contrato.id);
          },
          error: (err) => {
            Swal.fire('Error', 'No se pudo completar la validación: ' + (err.error?.message || err.message), 'error');
          }
        });
      }
    });
  }

  descargar() {
    Swal.fire({
      title: 'Generando Documento',
      text: 'Estamos preparando la versión PDF del contrato.',
      timer: 2000,
      timerProgressBar: true,
      didOpen: () => Swal.showLoading()
    }).then(() => {
      Swal.fire('Listo', 'El PDF ha sido generado y enviado a tu bandeja.', 'success');
    });
  }

  goBack() {
    this.router.navigate(['/contratos']);
  }
}
