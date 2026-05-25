import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { TokenService } from '../services/token.service';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  const router = inject(Router);
  const token = tokenService.getToken();

  let authReq = req;

  // Solo añadir el token si existe y la petición es para nuestra API
  if (token && req.url.includes('/api/')) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Token expirado o inválido
        tokenService.signOut();
        router.navigate(['/login']);
      } else if (error.status === 403) {
        import('sweetalert2').then(Swal => {
          Swal.default.fire({
            icon: 'error',
            title: 'Acceso Denegado (403)',
            text: 'No tienes permisos de servidor para realizar esta acción.',
            background: '#1e293b',
            color: '#f8fafc',
            confirmButtonColor: '#38bdf8'
          });
        });
      }
      return throwError(() => error);
    })
  );
};
