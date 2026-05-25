import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_CONFIG } from '../config/api-config';

@Injectable({
  providedIn: 'root'
})
export class ContratoService {
  private apiUrl = `${API_CONFIG.baseUrl}contratos`;

  constructor(private http: HttpClient) { }

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  getByLicitacionId(licitacionId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/licitacion/${licitacionId}`);
  }

  crear(licitacionId: number, contrato: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/licitacion/${licitacionId}`, contrato);
  }

  firmarProveedor(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/firmar-proveedor`, {});
  }

  firmarAutoridad(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/firmar-autoridad`, {});
  }

  validarArea(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/validar-area`, {});
  }

  descargarPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/pdf`, { responseType: 'blob' });
  }
}
