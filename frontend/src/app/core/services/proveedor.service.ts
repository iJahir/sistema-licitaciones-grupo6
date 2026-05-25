import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api-config';

export interface Proveedor {
  id?: number;
  razonSocial: string;
  nit: string;
  representanteLegal: string;
  correo: string;
  telefono: string;
  categoria: string;
  estado: string;
  fechaRegistro?: string;
  ultimaParticipacion?: string;
  avatarColor?: string;
  clasificacion?: string;
  pais?: string;
  observaciones?: string;
  totalParticipaciones?: number;
  contratosAdjudicados?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProveedorService {
  private apiUrl = `${API_CONFIG.baseUrl}proveedores`;

  constructor(private http: HttpClient) { }

  getAll(term: string = '', estado: string = '', categoria: string = '', page: number = 0, size: number = 10): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (term) params = params.set('term', term);
    if (estado) params = params.set('estado', estado);
    if (categoria) params = params.set('categoria', categoria);

    return this.http.get<any>(this.apiUrl, { params });
  }

  getById(id: number): Observable<Proveedor> {
    return this.http.get<Proveedor>(`${this.apiUrl}/${id}`);
  }

  create(proveedor: Proveedor): Observable<Proveedor> {
    return this.http.post<Proveedor>(this.apiUrl, proveedor);
  }

  update(id: number, proveedor: Proveedor): Observable<Proveedor> {
    return this.http.put<Proveedor>(`${this.apiUrl}/${id}`, proveedor);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats`);
  }
}
