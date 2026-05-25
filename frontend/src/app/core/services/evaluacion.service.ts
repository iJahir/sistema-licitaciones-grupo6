import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Evaluacion } from '../../data/models/evaluacion.model';
import { Propuesta } from '../../data/models/propuesta.model';

import { API_CONFIG } from '../config/api-config';

@Injectable({
  providedIn: 'root'
})
export class EvaluacionService {
  private apiUrl = `${API_CONFIG.baseUrl}evaluaciones`;

  constructor(private http: HttpClient) { }

  getMisEvaluaciones(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/mis-evaluaciones`);
  }

  getMisAsignaciones(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/mis-asignaciones`);
  }

  getRanking(licitacionId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/ranking/${licitacionId}`);
  }

  // Búsqueda de evaluaciones para resultados/ranking
  getByLicitacion(licitacionId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/licitacion/${licitacionId}`);
  }

  // Compatibilidad con evaluación técnica de bases
  create(evaluacion: any): Observable<Evaluacion> {
    return this.http.post<Evaluacion>(this.apiUrl, evaluacion);
  }

  getPropuestasByLicitacion(licitacionId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${licitacionId}/propuestas`);
  }

  adjudicar(licitacionId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${licitacionId}/adjudicar`, {});
  }

  saveEvaluacion(propuestaId: number, evaluacion: Evaluacion, file?: File): Observable<Evaluacion> {
    const formData = new FormData();
    formData.append('evaluacion', JSON.stringify(evaluacion));
    if (file) {
      formData.append('file', file);
    }
    return this.http.post<Evaluacion>(`${this.apiUrl}/propuesta/${propuestaId}`, formData);
  }

  getMiEvaluacionPropuesta(propuestaId: number, usuarioId: number): Observable<Evaluacion> {
    return this.http.get<Evaluacion>(`${this.apiUrl}/propuesta/${propuestaId}/usuario/${usuarioId}`);
  }

  getTodasEvaluacionesPropuesta(propuestaId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/propuesta/${propuestaId}/todas`);
  }

  downloadZip(licitacionId: number): Observable<Blob> {
    return this.http.get(`${API_CONFIG.baseUrl}licitaciones/${licitacionId}/zip`, {
      responseType: 'blob'
    });
  }

  downloadPropuestasZip(licitacionId: number): Observable<Blob> {
    return this.http.get(`${API_CONFIG.baseUrl}licitaciones/${licitacionId}/propuestas/zip`, {
      responseType: 'blob'
    });
  }

  getPropuestaInfo(propuestaId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/propuesta/${propuestaId}/info`);
  }

  downloadResumenPdf(propuestaId: number, evaluadorId?: number): Observable<Blob> {
    const url = evaluadorId 
      ? `${this.apiUrl}/propuesta/${propuestaId}/pdf/resumen?evaluadorId=${evaluadorId}`
      : `${this.apiUrl}/propuesta/${propuestaId}/pdf/resumen`;
    return this.http.get(url, {
      responseType: 'blob'
    });
  }

  downloadConstanciaPdf(propuestaId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/propuesta/${propuestaId}/pdf/constancia`, {
      responseType: 'blob'
    });
  }

  asignarEvaluador(propuestaId: number, evaluadorId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/propuesta/${propuestaId}/asignar/${evaluadorId}`, {});
  }

  desasignarEvaluador(propuestaId: number, evaluadorId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/propuesta/${propuestaId}/desasignar/${evaluadorId}`);
  }
}
