import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Auditoria } from '../../data/models/auditoria.model';

import { API_CONFIG } from '../config/api-config';

@Injectable({
  providedIn: 'root'
})
export class AuditoriaService {
  private apiUrl = `${API_CONFIG.baseUrl}auditoria`;

  constructor(private http: HttpClient) {}

  getAuditorias(filters: any, page: number = 0, size: number = 10): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        params = params.set(key, filters[key]);
      }
    });

    return this.http.get<any>(this.apiUrl, { params });
  }

  exportExcel(filters: any): void {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        params = params.set(key, filters[key]);
      }
    });

    this.http.get(`${this.apiUrl}/export/excel`, { params, responseType: 'blob' })
      .subscribe(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `auditoria_${new Date().getTime()}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
      });
  }

  exportPdf(filters: any): void {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        params = params.set(key, filters[key]);
      }
    });

    this.http.get(`${this.apiUrl}/export/pdf`, { params, responseType: 'blob' })
      .subscribe(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `auditoria_${new Date().getTime()}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      });
  }
}
