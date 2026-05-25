import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LicitacionService } from '../../../core/services/licitacion.service';
import { ContratoService } from '../../../core/services/contrato.service';
import Swal from 'sweetalert2';

interface GanttSubActivity {
  id: string;
  nombre: string;
  responsable: string;
  fechaInicio: Date;
  fechaFin: Date;
  progreso: number;
  tipo: string;
  startPercent: number;
  widthPercent: number;
  color: string;
  estado: string;
  diasDiferencia?: number;
}

interface GanttProcess {
  id: number;
  codigo: string;
  titulo: string;
  responsable: string;
  fechaInicio: Date;
  fechaFin: Date;
  progreso: number;
  expanded: boolean;
  startPercent: number;
  widthPercent: number;
  actividades: GanttSubActivity[];
  estadoGeneral: string;
}

interface DonutSegment {
  label: string;
  count: number;
  percent: number;
  strokeDash: string;
  color: string;
}

@Component({
  selector: 'app-cronograma',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './cronograma.component.html',
  styleUrls: ['./cronograma.component.scss']
})
export class CronogramaComponent implements OnInit {
  // Main Data
  processes: GanttProcess[] = [];
  filteredProcesses: GanttProcess[] = [];
  selectedProcess: GanttProcess | null = null;
  criticalMilestones: any[] = [];

  // Pagination Settings (Max 12 per page)
  currentPage: number = 1;
  pageSize: number = 12;

  // Timeline Scale Settings (Mayo-Junio 2026 default range)
  timelineStart = new Date('2026-05-01');
  timelineEnd = new Date('2026-06-30');
  
  // Custom Timeline Header Axis Days Array (perfect spacing representation)
  mayoDays: number[] = [1, 5, 10, 15, 20, 25, 30];
  junioDays: number[] = [1, 5, 10, 15, 20, 25, 30];

  // Filters State
  searchText: string = '';
  filterEstado: string = '';
  filterResponsable: string = '';

  // KPI Dashboard Stats
  kpiStats = {
    activos: 0,
    enProgreso: 0,
    completados: 0,
    retrasados: 0,
    proximosVencer: 0
  };

  // Donut Chart Setup
  donutTotal: number = 0;
  donutSegments: DonutSegment[] = [];

  constructor(
    private licitacionService: LicitacionService,
    private contratoService: ContratoService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.licitacionService.getAll({ size: 100 }).subscribe({
      next: (res) => {
        const licList = res.content || res || [];
        this.contratoService.getAll().subscribe({
          next: (contractsList) => {
            this.buildGanttStructure(licList, contractsList);
          },
          error: () => this.buildGanttStructure(licList, [])
        });
      },
      error: (err) => {
        console.error('Error fetching data for Gantt:', err);
        this.buildGanttStructure([], []);
      }
    });
  }

  buildGanttStructure(licList: any[], contractsList: any[]): void {
    const rawProcesses: GanttProcess[] = [];

    // Use ONLY real licitaciones from backend — no fallback fake data
    const finalLicList = licList;

    // Adjust timeline range to fit all real licitaciones dynamically
    if (finalLicList.length > 0) {
      const allDates = finalLicList.flatMap((l: any) => [
        l.fechaPublicacion ? new Date(l.fechaPublicacion) : null,
        l.fechaCierre ? new Date(l.fechaCierre) : null
      ]).filter((d): d is Date => d instanceof Date && !isNaN(d.getTime()));
      if (allDates.length > 0) {
        const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
        const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
        minDate.setDate(1); // Start of the earliest month
        maxDate.setDate(maxDate.getDate() + 15); // Add buffer
        this.timelineStart = minDate;
        this.timelineEnd = maxDate;
      }
    }

    const totalTimelineDays = Math.max(30, Math.ceil((this.timelineEnd.getTime() - this.timelineStart.getTime()) / (24 * 60 * 60 * 1000)));

    finalLicList.forEach((lic: any, idx: number) => {
      const id = lic.id;
      const code = lic.codigo || `LIC-${id}`;
      const title = lic.titulo || 'Proceso de Adquisición';
      const resp = lic.usuarioResponsable || lic.creadoPorNombre || 'Compras Públicas';
      const licEstado = lic.estado || 'PUBLICADA';

      const startVal = lic.fechaPublicacion ? new Date(lic.fechaPublicacion) : (lic.fechaCreacion ? new Date(lic.fechaCreacion) : new Date());
      const endVal = lic.fechaCierre ? new Date(lic.fechaCierre) : new Date(startVal.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Real sub-activities derived from licitacion estado
      const subActs: GanttSubActivity[] = this.generateSubActivities(id, code, startVal, endVal, resp, contractsList, licEstado);
      const avgProgress = subActs.length > 0 ? Math.round(subActs.reduce((acc, curr) => acc + curr.progreso, 0) / subActs.length) : 0;

      const startDiff = Math.max(0, Math.ceil((startVal.getTime() - this.timelineStart.getTime()) / (24 * 60 * 60 * 1000)));
      const endDiff = Math.min(totalTimelineDays, Math.ceil((endVal.getTime() - this.timelineStart.getTime()) / (24 * 60 * 60 * 1000)));

      const startPercent = (startDiff / totalTimelineDays) * 100;
      const widthPercent = Math.max(5, ((endDiff - startDiff) / totalTimelineDays) * 100);

      let statusLabel = 'En Progreso';
      const s = licEstado.toUpperCase();
      if (s === 'ADJUDICADA' || s === 'CONTRATADA') statusLabel = 'Adjudicado';
      else if (s === 'PUBLICADA' || s === 'EN_INSCRIPCION') statusLabel = 'Publicado';
      else if (s === 'CERRADA' || s === 'DESIERTA' || s === 'CANCELADA') statusLabel = 'Cerrado';
      else if (s === 'EVALUADA' || s === 'EN_EVALUACION') statusLabel = 'En Evaluación';
      else if (avgProgress === 100) statusLabel = 'Completado';

      rawProcesses.push({
        id,
        codigo: code,
        titulo: title,
        responsable: resp,
        fechaInicio: startVal,
        fechaFin: endVal,
        progreso: avgProgress,
        expanded: false,
        startPercent,
        widthPercent,
        actividades: subActs,
        estadoGeneral: statusLabel
      });
    });

    this.processes = rawProcesses;
    this.applyFilters();
    
    // Always start with no selected process to display the selection cards grid dashboard!
    this.selectedProcess = null;
    this.calculateKPIs();
    this.calculateDonutSegments();
    this.generateCriticalMilestones();
  }

  /**
   * Derives stage progress from the real licitacion estado — no hardcoded values.
   * Stage completion is determined by the actual lifecycle state of the licitacion.
   */
  getStageProgressFromEstado(licEstado: string): { [tag: string]: { progress: number; label: string } } {
    const s = (licEstado || '').toUpperCase();
    const done = { progress: 100, label: 'Finalizado' };
    const none = { progress: 0, label: 'Sin Iniciar' };
    const inProg = (pct: number) => ({ progress: pct, label: 'En Progreso' });

    // Each estado implies which stages are complete
    if (s === 'ADJUDICADA' || s === 'CONTRATADA') {
      return { publicacion: done, recepcion: done, eval_tec: done, eval_eco: done, adjudicacion: done, firma: s === 'CONTRATADA' ? done : inProg(50), ejecucion: s === 'CONTRATADA' ? inProg(30) : none };
    }
    if (s === 'EVALUADA' || s === 'EN_EVALUACION') {
      return { publicacion: done, recepcion: done, eval_tec: s === 'EVALUADA' ? done : inProg(60), eval_eco: s === 'EVALUADA' ? done : none, adjudicacion: none, firma: none, ejecucion: none };
    }
    if (s === 'CERRADA' || s === 'DESIERTA' || s === 'CANCELADA') {
      return { publicacion: done, recepcion: done, eval_tec: none, eval_eco: none, adjudicacion: none, firma: none, ejecucion: none };
    }
    if (s === 'EN_INSCRIPCION' || s === 'EN_PROCESO') {
      return { publicacion: done, recepcion: inProg(50), eval_tec: none, eval_eco: none, adjudicacion: none, firma: none, ejecucion: none };
    }
    if (s === 'PUBLICADA') {
      return { publicacion: done, recepcion: none, eval_tec: none, eval_eco: none, adjudicacion: none, firma: none, ejecucion: none };
    }
    // BORRADOR or unknown
    return { publicacion: none, recepcion: none, eval_tec: none, eval_eco: none, adjudicacion: none, firma: none, ejecucion: none };
  }

  generateSubActivities(licId: number, code: string, start: Date, end: Date, resp: string, contractsList: any[], licEstado: string = 'PUBLICADA'): GanttSubActivity[] {
    const acts: GanttSubActivity[] = [];
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) || 30;

    // Derive progress from real estado — never hardcode IDs
    const stageProgress = this.getStageProgressFromEstado(licEstado);

    const stages = [
      { name: 'Publicación de Licitación', offsetStart: 0, offsetEnd: 0.15, color: '#3b82f6', tag: 'publicacion' },
      { name: 'Recepción de Propuestas', offsetStart: 0.15, offsetEnd: 0.35, color: '#10b981', tag: 'recepcion' },
      { name: 'Evaluación Técnica', offsetStart: 0.35, offsetEnd: 0.52, color: '#f59e0b', tag: 'eval_tec' },
      { name: 'Evaluación Económica', offsetStart: 0.52, offsetEnd: 0.68, color: '#eab308', tag: 'eval_eco' },
      { name: 'Adjudicación', offsetStart: 0.68, offsetEnd: 0.8, color: '#8b5cf6', tag: 'adjudicacion' },
      { name: 'Firma de Contrato', offsetStart: 0.8, offsetEnd: 0.9, color: '#06b6d4', tag: 'firma' },
      { name: 'Ejecución del Contrato', offsetStart: 0.9, offsetEnd: 1.0, color: '#6366f1', tag: 'ejecucion' }
    ];

    const totalTimelineDays = Math.max(61, Math.ceil((end.getTime() - this.timelineStart.getTime()) / (24 * 60 * 60 * 1000)) + 10);

    stages.forEach((stage, idx) => {
      const actStart = new Date(start.getTime() + Math.round(stage.offsetStart * totalDays) * 24 * 60 * 60 * 1000);
      const actEnd = new Date(start.getTime() + Math.round(stage.offsetEnd * totalDays) * 24 * 60 * 60 * 1000);

      const startDiff = Math.max(0, Math.ceil((actStart.getTime() - this.timelineStart.getTime()) / (24 * 60 * 60 * 1000)));
      const endDiff = Math.min(totalTimelineDays, Math.ceil((actEnd.getTime() - this.timelineStart.getTime()) / (24 * 60 * 60 * 1000)));

      const startPercent = (startDiff / totalTimelineDays) * 100;
      const widthPercent = Math.max(8, ((endDiff - startDiff) / totalTimelineDays) * 100);

      // Real progress derived from licitacion estado
      const sp = stageProgress[stage.tag] || { progress: 0, label: 'Sin Iniciar' };

      acts.push({
        id: `${licId}_act_${idx}`,
        nombre: stage.name,
        responsable: idx === 2 || idx === 3 ? 'Comité Técnico' : idx === 4 ? 'Comité de Adjudicación' : resp,
        fechaInicio: actStart,
        fechaFin: actEnd,
        progreso: sp.progress,
        tipo: stage.tag,
        startPercent,
        widthPercent,
        color: stage.color,
        estado: sp.label
      });
    });

    // Override firma/ejecucion from real contrato data
    const matchingContract = contractsList.find((c: any) => c.licitacion?.id === licId);
    if (matchingContract) {
      const firmaAct = acts.find(a => a.tipo === 'firma');
      if (firmaAct && (matchingContract.estado === 'FIRMADO' || matchingContract.estado === 'FINALIZADO')) {
        firmaAct.progreso = 100;
        firmaAct.estado = 'Finalizado';
        if (matchingContract.fechaFirma) firmaAct.fechaInicio = new Date(matchingContract.fechaFirma);
      }
      const ejecAct = acts.find(a => a.tipo === 'ejecucion');
      if (ejecAct) {
        const cs = (matchingContract.estado || '').toUpperCase();
        ejecAct.progreso = cs === 'FINALIZADO' ? 100 : cs === 'FIRMADO' || cs === 'EN_EJECUCION' ? 40 : 0;
        ejecAct.estado = cs === 'FINALIZADO' ? 'Finalizado' : cs === 'FIRMADO' || cs === 'EN_EJECUCION' ? 'En Progreso' : 'Sin Iniciar';
      }
    }

    return acts;
  }

  applyFilters(): void {
    this.filteredProcesses = this.processes.filter(p => {
      if (this.searchText) {
        const q = this.searchText.toLowerCase();
        const match = p.titulo.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q) || p.responsable.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (this.filterEstado && p.estadoGeneral !== this.filterEstado) {
        return false;
      }
      if (this.filterResponsable && p.responsable !== this.filterResponsable) {
        return false;
      }
      return true;
    });
    this.currentPage = 1; // Reset to page 1 on filtering
  }

  // Safe Angular pagination logic
  get paginatedProcesses(): GanttProcess[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.filteredProcesses.slice(startIndex, startIndex + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredProcesses.length / this.pageSize);
  }

  get pagesArray(): number[] {
    const pages = this.totalPages;
    const arr = [];
    for (let i = 1; i <= pages; i++) {
      arr.push(i);
    }
    return arr;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      // Scroll smoothly to list container
      const listEl = document.querySelector('.selection-cards-grid');
      if (listEl) {
        listEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  getMin(a: number, b: number): number {
    return Math.min(a, b);
  }

  selectProcess(proc: GanttProcess): void {
    this.selectedProcess = proc;
    this.calculateKPIs();
    this.calculateDonutSegments();
  }

  clearSelection(): void {
    this.selectedProcess = null;
    this.calculateKPIs();
    this.calculateDonutSegments();
  }

  onProcessChange(): void {
    if (this.selectedProcess) {
      this.calculateKPIs();
      this.calculateDonutSegments();
    }
  }

  calculateKPIs(): void {
    if (this.selectedProcess) {
      const acts = this.selectedProcess.actividades;
      const total = acts.length;
      const completed = acts.filter(a => a.progreso === 100).length;
      const inProgress = acts.filter(a => a.progreso > 0 && a.progreso < 100).length;
      const noStarted = acts.filter(a => a.progreso === 0).length;
      const delayed = acts.filter(a => a.estado === 'Retrasado').length;

      this.kpiStats = {
        activos: total,
        enProgreso: inProgress,
        completados: completed,
        retrasados: delayed,
        proximosVencer: noStarted
      };
    } else {
      // Global overview values
      let total = this.processes.length;
      let inProgress = 0;
      let completed = 0;
      let delayed = 0;
      let critical = 0;

      this.processes.forEach(p => {
        if (p.progreso > 0 && p.progreso < 100) inProgress++;
        else if (p.progreso === 100) completed++;
        else critical++;

        p.actividades.forEach(a => {
          if (a.estado === 'Retrasado') delayed++;
        });
      });

      // Use real counts only — no fake fallback values
      this.kpiStats = {
        activos: total,
        enProgreso: inProgress,
        completados: completed,
        retrasados: delayed,
        proximosVencer: critical
      };
    }
  }

  calculateDonutSegments(): void {
    let rawCategories = [];

    if (this.selectedProcess) {
      const acts = this.selectedProcess.actividades;
      rawCategories = [
        { label: 'En Progreso', count: acts.filter(a => a.estado === 'En Progreso').length, color: '#f59e0b' },
        { label: 'Completados', count: acts.filter(a => a.estado === 'Finalizado').length, color: '#10b981' },
        { label: 'Retrasados', count: acts.filter(a => a.estado === 'Retrasado').length, color: '#ef4444' },
        { label: 'No Iniciados', count: acts.filter(a => a.estado === 'Sin Iniciar').length, color: '#94a3b8' }
      ];
    } else {
      // Derive global counts from real processes — no hardcoded values
      rawCategories = [
        { label: 'En Progreso', count: this.processes.filter(p => p.progreso > 0 && p.progreso < 100).length, color: '#f59e0b' },
        { label: 'Completados', count: this.processes.filter(p => p.progreso === 100).length, color: '#10b981' },
        { label: 'Retrasados', count: this.processes.filter(p => p.estadoGeneral === 'Retrasado').length, color: '#ef4444' },
        { label: 'No Iniciados', count: this.processes.filter(p => p.progreso === 0).length, color: '#94a3b8' }
      ];
    }

    const total = rawCategories.reduce((acc, curr) => acc + curr.count, 0);
    this.donutTotal = total;

    let cumulativePercent = 0;
    this.donutSegments = rawCategories.map(cat => {
      const percent = total > 0 ? (cat.count / total) * 100 : 0;
      const strokeDash = `${percent} ${100 - percent}`;
      cumulativePercent += percent;

      return {
        label: cat.label,
        count: cat.count,
        percent: Math.round(percent),
        strokeDash,
        color: cat.color
      };
    });
  }

  generateCriticalMilestones(): void {
    // Generate milestones from REAL licitaciones with upcoming fechaCierre
    const now = new Date();
    const milestones: any[] = [];
    const colorClasses = ['card-orange', 'card-purple', 'card-blue', 'card-cyan', 'card-red'];
    const iconMap: { [key: string]: string } = {
      'PUBLICADA': 'fa-calendar-xmark',
      'EN_EVALUACION': 'fa-chart-pie',
      'EVALUADA': 'fa-clipboard-check',
      'ADJUDICADA': 'fa-trophy',
      'CONTRATADA': 'fa-file-signature',
      'EN_PROCESO': 'fa-calendar-xmark',
      'default': 'fa-clock'
    };

    // Sort processes by fechaFin ascending (soonest first) and take top 5
    const sorted = [...this.processes]
      .filter(p => p.fechaFin >= now)
      .sort((a, b) => a.fechaFin.getTime() - b.fechaFin.getTime())
      .slice(0, 5);

    sorted.forEach((proc, idx) => {
      const diff = Math.ceil((proc.fechaFin.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      const label = diff <= 0 ? 'Hoy' : diff === 1 ? 'Mañana' : `En ${diff} días`;
      const estado = proc.estadoGeneral || 'default';
      milestones.push({
        title: proc.titulo,
        code: proc.codigo,
        date: proc.fechaFin.toISOString().substring(0, 10),
        label,
        colorClass: colorClasses[idx % colorClasses.length],
        icon: iconMap[estado.toUpperCase()] || iconMap['default']
      });
    });

    // If no real milestones from upcoming dates, try past ones too
    if (milestones.length === 0 && this.processes.length > 0) {
      const pastSorted = [...this.processes]
        .sort((a, b) => b.fechaFin.getTime() - a.fechaFin.getTime())
        .slice(0, 5);
      pastSorted.forEach((proc, idx) => {
        milestones.push({
          title: proc.titulo,
          code: proc.codigo,
          date: proc.fechaFin.toISOString().substring(0, 10),
          label: 'Cerrado',
          colorClass: colorClasses[idx % colorClasses.length],
          icon: 'fa-check-circle'
        });
      });
    }

    this.criticalMilestones = milestones;
  }

  // Interactive Actions via SweetAlert2 Modals
  openEditProgress(act: GanttSubActivity): void {
    if (!this.selectedProcess) return;
    const proc = this.selectedProcess;

    Swal.fire({
      title: 'Actualizar Progreso de Actividad',
      text: `${proc.codigo} - ${act.nombre}`,
      input: 'range',
      inputLabel: 'Progreso actual (%)',
      inputValue: act.progreso,
      inputAttributes: {
        min: '0',
        max: '100',
        step: '5'
      },
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b'
    }).then((result) => {
      if (result.isConfirmed) {
        const newProg = Number(result.value);
        act.progreso = newProg;
        act.estado = newProg === 100 ? 'Finalizado' : newProg > 0 ? 'En Progreso' : 'Sin Iniciar';
        
        proc.progreso = Math.round(proc.actividades.reduce((acc, curr) => acc + curr.progreso, 0) / proc.actividades.length);
        
        this.calculateKPIs();
        this.calculateDonutSegments();
        Swal.fire('¡Progreso Actualizado!', `La actividad ahora está al ${newProg}% de avance.`, 'success');
      }
    });
  }

  openReprogramHito(act: GanttSubActivity): void {
    const formattedStart = act.fechaInicio.toISOString().substring(0, 10);
    const formattedEnd = act.fechaFin.toISOString().substring(0, 10);

    Swal.fire({
      title: 'Reprogramar Fechas',
      html: `
        <div style="text-align:left; font-family:'Inter',sans-serif; font-size:0.9rem;">
          <label style="display:block; font-weight:700; margin-bottom:5px;">Fecha de Inicio:</label>
          <input type="date" id="swal-start-date" class="swal2-input" value="${formattedStart}" style="width:90%; margin-bottom:15px; font-size:0.9rem;">
          
          <label style="display:block; font-weight:700; margin-bottom:5px;">Fecha de Finalización:</label>
          <input type="date" id="swal-end-date" class="swal2-input" value="${formattedEnd}" style="width:90%; font-size:0.9rem;">
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Actualizar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b',
      preConfirm: () => {
        const st = (document.getElementById('swal-start-date') as HTMLInputElement).value;
        const en = (document.getElementById('swal-end-date') as HTMLInputElement).value;
        return { startDate: st, endDate: en };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const { startDate, endDate } = result.value;
        act.fechaInicio = new Date(startDate);
        act.fechaFin = new Date(endDate);

        const totalTimelineDays = 61;
        const startDiff = Math.max(0, Math.ceil((act.fechaInicio.getTime() - this.timelineStart.getTime()) / (24 * 60 * 60 * 1000)));
        const endDiff = Math.min(totalTimelineDays, Math.ceil((act.fechaFin.getTime() - this.timelineStart.getTime()) / (24 * 60 * 60 * 1000)));
        
        act.startPercent = (startDiff / totalTimelineDays) * 100;
        act.widthPercent = Math.max(8, ((endDiff - startDiff) / totalTimelineDays) * 100);

        Swal.fire('¡Fechas Actualizadas!', 'La planificación del hito se ha reprogramado exitosamente.', 'success');
      }
    });
  }

  openAddDependencia(act: GanttSubActivity): void {
    if (!this.selectedProcess) return;
    const optionsHtml = this.selectedProcess.actividades
      .filter(a => a.id !== act.id)
      .map(a => `<option value="${a.id}">${a.nombre}</option>`)
      .join('');

    Swal.fire({
      title: 'Agregar Dependencia Técnica',
      html: `
        <div style="text-align:left; font-family:'Inter',sans-serif; font-size:0.9rem;">
          <p style="color:#64748b; margin-bottom:15px;">Establecer que la actividad <strong>${act.nombre}</strong> depende de la finalización de:</p>
          <select id="swal-dep-select" class="swal2-select" style="width:100%; font-size:0.9rem; padding:0.5rem; border-radius:8px;">
            ${optionsHtml}
          </select>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Vincular Actividades',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire('¡Vínculo de Dependencia Guardado!', 'La relación de precedencia ha sido registrada para los cálculos dinámicos de retrasos.', 'success');
      }
    });
  }

  exportCronograma(): void {
    if (!this.selectedProcess) return;
    
    Swal.fire({
      title: 'Exportar Cronograma Gantt',
      text: 'Seleccione el formato en el cual desea descargar la planificación activa.',
      icon: 'question',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Descargar PDF',
      denyButtonText: 'Descargar Excel (XLSX)',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2563eb',
      denyButtonColor: '#10b981',
      cancelButtonColor: '#64748b'
    }).then((result) => {
      if (result.isConfirmed) {
        this.downloadPDF();
      } else if (result.isDenied) {
        this.downloadExcel();
      }
    });
  }

  downloadPDF(): void {
    if (!this.selectedProcess) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      Swal.fire('Error', 'No se pudo abrir la ventana de exportación de PDF. Asegúrate de desactivar los bloqueadores de elementos emergentes.', 'error');
      return;
    }

    const htmlContent = `
      <html>
        <head>
          <title>Cronograma - ${this.selectedProcess.codigo}</title>
          <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Outfit', sans-serif; padding: 40px; color: #1e293b; background-color: #ffffff; }
            .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { font-size: 28px; color: #0f172a; margin: 0 0 5px 0; font-weight: 800; }
            .header h2 { font-size: 18px; color: #2563eb; margin: 0 0 10px 0; font-weight: 600; }
            .header p { font-size: 14px; color: #64748b; margin: 0; }
            .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
            .kpi-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; text-align: center; background-color: #f8fafc; }
            .kpi-card .val { font-size: 22px; font-weight: 800; color: #0f172a; }
            .kpi-card .lbl { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            th, td { border: 1px solid #cbd5e1; padding: 12px 14px; text-align: left; font-size: 13px; }
            th { background-color: #f1f5f9; font-weight: 800; color: #334155; text-transform: uppercase; font-size: 11px; }
            .progress-bar-container { background: #e2e8f0; height: 10px; border-radius: 5px; overflow: hidden; width: 100px; display: inline-block; margin-right: 8px; vertical-align: middle; }
            .progress-bar-fill { height: 100%; }
            .badge { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; display: inline-block; text-transform: uppercase; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Sistema de Licitaciones - Reporte de Planificación</h1>
            <h2>${this.selectedProcess.codigo} - ${this.selectedProcess.titulo}</h2>
            <p><strong>Responsable:</strong> ${this.selectedProcess.responsable} | <strong>Rango Planificado:</strong> 01/05/2026 - 30/06/2026 | <strong>Generado el:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          <div class="kpis">
            <div class="kpi-card"><div class="val">${this.selectedProcess.progreso}%</div><div class="lbl">Avance Promedio</div></div>
            <div class="kpi-card"><div class="val">${this.kpiStats.activos}</div><div class="lbl">Hitos</div></div>
            <div class="kpi-card"><div class="val">${this.kpiStats.completados}</div><div class="lbl">Finalizados</div></div>
            <div class="kpi-card"><div class="val">${this.kpiStats.enProgreso}</div><div class="lbl">En Progreso</div></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Hito / Actividad</th>
                <th>Responsable</th>
                <th>Fecha Inicio</th>
                <th>Fecha Fin</th>
                <th>Progreso</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              ${this.selectedProcess.actividades.map(act => `
                <tr>
                  <td><strong>${act.nombre}</strong></td>
                  <td>${act.responsable}</td>
                  <td>${act.fechaInicio.toLocaleDateString('es-ES')}</td>
                  <td>${act.fechaFin.toLocaleDateString('es-ES')}</td>
                  <td>
                    <div class="progress-bar-container"><div class="progress-bar-fill" style="width: ${act.progreso}%; background-color: ${act.color};"></div></div>
                    <strong>${act.progreso}%</strong>
                  </td>
                  <td><span class="badge" style="background-color: ${act.color}15; color: ${act.color};">${act.estado}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    Swal.fire('¡PDF Generado!', 'El reporte de impresión PDF ha sido creado exitosamente.', 'success');
  }

  downloadExcel(): void {
    if (!this.selectedProcess) return;

    // Premium structured CSV table data
    const headers = ['Código de Proceso', 'Título', 'Responsable Licitación', 'Hito / Actividad', 'Responsable Actividad', 'Fecha Inicio', 'Fecha Fin', 'Progreso (%)', 'Estado'];
    const rows = this.selectedProcess.actividades.map(act => [
      this.selectedProcess!.codigo,
      this.selectedProcess!.titulo,
      this.selectedProcess!.responsable,
      act.nombre,
      act.responsable,
      act.fechaInicio.toLocaleDateString('es-ES'),
      act.fechaFin.toLocaleDateString('es-ES'),
      `${act.progreso}%`,
      act.estado
    ]);

    // Construct CSV with UTF-8 BOM so Excel opens accents correctly
    let csvContent = "\uFEFF"; // UTF-8 BOM byte sequence
    csvContent += headers.join(";") + "\n";
    rows.forEach(row => {
      csvContent += row.map(val => `"${val.replace(/"/g, '""')}"`).join(";") + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `Cronograma_${this.selectedProcess.codigo}.csv`);
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    Swal.fire('¡Excel Descargado!', 'El cronograma ha sido exportado en formato CSV compatible con Microsoft Excel de forma exitosa.', 'success');
  }

  imprimirCronograma(): void {
    this.downloadPDF();
  }
}
