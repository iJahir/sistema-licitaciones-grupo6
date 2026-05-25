import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Usuario } from '../../data/models/usuario.model';

import { API_CONFIG } from '../config/api-config';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private apiUrl = `${API_CONFIG.baseUrl}usuarios`;

  constructor(private http: HttpClient) { }

  getAll(term: string = '', page: number = 0, size: number = 10): Observable<any> {
    const params = new HttpParams()
      .set('term', term)
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<any>(this.apiUrl, { params });
  }

  getEvaluadores(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.apiUrl}/evaluadores`);
  }

  getById(id: number): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.apiUrl}/${id}`);
  }

  create(user: Usuario): Observable<Usuario> {
    const params = new HttpParams().set('roles', user.roles.join(','));
    return this.http.post<Usuario>(this.apiUrl, user, { params });
  }

  update(id: number, user: Usuario, adminPassword: string): Observable<Usuario> {
    const params = new HttpParams()
      .set('roles', user.roles.join(','))
      .set('adminPassword', adminPassword);
    return this.http.put<Usuario>(`${this.apiUrl}/${id}`, user, { params });
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  toggleStatus(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/estado`, {});
  }

  resetPassword(id: number, request: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/reset-password`, request);
  }

  uploadPhoto(id: number, file: File): Observable<Usuario> {
    const formData = new FormData();
    formData.append('foto', file);
    return this.http.post<Usuario>(`${this.apiUrl}/${id}/foto`, formData);
  }

  getFileUrl(path: string | null): string | null {
    if (!path) return null;
    
    // Extraer base URL (remover /api/ al final si existe para archivos)
    const hostBase = API_CONFIG.baseUrl.replace(/\/api\/$/, '');

    // Si ya empieza con http o /api/files, no lo repetimos
    if (path.startsWith('http') || path.startsWith('/api/files')) {
       // Si es un path relativo con /api/files, le ponemos el host
       if (path.startsWith('/api/files')) {
         return `${hostBase}${path}`;
       }
       return path;
    }
    return `${hostBase}/api/files/${path}`;
  }
}
