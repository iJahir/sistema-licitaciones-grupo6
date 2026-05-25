import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval, startWith, switchMap, BehaviorSubject } from 'rxjs';

import { API_CONFIG } from '../config/api-config';

const NOTIF_API = `${API_CONFIG.baseUrl}notificaciones`;

export interface Notificacion {
  id: number;
  titulo: string;
  mensaje: string;
  icono: string;
  color: string;
  fecha: string;
  leida: boolean;
  tipo: string;
  link: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private unreadCountSubject = new BehaviorSubject<number>(0);
  unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private http: HttpClient) {
    // Polling cada 30 segundos para actualización automática
    interval(30000)
      .pipe(
        startWith(0),
        switchMap(() => this.getUnreadCount())
      )
      .subscribe(count => this.unreadCountSubject.next(count));
  }

  getRecent(): Observable<Notificacion[]> {
    return this.http.get<Notificacion[]>(NOTIF_API);
  }

  getUnreadCount(): Observable<number> {
    return this.http.get<number>(`${NOTIF_API}/count`);
  }

  markAsRead(id: number): Observable<any> {
    return this.http.put(`${NOTIF_API}/${id}/leer`, {});
  }

  markAllAsRead(): Observable<any> {
    return this.http.put(`${NOTIF_API}/leer-todas`, {});
  }

  updateCount(): void {
    this.getUnreadCount().subscribe(count => this.unreadCountSubject.next(count));
  }
}
