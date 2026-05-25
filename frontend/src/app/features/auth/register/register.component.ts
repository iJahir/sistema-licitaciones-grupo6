import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  form: any = {
    username: '',
    email: '',
    password: '',
    nombre: '',
    apellido: '',
    empresaNombre: '',
    ruc: '',
    telefono: '',
    categoria: 'Construcción',
    pais: 'Guatemala',
    observaciones: ''
  };
  isSuccessful = false;
  isSignUpFailed = false;
  errorMessage = '';
  loading = false;

  constructor(private authService: AuthService, private router: Router) { }

  onSubmit(): void {
    this.loading = true;
    this.authService.register(this.form).subscribe({
      next: data => {
        console.log(data);
        this.isSuccessful = true;
        this.isSignUpFailed = false;
        this.loading = false;
        
        Swal.fire({
          title: '¡Registro Exitoso!',
          text: 'Tu cuenta de proveedor ha sido creada. Ya puedes iniciar sesión.',
          icon: 'success',
          confirmButtonColor: '#3b82f6'
        }).then(() => {
          this.router.navigate(['/login']);
        });
      },
      error: err => {
        this.errorMessage = err.error?.message || 'Error al registrar usuario';
        this.isSignUpFailed = true;
        this.loading = false;
        Swal.fire('Error', this.errorMessage, 'error');
      }
    });
  }
}
