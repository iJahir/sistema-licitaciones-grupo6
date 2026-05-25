import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';
import { API_CONFIG } from '../../core/config/api-config';

interface HistorialRecord {
  id: number;
  fecha: any;
  usuarioNombre: string;
  usuarioRol: string;
  usuarioAvatar: string;
  accion: string; // Creación, Actualización, Eliminación, Aprobación, Autenticación, Intento de Acceso, Descarga, Configuración, Copia de Seguridad
  modulo: string;
  moduloIcon: string;
  detalle: string;
  resultado: string; // Éxito, Fallido
  ipOrigen: string;
  tipo: string; // Sistema, Usuario, Seguridad
}

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './historial.component.html',
  styleUrls: ['./historial.component.scss']
})
export class HistorialComponent implements OnInit {
  // Stats
  totalRegistros = 0;
  usuariosConActividad = 0;
  modulosUtilizados = 0;
  datosModificados = 0;
  accionesRecientes = 0;

  // Pagination
  currentPage = 1;
  pageSize = 10;

  // Filters
  searchTerm = '';
  selectedUsuario = '';
  selectedModulo = '';
  selectedAccion = '';
  selectedResultado = '';
  selectedFecha = '';
  selectedTipoRegistro = '';
  ipOrigen = '';

  // Data
  historialList: HistorialRecord[] = [];

  // Chart data
  roleStats = [
    { name: 'Licitaciones', count: 0, percentage: 0, color: '#2563eb', dashArray: '0 238.76', dashOffset: 0 },
    { name: 'Propuestas', count: 0, percentage: 0, color: '#10b981', dashArray: '0 238.76', dashOffset: 0 },
    { name: 'Evaluaciones', count: 0, percentage: 0, color: '#f59e0b', dashArray: '0 238.76', dashOffset: 0 },
    { name: 'Documentos', count: 0, percentage: 0, color: '#8b5cf6', dashArray: '0 238.76', dashOffset: 0 },
    { name: 'Usuarios', count: 0, percentage: 0, color: '#ef4444', dashArray: '0 238.76', dashOffset: 0 },
    { name: 'Otros', count: 0, percentage: 0, color: '#64748b', dashArray: '0 238.76', dashOffset: 0 }
  ];

  recentActivity: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadHistorial();
  }

  loadHistorial() {
    this.http.get<HistorialRecord[]>(`${API_CONFIG.baseUrl}historial`).subscribe({
      next: (data) => {
        this.historialList = data || [];
        this.calculateStats();
      },
      error: (err) => {
        console.error('Error cargando historial', err);
      }
    });
  }

  calculateStats() {
    const total = this.historialList.length;
    this.totalRegistros = total;

    // Calculate unique users
    const uniqueUsers = new Set(this.historialList.map(r => r.usuarioNombre).filter(Boolean));
    this.usuariosConActividad = uniqueUsers.size;

    // Calculate unique modules
    const uniqueModules = new Set(this.historialList.map(r => r.modulo).filter(Boolean));
    this.modulosUtilizados = uniqueModules.size;

    // Stats calculations
    this.datosModificados = this.historialList.filter(r => r.accion === 'Creación' || r.accion === 'Actualización').length;
    this.accionesRecientes = this.historialList.filter(r => {
      if (!r.fecha) return false;
      const d = new Date(r.fecha);
      const diff = new Date().getTime() - d.getTime();
      return diff < 24 * 60 * 60 * 1000; // Last 24 hours
    }).length;

    // Calculate dynamic role stats for the donut chart
    const moduleCounts: { [key: string]: number } = {};
    this.historialList.forEach(r => {
      const mod = r.modulo || 'Otros';
      moduleCounts[mod] = (moduleCounts[mod] || 0) + 1;
    });

    const categories = ['Licitaciones', 'Propuestas', 'Evaluaciones', 'Documentos', 'Usuarios'];
    let accumulatedOffset = 0;
    
    this.roleStats = categories.map((cat, index) => {
      const count = moduleCounts[cat] || 0;
      const pct = total > 0 ? (count / total) * 100 : 0;
      const strokeVal = (pct / 100) * 238.76;
      const offset = accumulatedOffset;
      accumulatedOffset -= strokeVal;
      
      const colors = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
      return {
        name: cat,
        count: count,
        percentage: parseFloat(pct.toFixed(1)),
        color: colors[index],
        dashArray: `${strokeVal} 238.76`,
        dashOffset: offset
      };
    });

    // Add others
    const categorizedCount = categories.reduce((sum, cat) => sum + (moduleCounts[cat] || 0), 0);
    const othersCount = total - categorizedCount;
    const othersPct = total > 0 ? (othersCount / total) * 100 : 0;
    const strokeVal = (othersPct / 100) * 238.76;
    this.roleStats.push({
      name: 'Otros',
      count: othersCount,
      percentage: parseFloat(othersPct.toFixed(1)),
      color: '#64748b',
      dashArray: `${strokeVal} 238.76`,
      dashOffset: accumulatedOffset
    });

    // Build recent activities timeline
    this.recentActivity = this.historialList.slice(0, 5).map(r => {
      let icon = 'fa-info-circle';
      let color = '#2563eb';
      let type = 'info';

      const acc = (r.accion || '').toLowerCase();
      if (acc.includes('crea')) {
        icon = 'fa-file-contract';
        color = '#2563eb';
        type = 'info';
      } else if (acc.includes('actua') || acc.includes('modi')) {
        icon = 'fa-pen-to-square';
        color = '#3b82f6';
        type = 'info';
      } else if (acc.includes('aprob') || acc.includes('exito') || r.resultado === 'Éxito') {
        icon = 'fa-check';
        color = '#10b981';
        type = 'success';
      } else if (r.resultado === 'Fallido') {
        icon = 'fa-shield-halved';
        color = '#ef4444';
        type = 'danger';
      }

      return {
        titulo: r.accion || 'Actividad',
        detalle: r.detalle || '',
        tiempo: this.getRelativeTime(r.fecha),
        icon,
        color,
        type
      };
    });
  }

  getRelativeTime(fechaStr: any): string {
    if (!fechaStr) return 'Hace momentos';
    const date = new Date(fechaStr);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Hace momentos';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours} horas`;
    const days = Math.floor(hours / 24);
    return `Hace ${days} días`;
  }

  get filteredHistorialList(): HistorialRecord[] {
    let list = [...this.historialList];
    
    // Apply search term
    if (this.searchTerm) {
      const q = this.searchTerm.toLowerCase().trim();
      list = list.filter(r => 
        (r.usuarioNombre && r.usuarioNombre.toLowerCase().includes(q)) ||
        (r.accion && r.accion.toLowerCase().includes(q)) ||
        (r.modulo && r.modulo.toLowerCase().includes(q)) ||
        (r.detalle && r.detalle.toLowerCase().includes(q))
      );
    }
    
    // Apply selectedUsuario role filter
    if (this.selectedUsuario) {
      list = list.filter(r => r.usuarioRol && r.usuarioRol.toLowerCase().includes(this.selectedUsuario.toLowerCase()));
    }
    
    // Apply selectedModulo
    if (this.selectedModulo) {
      list = list.filter(r => r.modulo && r.modulo.toLowerCase() === this.selectedModulo.toLowerCase());
    }
    
    // Apply selectedAccion
    if (this.selectedAccion) {
      list = list.filter(r => r.accion && r.accion.toLowerCase() === this.selectedAccion.toLowerCase());
    }
    
    // Apply selectedResultado
    if (this.selectedResultado) {
      const expectedRes = this.selectedResultado === 'Exito' ? 'Éxito' : this.selectedResultado;
      list = list.filter(r => r.resultado && r.resultado.toLowerCase() === expectedRes.toLowerCase());
    }

    // Apply selectedTipoRegistro
    if (this.selectedTipoRegistro) {
      list = list.filter(r => r.tipo && r.tipo.toLowerCase() === this.selectedTipoRegistro.toLowerCase());
    }

    // Apply ipOrigen
    if (this.ipOrigen) {
      list = list.filter(r => r.ipOrigen && r.ipOrigen.toLowerCase().includes(this.ipOrigen.toLowerCase().trim()));
    }

    return list;
  }

  get pagedHistorialList(): HistorialRecord[] {
    const list = this.filteredHistorialList;
    const start = (this.currentPage - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }

  get totalElementsCount(): number {
    return this.filteredHistorialList.length;
  }

  get totalPagesCount(): number {
    return Math.ceil(this.totalElementsCount / this.pageSize) || 1;
  }

  get pages(): number[] {
    const total = this.totalPagesCount;
    const current = this.currentPage;
    const pagesList: number[] = [];
    
    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + 4);
    
    if (end - start < 4) {
      start = Math.max(1, end - 4);
    }
    
    for (let i = start; i <= end; i++) {
      pagesList.push(i);
    }
    return pagesList;
  }

  onSearch() {
    this.currentPage = 1;
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedUsuario = '';
    this.selectedModulo = '';
    this.selectedAccion = '';
    this.selectedResultado = '';
    this.selectedFecha = '';
    this.selectedTipoRegistro = '';
    this.ipOrigen = '';
    this.onSearch();
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPagesCount) {
      this.currentPage = page;
    }
  }

  getMin(a: number, b: number): number {
    return Math.min(a, b);
  }

  verDetalle(record: HistorialRecord) {
    Swal.fire({
      title: `<h3 style="color:#0f172a;font-weight:800;margin:0;">Detalle de Registro Histórico</h3>`,
      html: `
        <div style="text-align:left; font-family:'Inter',sans-serif; font-size:0.9rem; color:#334155; line-height:1.6; padding-top:1rem;">
          <div style="display:flex; gap:1rem; align-items:center; background:#f8fafc; padding:1rem; border-radius:12px; border:1px solid #e2e8f0; margin-bottom:1.25rem;">
            <div style="width:48px; height:48px; border-radius:50%; background:#e2e8f0; color:#475569; font-size:1.2rem; font-weight:800; display:flex; align-items:center; justify-content:center;">
              ${record.usuarioAvatar || 'US'}
            </div>
            <div>
              <h4 style="margin:0; font-size:1rem; font-weight:800; color:#0f172a;">${record.usuarioNombre || 'Sistema'}</h4>
              <p style="margin:0; font-size:0.8rem; font-weight:600; color:#64748b;">${record.usuarioRol || 'Usuario'}</p>
            </div>
          </div>
          
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.75rem; margin-bottom:1rem;">
            <div style="background:#f1f5f9; padding:0.6rem 0.8rem; border-radius:8px;">
              <span style="font-size:0.7rem; font-weight:800; color:#64748b; text-transform:uppercase; display:block; margin-bottom:2px;">Módulo</span>
              <span style="font-weight:700; color:#334155; font-size:0.85rem;">
                <i class="fa-solid ${record.moduloIcon || 'fa-info-circle'}" style="color:#64748b; margin-right:4px;"></i> ${record.modulo}
              </span>
            </div>
            <div style="background:#f1f5f9; padding:0.6rem 0.8rem; border-radius:8px;">
              <span style="font-size:0.7rem; font-weight:800; color:#64748b; text-transform:uppercase; display:block; margin-bottom:2px;">Acción</span>
              <span style="font-weight:700; color:#334155; font-size:0.85rem;">${record.accion}</span>
            </div>
          </div>

          <div style="background:#f8fafc; padding:0.85rem; border-radius:10px; border:1px solid #e2e8f0; display:flex; flex-direction:column; gap:0.5rem;">
            <p style="margin:0; font-size:0.82rem;"><strong>Fecha y Hora:</strong> <span style="font-weight:600;color:#0f172a;">${new Date(record.fecha).toLocaleString()}</span></p>
            <p style="margin:0; font-size:0.82rem;"><strong>IP Origen:</strong> <span style="font-weight:600;color:#0f172a;">${record.ipOrigen || '-'}</span></p>
            <p style="margin:0; font-size:0.82rem;"><strong>Resultado:</strong> 
              <span style="font-weight:700; color:${record.resultado === 'Éxito' ? '#10b981' : '#ef4444'};">
                ${record.resultado}
              </span>
            </p>
            <div style="margin-top:0.5rem; padding-top:0.5rem; border-top:1px solid #e2e8f0;">
               <strong style="display:block; margin-bottom:4px; font-size:0.82rem;">Detalle Técnico:</strong>
               <p style="margin:0; font-family:monospace; background:#1e293b; color:#10b981; padding:0.75rem; border-radius:6px; font-size:0.75rem;">
                 > ${record.detalle}<br>
                 > STATUS: ${record.resultado === 'Éxito' ? '200 OK' : '403 FORBIDDEN'}<br>
                 > TIPO: ${record.tipo ? record.tipo.toUpperCase() : 'SISTEMA'}
               </p>
            </div>
          </div>
        </div>
      `,
      confirmButtonText: 'Cerrar Detalles',
      confirmButtonColor: '#2563eb'
    });
  }
}
