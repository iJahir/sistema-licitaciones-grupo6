import { Licitacion } from './licitacion.model';

export interface Rubrica {
  id?: number;
  licitacion?: Licitacion;
  licitacionId?: number;
  nombre: string;
  criterios: Criterio[];
}

export interface Criterio {
  id?: number;
  nombre: string;
  peso: number;
  puntajeMaximo: number;
}
