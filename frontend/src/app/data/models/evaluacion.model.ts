import { Propuesta } from './propuesta.model';
import { Usuario } from './usuario.model';
import { Licitacion } from './licitacion.model';

export interface Evaluacion {
  id?: number;
  licitacion?: Licitacion;
  licitacionId?: number;
  propuesta?: Propuesta;
  propuestaId?: number;
  evaluador?: Usuario;
  
  // Revisión Técnica (Bases)
  cumpleRequisitos?: boolean;
  calidad?: number;
  claridad?: number;
  viabilidad?: number;
  archivoPdf?: string;
  
  // Evaluación de Propuesta (Proveedores)
  puntajePrecio?: number;
  puntajeCalidad?: number;
  puntajeExperiencia?: number;
  puntajeTiempo?: number;
  puntajeTotal?: number;
  
  comentarios: string;
  observaciones?: string;
  puntajesJson?: string;
  respuestasJson?: string;
  resultado?: string;
  sinConflictoInteres?: boolean;
  estadoTramite?: 'BORRADOR' | 'FINALIZADO';
  estado?: string; // Alias para resultado
  fecha?: Date;
}
