export interface Usuario {
  id?: number;
  username: string;
  email: string;
  nombre: string;
  apellido: string;
  password?: string;
  roles: string[];
  enabled: boolean;
  primeraConexion?: Date;
  ultimaConexion?: Date;
  ultimaActividad?: string;
  requiereCambioPassword?: boolean;
  fechaCreacion?: Date;
  areaId?: number;
  areaNombre?: string;
  urlFoto?: string;
}

export enum RoleName {
  ADMINISTRADOR = 'ROLE_ADMINISTRADOR',
  GESTOR_LICITACIONES = 'ROLE_GESTOR_LICITACIONES',
  AREA_SOLICITANTE = 'ROLE_AREA_SOLICITANTE',
  EVALUADOR = 'ROLE_EVALUADOR',
  PROVEEDOR = 'ROLE_PROVEEDOR',
  AUDITOR = 'ROLE_AUDITOR',
  AUTORIDAD = 'ROLE_AUTORIDAD'
}
