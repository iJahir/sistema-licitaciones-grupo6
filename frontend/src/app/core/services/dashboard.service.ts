import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { LicitacionService } from './licitacion.service';

import { API_CONFIG } from '../config/api-config';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  constructor(
    private http: HttpClient,
    private licitacionService: LicitacionService
  ) { }

  getDashboardData(): Observable<any> {
    return this.http.get<any>(`${API_CONFIG.baseUrl}dashboard/summary`);
  }

  private isClosingSoon(date?: Date | string): boolean {
    if (!date) return false;
    const closure = new Date(date);
    const now = new Date();
    const diff = closure.getTime() - now.getTime();
    const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
    return diff > 0 && diff < threeDaysInMs;
  }
}
