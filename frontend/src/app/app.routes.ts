import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { CrearLicitacionComponent } from './features/licitaciones/crear-licitacion/crear-licitacion.component';
import { LicitacionListComponent } from './features/licitaciones/licitacion-list/licitacion-list.component';
import { LayoutComponent } from './shared/components/layout/layout.component';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', loadComponent: () => import('./features/auth/register/register.component').then(c => c.RegisterComponent) },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'licitaciones', component: LicitacionListComponent },
      { path: 'licitaciones/crear', component: CrearLicitacionComponent, canActivate: [roleGuard], data: { roles: ['ROLE_ADMINISTRADOR', 'ROLE_AREA_SOLICITANTE', 'ROLE_GESTOR_LICITACIONES'] } },
      { path: 'licitaciones/editar/:id', component: CrearLicitacionComponent, canActivate: [roleGuard], data: { roles: ['ROLE_ADMINISTRADOR', 'ROLE_AREA_SOLICITANTE', 'ROLE_GESTOR_LICITACIONES'] } },
      { path: 'licitaciones/:id', loadComponent: () => import('./features/licitaciones/licitacion-detail/licitacion-detail.component').then(c => c.LicitacionDetailComponent) },
      { path: 'propuestas', loadComponent: () => import('./features/propuestas/propuesta-list/propuesta-list.component').then(c => c.PropuestaListComponent) },
      { path: 'propuestas/:id', loadComponent: () => import('./features/propuestas/propuesta-detail/propuesta-detail.component').then(c => c.PropuestaDetailComponent) },
      { path: 'licitaciones/postular/:id', loadComponent: () => import('./features/propuestas/postular-licitacion/postular-licitacion.component').then(c => c.PostularLicitacionComponent), canActivate: [roleGuard], data: { roles: ['ROLE_PROVEEDOR', 'ROLE_ADMINISTRADOR', 'ROLE_GESTOR_LICITACIONES'] } },
      { path: 'evaluaciones', loadComponent: () => import('./features/evaluaciones/evaluacion-list/evaluacion-list.component').then(c => c.EvaluacionListComponent), canActivate: [roleGuard], data: { roles: ['ROLE_ADMINISTRADOR', 'ROLE_EVALUADOR', 'ROLE_AUTORIDAD', 'ROLE_AREA_SOLICITANTE', 'ROLE_GESTOR_LICITACIONES'] } },
      { path: 'resultados', loadComponent: () => import('./features/licitaciones/licitacion-list/licitacion-list.component').then(c => c.LicitacionListComponent), data: { viewMode: 'resultados' } },
      { path: 'evaluaciones/:id', loadComponent: () => import('./features/evaluaciones/evaluacion-proposals/evaluacion-proposals.component').then(c => c.EvaluacionProposalsComponent), canActivate: [roleGuard], data: { roles: ['ROLE_ADMINISTRADOR', 'ROLE_EVALUADOR', 'ROLE_AUTORIDAD', 'ROLE_AREA_SOLICITANTE', 'ROLE_GESTOR_LICITACIONES'] } },
      { path: 'evaluaciones/evaluar/:propuestaId', loadComponent: () => import('./features/evaluaciones/evaluar-licitacion/evaluar-licitacion.component').then(c => c.EvaluarLicitacionComponent), canActivate: [roleGuard], data: { roles: ['ROLE_ADMINISTRADOR', 'ROLE_EVALUADOR', 'ROLE_GESTOR_LICITACIONES'] } },
      { path: 'evaluaciones/form/:propuestaId', redirectTo: 'evaluaciones/evaluar/:propuestaId', pathMatch: 'full' },
      { path: 'evaluaciones/rubrica/:licitacionId', loadComponent: () => import('./features/evaluaciones/rubrica-form/rubrica-form.component').then(c => c.RubricaFormComponent), canActivate: [roleGuard], data: { roles: ['ROLE_ADMINISTRADOR', 'ROLE_AREA_SOLICITANTE', 'ROLE_GESTOR_LICITACIONES'] } },
      { path: 'evaluaciones/resultados/:licitacionId', loadComponent: () => import('./features/evaluaciones/evaluacion-resultados/evaluacion-resultados.component').then(c => c.EvaluacionResultadosComponent) },
      { path: 'usuarios', loadComponent: () => import('./features/usuarios/usuario-list/usuario-list.component').then(c => c.UsuarioListComponent), canActivate: [roleGuard], data: { roles: ['ROLE_ADMINISTRADOR', 'ROLE_AUTORIDAD'] } },
      { path: 'roles-permisos', redirectTo: 'administracion/roles-permisos', pathMatch: 'full' },
      { path: 'administracion/roles-permisos', loadComponent: () => import('./features/administracion/roles-permisos/roles-permisos.component').then(c => c.RolesPermisosComponent), canActivate: [roleGuard], data: { roles: ['ROLE_ADMINISTRADOR', 'ROLE_AUTORIDAD'] } },
      { path: 'usuarios/crear', loadComponent: () => import('./features/usuarios/usuario-form/usuario-form.component').then(c => c.UsuarioFormComponent), canActivate: [roleGuard], data: { roles: ['ROLE_ADMINISTRADOR', 'ROLE_AUTORIDAD'] } },
      { path: 'usuarios/editar/:id', loadComponent: () => import('./features/usuarios/usuario-form/usuario-form.component').then(c => c.UsuarioFormComponent), canActivate: [roleGuard], data: { roles: ['ROLE_ADMINISTRADOR', 'ROLE_AUTORIDAD'] } },
      { path: 'auditoria', loadComponent: () => import('./features/auditoria/auditoria-list/auditoria-list.component').then(c => c.AuditoriaListComponent), canActivate: [roleGuard], data: { roles: ['ROLE_ADMINISTRADOR', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_AUTORIDAD', 'ROLE_AUDITOR'] } },
      // Rutas de Reportes
      { path: 'reportes', loadComponent: () => import('./features/reportes/reportes-dashboard/reportes-dashboard').then(c => c.ReportesDashboard), canActivate: [roleGuard], data: { roles: ['ROLE_ADMINISTRADOR', 'ROLE_AUDITOR', 'ROLE_AUTORIDAD', 'ROLE_GESTOR_LICITACIONES'] } },
      { path: 'reportes/licitaciones', loadComponent: () => import('./features/reportes/reporte-licitaciones/reporte-licitaciones.component').then(c => c.ReporteLicitacionesComponent), canActivate: [roleGuard], data: { roles: ['ROLE_ADMINISTRADOR', 'ROLE_AUDITOR', 'ROLE_AUTORIDAD', 'ROLE_GESTOR_LICITACIONES'] } },
      { path: 'reportes/propuestas', loadComponent: () => import('./features/reportes/reporte-propuestas/reporte-propuestas.component').then(c => c.ReportePropuestasComponent), canActivate: [roleGuard], data: { roles: ['ROLE_ADMINISTRADOR', 'ROLE_AUDITOR', 'ROLE_AUTORIDAD', 'ROLE_GESTOR_LICITACIONES'] } },
      { path: 'reportes/evaluaciones', loadComponent: () => import('./features/reportes/reporte-evaluaciones/reporte-evaluaciones.component').then(c => c.ReporteEvaluacionesComponent), canActivate: [roleGuard], data: { roles: ['ROLE_ADMINISTRADOR', 'ROLE_AUDITOR', 'ROLE_AUTORIDAD', 'ROLE_GESTOR_LICITACIONES'] } },
      { path: 'reportes/evaluadores', loadComponent: () => import('./features/reportes/reporte-evaluadores/reporte-evaluadores.component').then(c => c.ReporteEvaluadoresComponent), canActivate: [roleGuard], data: { roles: ['ROLE_ADMINISTRADOR', 'ROLE_AUDITOR', 'ROLE_AUTORIDAD', 'ROLE_GESTOR_LICITACIONES'] } },
      { path: 'reportes/contratos', loadComponent: () => import('./features/reportes/reporte-contratos/reporte-contratos.component').then(c => c.ReporteContratosComponent), canActivate: [roleGuard], data: { roles: ['ROLE_ADMINISTRADOR', 'ROLE_AUDITOR', 'ROLE_AUTORIDAD', 'ROLE_GESTOR_LICITACIONES'] } },
      { path: 'reportes/adjudicaciones', loadComponent: () => import('./features/reportes/reporte-adjudicaciones/reporte-adjudicaciones.component').then(c => c.ReporteAdjudicacionesComponent), canActivate: [roleGuard], data: { roles: ['ROLE_ADMINISTRADOR', 'ROLE_AUDITOR', 'ROLE_AUTORIDAD', 'ROLE_GESTOR_LICITACIONES'] } },
      { path: 'reportes/financiero', loadComponent: () => import('./features/reportes/reporte-financiero/reporte-financiero.component').then(c => c.ReporteFinancieroComponent), canActivate: [roleGuard], data: { roles: ['ROLE_ADMINISTRADOR', 'ROLE_AUDITOR', 'ROLE_AUTORIDAD', 'ROLE_GESTOR_LICITACIONES'] } },
      { path: 'reportes/licitaciones/analisis/:id', loadComponent: () => import('./features/reportes/reporte-licitacion-detalle/reporte-licitacion-detalle.component').then(c => c.ReporteLicitacionDetalleComponent), canActivate: [roleGuard], data: { roles: ['ROLE_ADMINISTRADOR', 'ROLE_AUDITOR', 'ROLE_AUTORIDAD', 'ROLE_GESTOR_LICITACIONES'] } },
      { path: 'reportes/auditoria', loadComponent: () => import('./features/reportes/reporte-auditoria/reporte-auditoria.component').then(c => c.ReporteAuditoriaComponent), canActivate: [roleGuard], data: { roles: ['ROLE_ADMINISTRADOR', 'ROLE_AUDITOR'] } },
      // Rutas de Contratos
      { path: 'contratos', loadComponent: () => import('./features/contratos/contrato-list/contrato-list.component').then(c => c.ContratoListComponent) },
      { path: 'contratos/generar/:licitacionId', loadComponent: () => import('./features/contratos/contrato-form/contrato-form.component').then(c => c.ContratoFormComponent), canActivate: [roleGuard], data: { roles: ['ROLE_ADMINISTRADOR', 'ROLE_AUTORIDAD', 'ROLE_GESTOR_LICITACIONES'] } },
      { path: 'contratos/:id', loadComponent: () => import('./features/contratos/contrato-detail/contrato-detail.component').then(c => c.ContratoDetailComponent) },
      // Rutas de Planificación
      {
        path: 'planificacion',
        loadComponent: () => import('./features/planificacion/planificacion.component').then(c => c.PlanificacionComponent),
        canActivate: [roleGuard],
        data: { roles: [
          'ROLE_ADMINISTRADOR', 'ROLE_AREA_SOLICITANTE', 'ROLE_AUTORIDAD', 'ROLE_PROVEEDOR', 
          'ROLE_SUPER_ADMIN', 'ROLE_GESTOR_LICITACIONES', 'ROLE_ADMIN', 'ROLE_OBSERVADOR',
          'ROLE_EVALUADOR', 'ROLE_EVALUADOR_GENERAL', 'ROLE_EVALUADOR_FINANCIERO', 
          'ROLE_EVALUADOR_TECNICO', 'ROLE_EVALUADOR_LEGAL'
        ] },
        children: [
          { path: 'calendario', loadComponent: () => import('./features/planificacion/calendario/calendario.component').then(c => c.CalendarioComponent) },
          { path: 'cronograma', loadComponent: () => import('./features/planificacion/cronograma/cronograma.component').then(c => c.CronogramaComponent), canActivate: [roleGuard], data: { roles: ['ROLE_ADMINISTRADOR', 'ROLE_AREA_SOLICITANTE', 'ROLE_AUTORIDAD', 'ROLE_SUPER_ADMIN', 'ROLE_GESTOR_LICITACIONES', 'ROLE_ADMIN'] } },
          { path: 'eventos', loadComponent: () => import('./features/planificacion/eventos/eventos.component').then(c => c.EventosComponent), canActivate: [roleGuard], data: { roles: ['ROLE_ADMINISTRADOR', 'ROLE_AREA_SOLICITANTE', 'ROLE_AUTORIDAD', 'ROLE_SUPER_ADMIN', 'ROLE_GESTOR_LICITACIONES', 'ROLE_ADMIN'] } },
          { path: '', redirectTo: 'calendario', pathMatch: 'full' }
        ]
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
