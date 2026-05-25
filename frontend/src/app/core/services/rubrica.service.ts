import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Rubrica } from '../../data/models/rubrica.model';

import { API_CONFIG } from '../config/api-config';

@Injectable({
  providedIn: 'root'
})
export class RubricaService {
  private apiUrl = `${API_CONFIG.baseUrl}rubricas`;

  constructor(private http: HttpClient) { }

  getByLicitacion(licitacionId: number): Observable<Rubrica> {
    return this.http.get<Rubrica>(`${this.apiUrl}/licitacion/${licitacionId}`);
  }

  create(rubrica: Rubrica): Observable<Rubrica> {
    return this.http.post<Rubrica>(this.apiUrl, rubrica);
  }

  downloadCriteriosPdf(licitacionId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/licitacion/${licitacionId}/pdf`, { responseType: 'blob' });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
