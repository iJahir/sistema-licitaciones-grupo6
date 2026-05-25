import { Licitacion } from './licitacion.model';
import { Usuario } from './usuario.model';

export interface Propuesta {
  id?: number;
  licitacion: Licitacion;
  usuario: Usuario;
  nombre: string;
  descripcion: string;
  montoOfertado: number;
  tiempoEntregaDias: number;
  estado: string;
  fechaEnvio?: Date;
  versionActual?: number;
  declaracionVeracidad?: boolean;
  aceptacionBases?: boolean;
  noConflictoInteres?: boolean;
  
  // Información Proveedor
  empresaNombre?: string;
  identificacionRuc?: string;
  contactoNombre?: string;
  contactoEmail?: string;
  contactoTelefono?: string;
  
  // Oferta Económica
  moneda?: string;
  detalleCosto?: string;
  
  // Datos Dinámicos
  datosAreaJson?: string;
  comentarios?: string;
  motivoRechazo?: string;
  documentos?: any[];
}
