import { inject } from '@angular/core';
import { Router, ActivatedRouteSnapshot } from '@angular/router';
import { TokenService } from '../services/token.service';
import Swal from 'sweetalert2';

export const roleGuard = (route: ActivatedRouteSnapshot) => {
  const router = inject(Router);
  const tokenService = inject(TokenService);
  
  const expectedRoles: string[] = route.data['roles'];
  const user = tokenService.getUser();

  if (!user || !user.roles) {
    router.navigate(['/login']);
    return false;
  }

  const hasRole = tokenService.hasAnyRole(...expectedRoles);

  if (!hasRole) {
    console.warn(`RoleGuard: Acceso denegado. Se requiere: ${expectedRoles.join(' o ')}`);
    Swal.fire({
      icon: 'error',
      title: 'Acceso Denegado',
      text: 'No tienes los permisos necesarios para acceder a este módulo.',
      background: '#1e293b',
      color: '#f8fafc',
      confirmButtonColor: '#38bdf8'
    });
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};
