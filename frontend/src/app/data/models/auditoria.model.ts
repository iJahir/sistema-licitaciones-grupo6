export interface Auditoria {
  id: number;
  usuario: any;
  username: string;
  rolUsuario: string;
  accion: string;
  modulo: string;
  descripcion: string;
  fecha: string;
  ip: string;
  userAgent: string;
  metadata?: string;
}
