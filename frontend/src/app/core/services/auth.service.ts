import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_CONFIG } from '../config/api-config';

const AUTH_API = API_CONFIG.authEndpoint;

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private http: HttpClient) { }

  login(credentials: any): Observable<any> {
    return this.http.post(AUTH_API + 'login', {
      username: credentials.username,
      password: credentials.password
    }, httpOptions);
  }

  register(user: any): Observable<any> {
    return this.http.post(AUTH_API + 'signup', {
      username: user.username,
      email: user.email,
      password: user.password,
      nombre: user.nombre,
      apellido: user.apellido,
      empresaNombre: user.empresaNombre,
      ruc: user.ruc,
      telefono: user.telefono,
      categoria: user.categoria,
      pais: user.pais,
      observaciones: user.observaciones
    }, httpOptions);
  }

  refreshToken(): Observable<any> {
    return this.http.post(AUTH_API + 'refresh', {}, httpOptions);
  }
}
