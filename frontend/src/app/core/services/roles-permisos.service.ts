import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api-config';

@Injectable({
  providedIn: 'root'
})
export class RolesPermisosService {
  private apiUrl = `${API_CONFIG.baseUrl}roles-permisos`;

  constructor(private http: HttpClient) { }

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  getStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats`);
  }

  create(role: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, role);
  }

  update(id: number, role: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, role);
  }

  cloneRole(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/clonar`, {});
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
