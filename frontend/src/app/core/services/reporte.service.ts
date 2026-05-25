import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_CONFIG } from '../config/api-config';

@Injectable({
  providedIn: 'root'
})
export class ReporteService {
  private apiUrl = `${API_CONFIG.baseUrl}reportes`;

  constructor(private http: HttpClient) {}

  getReporteLicitaciones(filters: any): Observable<any> {
    let params = new HttpParams();
    if (filters.areaId) params = params.set('areaId', filters.areaId.toString());
    if (filters.estado) params = params.set('estado', filters.estado);
    if (filters.fechaInicio) params = params.set('fechaInicio', filters.fechaInicio);
    if (filters.fechaFin) params = params.set('fechaFin', filters.fechaFin);

    return this.http.get<any>(`${this.apiUrl}/licitaciones`, { params });
  }

  getReportePropuestas(filters: any): Observable<any> {
    let params = new HttpParams();
    if (filters.licitacionId) params = params.set('licitacionId', filters.licitacionId.toString());
    if (filters.estado) params = params.set('estado', filters.estado);

    return this.http.get<any>(`${this.apiUrl}/propuestas`, { params });
  }

  getReporteEvaluaciones(filters: any): Observable<any> {
    let params = new HttpParams();
    if (filters.evaluadorId) params = params.set('evaluadorId', filters.evaluadorId.toString());

    return this.http.get<any>(`${this.apiUrl}/evaluaciones`, { params });
  }

  getReporteEvaluadores(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/evaluaciones-performance`);
  }

  getReporteAuditoria(filters: any, page: number = 0, size: number = 15): Observable<any> {
    let params = new HttpParams();
    if (filters.modulo) params = params.set('modulo', filters.modulo);
    if (filters.username) params = params.set('username', filters.username);
    params = params.set('page', page.toString());
    params = params.set('size', size.toString());

    return this.http.get<any>(`${this.apiUrl}/auditoria`, { params });
  }

  getReporteContratos(filters: any): Observable<any> {
    let params = new HttpParams();
    if (filters.estado) params = params.set('estado', filters.estado);
    if (filters.fechaInicio) params = params.set('fechaInicio', filters.fechaInicio);
    if (filters.fechaFin) params = params.set('fechaFin', filters.fechaFin);

    return this.http.get<any>(`${this.apiUrl}/contratos`, { params });
  }

  getReporteAdjudicaciones(filters: any): Observable<any> {
    let params = new HttpParams();
    if (filters.areaId) params = params.set('areaId', filters.areaId.toString());
    if (filters.fechaInicio) params = params.set('fechaInicio', filters.fechaInicio);
    if (filters.fechaFin) params = params.set('fechaFin', filters.fechaFin);

    return this.http.get<any>(`${this.apiUrl}/adjudicaciones`, { params });
  }

  getReporteFinanciero(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/financiero`);
  }

  getDescargas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/descargas`);
  }

  exportarReporte(tipoReporte: string, formato: string, filters: any): Observable<Blob> {
    let params = new HttpParams();
    if (filters.areaId) params = params.set('areaId', filters.areaId.toString());
    if (filters.estado) params = params.set('estado', filters.estado);
    if (filters.fechaInicio) params = params.set('fechaInicio', filters.fechaInicio);
    if (filters.fechaFin) params = params.set('fechaFin', filters.fechaFin);
    if (filters.licitacionId) params = params.set('licitacionId', filters.licitacionId.toString());
    if (filters.evaluadorId) params = params.set('evaluadorId', filters.evaluadorId.toString());

    return this.http.get(`${this.apiUrl}/${tipoReporte}/exportar/${formato}`, {
      params,
      responseType: 'blob'
    });
  }
}
