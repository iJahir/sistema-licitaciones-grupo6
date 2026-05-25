import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Licitacion } from '../../data/models/licitacion.model';

import { API_CONFIG } from '../config/api-config';

@Injectable({
  providedIn: 'root'
})
export class LicitacionService {
  private apiUrl = `${API_CONFIG.baseUrl}licitaciones`;

  constructor(private http: HttpClient) { }

  getAll(params: any = {}): Observable<any> {
    let queryParams = {};
    if (params) {
      queryParams = {
        search: params.search || '',
        estado: params.estado || '',
        area: params.area || '',
        page: params.page || 0,
        size: params.size || 10
      };
    }
    return this.http.get<any>(this.apiUrl, { params: queryParams });
  }

  getById(id: number): Observable<Licitacion> {
    return this.http.get<Licitacion>(`${this.apiUrl}/${id}`);
  }

  create(licitacion: Licitacion): Observable<Licitacion> {
    return this.http.post<Licitacion>(this.apiUrl, licitacion);
  }

  createWithFiles(licitacion: Licitacion, files: File[]): Observable<Licitacion> {
    const formData = new FormData();
    formData.append('licitacion', JSON.stringify(licitacion));
    files.forEach(file => {
      formData.append('files', file, file.name);
    });
    return this.http.post<Licitacion>(this.apiUrl, formData);
  }

  update(id: number, licitacion: Licitacion): Observable<Licitacion> {
    return this.http.put<Licitacion>(`${this.apiUrl}/${id}`, licitacion);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  cancel(id: number, motivo: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/cancelar`, { motivo });
  }

  getHitos(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${id}/hitos`);
  }

  getHistorial(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${id}/historial`);
  }

  cambiarEstado(id: number, estado: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/estado`, { estado });
  }

  getRanking(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${id}/ranking`);
  }

  aprobarResultados(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/aprobar-resultados`, {});
  }

  adjudicar(id: number, propuestaId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/adjudicar/${propuestaId}`, {});
  }

  rechazarAdjudicacion(id: number, propuestaId: number, motivo: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/rechazar-adjudicacion/${propuestaId}?motivo=${encodeURIComponent(motivo)}`, {});
  }

  getParticipantes(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${id}/participantes`);
  }

  inscribirParticipante(id: number): Observable<any> {
    return this.http.post(`${API_CONFIG.baseUrl}participantes/inscribir/${id}`, {});
  }

  validarParticipante(id: number, validado: boolean, observaciones: string): Observable<any> {
    return this.http.put(`${API_CONFIG.baseUrl}participantes/${id}/validar`, { validado, observaciones });
  }
}
