import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Noticia {
  id: number;
  titulo: string;
  contenido: string;
  tipo: 'SISTEMA' | 'PROCESO' | 'URGENTE' | 'RESULTADO';
  fecha: string | Date;
  leidoPor: any[];
  link?: string;
}

import { API_CONFIG } from '../config/api-config';

@Injectable({
  providedIn: 'root'
})
export class NoticiaService {
  private apiUrl = `${API_CONFIG.baseUrl}noticias`;

  constructor(private http: HttpClient) { }

  getRecent(limit: number = 10): Observable<Noticia[]> {
    return this.http.get<Noticia[]>(this.apiUrl, { params: { limit } });
  }

  marcarComoLeida(id: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/leer`, {});
  }

  save(noticia: Noticia): Observable<Noticia> {
    return this.http.post<Noticia>(this.apiUrl, noticia);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
