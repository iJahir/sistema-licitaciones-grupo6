export enum EstadoLicitacion {
  BORRADOR = 'BORRADOR',
  PUBLICADA = 'PUBLICADA',
  EN_INSCRIPCION = 'EN_INSCRIPCION',
  CERRADA = 'CERRADA',
  EN_EVALUACION = 'EN_EVALUACION',
  EVALUADA = 'EVALUADA',
  ADJUDICADA = 'ADJUDICADA',
  CONTRATADA = 'CONTRATADA',
  DESIERTA = 'DESIERTA',
  CANCELADA = 'CANCELADA'
}

export interface Licitacion {
  id?: number;
  titulo: string;
  descripcion: string;
  area?: any;
  tipo: string;
  presupuesto: number;
  propuestasCount?: number;
  bases: string;
  requisitos: string;
  fechaPublicacion?: string | Date;
  fechaCierre?: string | Date;
  fechaEvaluacion?: string | Date;
  fechaAdjudicacion?: string | Date;
  estado: EstadoLicitacion;
  creadoPor?: any;
  evaluadores?: any[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
  versionActual?: number;
  motivoCancelacion?: string;
  documentos?: any[];
  hitos?: any[];
  historial?: any[];
  propuestaGanadora?: any;
  aprobadoPor?: any;
  fechaAprobacion?: string | Date;
}
