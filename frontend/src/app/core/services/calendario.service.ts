import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';

export interface CalendarioEvento {
  id?: number;
  titulo: string;
  descripcion: string;
  tipoEvento: 'LICITACION_PUBLICADA' | 'PROPUESTA_RECIBIDA' | 'EVALUACION_EN_CURSO' | 'CIERRE_LICITACION' | 'NOTA' | 'EVENTO_GENERAL' | 'MANTENIMIENTO_SISTEMA' | 'REUNION_EVALUACION';
  fechaEvento: string | Date;
  referenciaId?: number;
  referenciaTipo?: string;
  prioridad: number;
  usuario?: any;
}

import { API_CONFIG } from '../config/api-config';

@Injectable({
  providedIn: 'root'
})
export class CalendarioService {
  private apiUrl = `${API_CONFIG.baseUrl}calendario`;
  
  // Refresh Signal
  private refreshSignal = new BehaviorSubject<boolean>(false);
  refresh$ = this.refreshSignal.asObservable();

  constructor(private http: HttpClient) { }

  notifyUpdate(): void {
    this.refreshSignal.next(true);
  }

  getEvents(start?: string, end?: string): Observable<CalendarioEvento[]> {
    let params = {};
    if (start && end) {
      params = { start, end };
    }
    return this.http.get<CalendarioEvento[]>(this.apiUrl, { params });
  }

  getEventsByDay(date: string): Observable<CalendarioEvento[]> {
    return this.http.get<CalendarioEvento[]>(`${this.apiUrl}/dia/${date}`);
  }

  save(evento: CalendarioEvento): Observable<CalendarioEvento> {
    return this.http.post<CalendarioEvento>(this.apiUrl, evento);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
