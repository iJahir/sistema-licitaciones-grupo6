import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { TokenService } from '../../../core/services/token.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoggedIn = false;
  isLoginFailed = false;
  errorMessage = '';
  roles: string[] = [];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private tokenService: TokenService,
    private router: Router
  ) {
    // Cargar usuario recordado si existe
    const savedUsername = localStorage.getItem('remembered-username');
    
    this.loginForm = this.fb.group({
      username: [savedUsername || '', [Validators.required]],
      password: ['', [Validators.required]],
      rememberMe: [!!savedUsername]
    });
  }

  ngOnInit(): void {
    const token = this.tokenService.getToken();
    if (token) {
      this.isLoggedIn = true;
      this.router.navigate(['/dashboard']);
    }
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      const { username, password, rememberMe } = this.loginForm.value;
      
      // Mostrar estado de carga Premium
      Swal.fire({
        title: 'Autenticando...',
        text: 'Verificando credenciales en el servidor seguro',
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => {
          Swal.showLoading();
        },
        background: '#fff',
        color: '#1e293b'
      });
      
      this.authService.login({ username, password }).subscribe({
        next: data => {
          // Manejar persistencia de nombre de usuario
          if (rememberMe) {
            localStorage.setItem('remembered-username', username);
          } else {
            localStorage.removeItem('remembered-username');
          }

          this.tokenService.saveToken(data.token);
          this.tokenService.saveUser(data);

          this.isLoginFailed = false;
          this.isLoggedIn = true;

          // Alerta de éxito antes de redirigir
          Swal.fire({
            icon: 'success',
            title: '¡Acceso Concedido!',
            text: `Bienvenido de nuevo, ${data.nombre || username}`,
            timer: 1500,
            showConfirmButton: false,
            background: '#fff',
            color: '#1e293b'
          }).then(() => {
            this.router.navigate(['/dashboard']);
          });
        },
        error: err => {
          console.error('Login error', err);
          this.isLoginFailed = true;
          this.errorMessage = 'Acceso denegado. Verifica tus credenciales.';
          
          // Alerta de error elegante
          Swal.fire({
            icon: 'error',
            title: 'Error de Autenticación',
            text: 'Las credenciales ingresadas no son válidas o el usuario no existe.',
            confirmButtonText: 'REINTENTAR',
            confirmButtonColor: '#3b82f6',
            background: '#fff',
            color: '#1e293b'
          });
        }
      });
    }
  }
}
