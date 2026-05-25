import { Injectable } from '@angular/core';

const TOKEN_KEY = 'auth-token';
const USER_KEY = 'auth-user';

@Injectable({
  providedIn: 'root'
})
export class TokenService {

  constructor() { }

  signOut(): void {
    window.localStorage.clear();
  }

  public saveToken(token: string): void {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.setItem(TOKEN_KEY, token);
  }

  public getToken(): string | null {
    return window.localStorage.getItem(TOKEN_KEY);
  }

  public saveUser(user: any): void {
    window.localStorage.removeItem(USER_KEY);
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  public getUser(): any {
    const user = window.localStorage.getItem(USER_KEY);
    if (user) {
      try {
        const parsed = JSON.parse(user);
        let roles = Array.isArray(parsed.roles) ? parsed.roles : (parsed.role ? [parsed.role] : []);
        
        // Normalizar los roles administrativos para asegurar equivalencia completa entre legacy y nuevos roles
        const hasAdmin = roles.some((r: any) => {
          const rStr = String(typeof r === 'string' ? r : (r.name || r.authority || '')).toUpperCase();
          return rStr === 'ROLE_ADMIN' || rStr === 'ADMIN' || rStr === 'ROLE_ADMINISTRADOR' || rStr === 'ADMINISTRADOR';
        });
        
        if (hasAdmin) {
          const uniqueRoles = new Set(roles.map((r: any) => typeof r === 'string' ? r : (r.name || r.authority || '')));
          uniqueRoles.add('ROLE_ADMIN');
          uniqueRoles.add('ADMIN');
          uniqueRoles.add('ROLE_ADMINISTRADOR');
          uniqueRoles.add('ADMINISTRADOR');
          roles = Array.from(uniqueRoles);
        }

        return {
          id: parsed.id || null,
          username: parsed.username || '',
          nombre: parsed.nombre || '',
          apellido: parsed.apellido || '',
          email: parsed.email || '',
          urlFoto: parsed.urlFoto || null,
          roles: roles,
          empresaNombre: parsed.empresaNombre || '',
          ruc: parsed.ruc || '',
          token: parsed.token || this.getToken()
        };
      } catch (e) {
        console.error('Error al parsear usuario desde localStorage', e);
      }
    }
    return null; // Retornar null es más seguro para checkeos de existencia
  }

  public isAuthenticated(): boolean {
    return !!this.getToken() && !!this.getUser();
  }

  public hasAnyRole(...roleNames: string[]): boolean {
    const user = this.getUser();
    if (!user || !user.roles) return false;
    return user.roles.some((r: any) => {
      const rName = (typeof r === 'string' ? r : (r.name || r.authority || '')).toUpperCase();
      return roleNames.some(name => {
        const expected = name.toUpperCase();
        return rName === expected || rName.includes(expected) || expected.includes(rName);
      });
    });
  }

  public isAdmin(): boolean {
    return this.hasAnyRole('ADMINISTRADOR', 'ADMIN', 'AUDITOR', 'SUPER_ADMIN', 'GESTOR_LICITACIONES');
  }

  public isArea(): boolean {
    return this.hasAnyRole('AREA_SOLICITANTE') && !this.isAdmin();
  }

  public isProveedor(): boolean {
    return this.hasAnyRole('PROVEEDOR') && !this.isAdmin();
  }

  public isEvaluador(): boolean {
    return this.hasAnyRole('EVALUADOR') && !this.isAdmin();
  }

  public isObservador(): boolean {
    return this.hasAnyRole('OBSERVADOR') && !this.isAdmin();
  }

  public isAutoridad(): boolean {
    return this.hasAnyRole('AUTORIDAD') && !this.isAdmin();
  }

  public isGestor(): boolean {
    return this.hasAnyRole('GESTOR_LICITACIONES');
  }
}
