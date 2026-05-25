import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { UsuarioService } from '../../../core/services/usuario.service';
import { RoleName } from '../../../data/models/usuario.model';
import { AreaService } from '../../../core/services/area.service';
import { TokenService } from '../../../core/services/token.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-usuario-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './usuario-form.component.html',
  styleUrls: ['./usuario-form.component.scss']
})
export class UsuarioFormComponent implements OnInit {
  usuarioForm: FormGroup;
  isEdit = false;
  userId?: number;
  loading = false;
  saving = false;
  
  selectedFile: File | null = null;
  photoPreview: string | null = null;

  rolesOptions = [
    { value: RoleName.ADMINISTRADOR, label: 'Administrador' },
    { value: RoleName.GESTOR_LICITACIONES, label: 'Gestor de Licitaciones' },
    { value: RoleName.AREA_SOLICITANTE, label: 'Área Solicitante' },
    { value: RoleName.EVALUADOR, label: 'Evaluador' },
    { value: RoleName.PROVEEDOR, label: 'Proveedor' },
    { value: RoleName.AUDITOR, label: 'Auditor' },
    { value: RoleName.AUTORIDAD, label: 'Autoridad' }
  ];

  areas: any[] = [];

  constructor(
    private fb: FormBuilder,
    private usuarioService: UsuarioService,
    private areaService: AreaService,
    private tokenService: TokenService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.usuarioForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      password: ['', Validators.required],
      confirmPassword: ['', Validators.required],
      roles: [[RoleName.PROVEEDOR], [Validators.required, Validators.minLength(1)]],
      enabled: [true],
      requiereCambioPassword: [false],
      areaId: [null]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    if (this.tokenService.isAutoridad() && !this.tokenService.hasAnyRole('ROLE_ADMINISTRADOR', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN')) {
      this.rolesOptions = this.rolesOptions.filter(o => o.value !== RoleName.ADMINISTRADOR);
    }
    const id = this.route.snapshot.paramMap.get('id');
    this.loadAreas();
    if (id) {
      this.isEdit = true;
      this.userId = Number(id);
      this.loadUser();
      // Password not required in edit
      this.usuarioForm.get('password')?.clearValidators();
      this.usuarioForm.get('confirmPassword')?.clearValidators();
      this.usuarioForm.updateValueAndValidity();
    }
  }

  loadAreas(): void {
    this.areaService.getAreas().subscribe({
      next: (areas) => this.areas = areas,
      error: (err) => console.error('Error cargando áreas:', err)
    });
  }

  passwordMatchValidator(g: FormGroup) {
    const pass = g.get('password')?.value;
    const confirm = g.get('confirmPassword')?.value;
    return pass === confirm ? null : { mismatch: true };
  }

  loadUser(): void {
    this.loading = true;
    this.usuarioService.getById(this.userId!).subscribe({
      next: (user) => {
        this.usuarioForm.patchValue({
          username: user.username,
          email: user.email,
          nombre: user.nombre,
          apellido: user.apellido,
          enabled: user.enabled,
          roles: user.roles,
          requiereCambioPassword: user.requiereCambioPassword,
          areaId: user.areaId
        });
        if (user.urlFoto) {
          this.photoPreview = this.usuarioService.getFileUrl(user.urlFoto);
        }
        this.loading = false;
      },
      error: (err) => {
        Swal.fire('Error', 'No se pudo cargar la información del usuario.', 'error');
        this.router.navigate(['/usuarios']);
      }
    });
  }

  onRoleChange(role: string, checked: boolean): void {
    const currentRoles = this.usuarioForm.get('roles')?.value as string[];
    if (checked) {
      this.usuarioForm.patchValue({ roles: [...currentRoles, role] });
    } else {
      this.usuarioForm.patchValue({ roles: currentRoles.filter(r => r !== role) });
    }
  }

  isRoleSelected(role: string): boolean {
    return this.usuarioForm.get('roles')?.value.includes(role);
  }

  onPhotoSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.photoPreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  getInitials(): string {
    const nombre = this.usuarioForm.get('nombre')?.value || '';
    const apellido = this.usuarioForm.get('apellido')?.value || '';
    return (nombre.charAt(0) + (apellido ? apellido.charAt(0) : '')).toUpperCase();
  }

  private handlePhotoUpload(userId: number): void {
    if (this.selectedFile) {
      this.usuarioService.uploadPhoto(userId, this.selectedFile).subscribe({
        next: () => console.log('Foto subida con éxito'),
        error: (err) => console.error('Error subiendo foto:', err)
      });
    }
  }

  async onSubmit(): Promise<void> {
    if (this.usuarioForm.invalid) {
      this.usuarioForm.markAllAsTouched();
      return;
    }

    const formValue = this.usuarioForm.value;
    const userData = {
      ...formValue,
      area: formValue.areaId ? { id: formValue.areaId } : null
    };

    if (this.isEdit) {
      const { value: adminPassword } = await Swal.fire({
        title: 'Autorización Requerida',
        text: 'Ingrese su contraseña de administrador para guardar los cambios:',
        input: 'password',
        inputPlaceholder: 'Contraseña maestra',
        showCancelButton: true,
        confirmButtonText: 'Autorizar y Guardar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#0f172a',
        inputValidator: (value) => {
          if (!value) return 'Se requiere la contraseña para autorizar';
          return null;
        }
      });

      if (adminPassword) {
        this.saving = true;
        Swal.fire({ title: 'Guardando cambios...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        this.usuarioService.update(this.userId!, userData, adminPassword).subscribe({
          next: (res) => {
            this.handlePhotoUpload(this.userId!);
            Swal.fire({ icon: 'success', title: 'Usuario actualizado', timer: 1500, showConfirmButton: false });
            this.router.navigate(['/usuarios']);
          },
          error: (err) => {
            console.error(err);
            Swal.fire('Error de Autorización', err.error?.message || 'No se pudo autorizar el cambio o los datos son inválidos.', 'error');
            this.saving = false;
          }
        });
      }
    } else {
      this.saving = true;
      Swal.fire({ title: 'Creando usuario...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      this.usuarioService.create(userData).subscribe({
        next: (created) => {
          if (created.id) this.handlePhotoUpload(created.id);
          Swal.fire({ icon: 'success', title: 'Usuario creado exitosamente', timer: 1500, showConfirmButton: false });
          this.router.navigate(['/usuarios']);
        },
        error: (err) => {
          Swal.fire('Error', err.error?.message || 'No se pudo crear el usuario.', 'error');
          this.saving = false;
        }
      });
    }
  }
}
