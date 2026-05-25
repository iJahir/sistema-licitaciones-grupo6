import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_CONFIG } from '../config/api-config';

@Injectable({
  providedIn: 'root'
})
export class PropuestaService {
  private apiUrl = `${API_CONFIG.baseUrl}propuestas`;

  constructor(private http: HttpClient) { }

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  getAsignadas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/asignadas`);
  }

  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  getMyPropuestas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/mis-propuestas`);
  }

  getByLicitacion(licitacionId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/licitacion/${licitacionId}`);
  }

  getMiPropuesta(licitacionId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/licitacion/${licitacionId}/mia`);
  }

  createWithFiles(propuesta: any, files: File[]): Observable<any> {
    const formData: FormData = new FormData();
    formData.append('propuesta', JSON.stringify(propuesta));
    if (files && files.length > 0) {
      files.forEach(file => formData.append('files', file));
    }
    return this.http.post<any>(this.apiUrl, formData);
  }

  updateWithFiles(id: number, propuesta: any, files: File[]): Observable<any> {
    const formData: FormData = new FormData();
    formData.append('propuesta', JSON.stringify(propuesta));
    if (files && files.length > 0) {
      files.forEach(file => formData.append('files', file));
    }
    return this.http.put<any>(`${this.apiUrl}/${id}`, formData);
  }

  getHistorial(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${id}/historial`);
  }

  validar(id: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}/validar`, {});
  }

  rechazar(id: number, motivo: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}/rechazar`, { motivo });
  }

  marcarIncompleta(id: number, motivo: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}/incompleta`, { motivo });
  }

  getEvaluadoresDisponibles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/evaluadores/disponibles`);
  }

  getSugerenciasEvaluadores(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${id}/sugerir-evaluadores`);
  }

  guardarAsignacionEvaluadores(id: number, payload: any[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/evaluadores`, payload);
  }
}
