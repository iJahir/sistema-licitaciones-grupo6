import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { TokenService } from '../services/token.service';

export const authGuard = () => {
  const router = inject(Router);
  const tokenService = inject(TokenService);

  if (tokenService.isAuthenticated()) {
    return true;
  }

  console.warn('AuthGuard: Sesión no válida o expirada. Redirigiendo a Login.');
  router.navigate(['/login']);
  return false;
};
