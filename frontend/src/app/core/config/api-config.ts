/**
 * Configuración centralizada de la API
 * Detecta automáticamente el host actual para permitir acceso desde red local (móviles, tablets, etc.)
 */
const getBaseUrl = () => {
  const hostname = window.location.hostname;
  // Si estamos en localhost, seguimos apuntando a localhost:8080
  // Si entramos por IP (ej: 192.168.1.95), apuntamos a esa IP:8080
  return `http://${hostname}:8080/api/`;
};

export const API_CONFIG = {
  baseUrl: getBaseUrl(),
  authEndpoint: `${getBaseUrl()}auth/`,
  // Podemos agregar más sub-rutas aquí si es necesario
};
