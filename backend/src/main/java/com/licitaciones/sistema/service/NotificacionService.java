package com.licitaciones.sistema.service;

import com.licitaciones.sistema.entity.Notificacion;
import com.licitaciones.sistema.entity.Usuario;
import com.licitaciones.sistema.entity.Licitacion;
import com.licitaciones.sistema.entity.EstadoLicitacion;
import com.licitaciones.sistema.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class NotificacionService {

    @Autowired
    private NotificacionRepository notificacionRepository;

    @Autowired
    private LicitacionRepository licitacionRepository;

    @Autowired
    private ContratoRepository contratoRepository;

    @Autowired
    private PropuestaRepository propuestaRepository;

    @Autowired
    private EvaluacionRepository evaluacionRepository;

    @Transactional
    public void crear(Usuario usuario, String titulo, String mensaje, String tipo, String icono, String color, String link) {
        Notificacion notif = Notificacion.builder()
                .usuario(usuario)
                .titulo(titulo)
                .mensaje(mensaje)
                .tipo(tipo)
                .icono(icono)
                .color(color)
                .link(link)
                .fecha(LocalDateTime.now())
                .leida(false)
                .build();
        notificacionRepository.save(notif);
    }

    // Sobrecarga conveniente para notificaciones globales
    @Transactional
    public void crearGlobal(String titulo, String mensaje, String tipo, String icono, String color, String link) {
        crear(null, titulo, mensaje, tipo, icono, color, link);
    }

    public List<Notificacion> obtenerRecientes() {
        return notificacionRepository.findTop10ByUsuarioIdIsNullOrderByFechaDesc();
    }

    public List<Notificacion> obtenerNotificacionesPorUsuario(Long usuarioId) {
        return notificacionRepository.findByUsuarioIdOrderByFechaDesc(usuarioId);
    }
    public List<Notificacion> obtenerNotificacionesParaUsuario(Usuario user) {
        LocalDateTime todayStart = LocalDateTime.now().with(java.time.LocalTime.MIN);
        boolean verHistorial = user.isAdmin() || user.isAutoridad();
        
        List<Notificacion> todas = notificacionRepository.findAll();
        
        return todas.stream()
                .filter(n -> esNotificacionPermitida(n, user))
                .filter(n -> verHistorial || n.getFecha() == null || n.getFecha().isAfter(todayStart) || n.getFecha().isEqual(todayStart))
                .sorted((a, b) -> {
                    if (a.getFecha() == null && b.getFecha() == null) return 0;
                    if (a.getFecha() == null) return 1;
                    if (b.getFecha() == null) return -1;
                    return b.getFecha().compareTo(a.getFecha());
                })
                .collect(Collectors.toList());
    }

    public long contarNoLeidasParaUsuario(Usuario user) {
        LocalDateTime todayStart = LocalDateTime.now().with(java.time.LocalTime.MIN);
        boolean verHistorial = user.isAdmin() || user.isAutoridad();
        
        return notificacionRepository.findAll().stream()
                .filter(n -> !n.isLeida())
                .filter(n -> esNotificacionPermitida(n, user))
                .filter(n -> verHistorial || n.getFecha() == null || n.getFecha().isAfter(todayStart) || n.getFecha().isEqual(todayStart))
                .count();
    }

    @Transactional
    public void marcarComoLeida(Long id) {
        notificacionRepository.findById(id).ifPresent(n -> {
            n.setLeida(true);
            notificacionRepository.save(n);
        });
    }

    @Transactional
    public void marcarTodasComoLeidas() {
        List<Notificacion> noLeidas = notificacionRepository.findAll().stream()
                .filter(n -> !n.isLeida())
                .toList();
        noLeidas.forEach(n -> n.setLeida(true));
        notificacionRepository.saveAll(noLeidas);
    }

    @Transactional
    public void marcarTodasComoLeidasParaUsuario(Usuario user) {
        List<Notificacion> noLeidas = notificacionRepository.findAll().stream()
                .filter(n -> !n.isLeida())
                .filter(n -> esNotificacionPermitida(n, user))
                .toList();
        noLeidas.forEach(n -> n.setLeida(true));
        notificacionRepository.saveAll(noLeidas);
    }

    private boolean esNotificacionPermitida(Notificacion n, Usuario user) {
        if (user.isAdmin() || user.isAutoridad() || user.hasAnyRole(com.licitaciones.sistema.entity.RoleName.ROLE_GESTOR_LICITACIONES)) {
            return true;
        }

        // Si la notificación es específica para un usuario
        if (n.getUsuario() != null) {
            return n.getUsuario().getId().equals(user.getId());
        }

        // Si es global (n.getUsuario() == null) y no tiene link, es visible
        if (n.getLink() == null || n.getLink().isEmpty()) {
            return true;
        }

        // Parsear link para aplicar ownership y visibilidad estricta
        String link = n.getLink();
        try {
            if (link.startsWith("/licitaciones/")) {
                String sub = link.substring("/licitaciones/".length()).split("/")[0];
                if (!sub.equals("crear") && !sub.equals("editar")) {
                    Long id = Long.parseLong(sub);
                    return tieneAccesoLicitacion(id, user);
                }
            } else if (link.startsWith("/contratos/")) {
                String sub = link.substring("/contratos/".length()).split("/")[0];
                if (!sub.equals("generar")) {
                    Long id = Long.parseLong(sub);
                    return tieneAccAccessoContrato(id, user);
                }
            } else if (link.startsWith("/propuestas/")) {
                Long id = Long.parseLong(link.substring("/propuestas/".length()).split("/")[0]);
                return tieneAccesoPropuesta(id, user);
            } else if (link.startsWith("/evaluaciones/")) {
                String sub = link.substring("/evaluaciones/".length()).split("/")[0];
                if (!sub.equals("evaluar") && !sub.equals("form") && !sub.equals("rubrica") && !sub.equals("resultados")) {
                    Long id = Long.parseLong(sub);
                    return tieneAccesoEvaluacion(id, user);
                } else if (sub.equals("resultados") || sub.equals("rubrica")) {
                    String[] parts = link.substring("/evaluaciones/".length()).split("/");
                    if (parts.length > 1) {
                        Long licId = Long.parseLong(parts[1]);
                        return tieneAccesoLicitacion(licId, user);
                    }
                }
            }
        } catch (Exception e) {
            return true;
        }

        return true;
    }

    private boolean tieneAccAccessoContrato(Long contratoId, Usuario user) {
        return contratoRepository.findById(contratoId).map(c -> {
            if (user.isAreaSolicitante()) {
                Licitacion l = c.getLicitacion();
                return l != null && ((l.getArea() != null && user.getArea() != null && l.getArea().getId().equals(user.getArea().getId()))
                    || (l.getCreadoPor() != null && l.getCreadoPor().getId().equals(user.getId())));
            }
            if (user.isProveedor()) {
                return c.getPropuesta() != null && c.getPropuesta().getUsuario() != null 
                    && c.getPropuesta().getUsuario().getId().equals(user.getId());
            }
            return false;
        }).orElse(false);
    }

    private boolean tieneAccesoLicitacion(Long licitacionId, Usuario user) {
        return licitacionRepository.findById(licitacionId).map(l -> {
            if (user.isAreaSolicitante()) {
                return (l.getArea() != null && user.getArea() != null && l.getArea().getId().equals(user.getArea().getId()))
                    || (l.getCreadoPor() != null && l.getCreadoPor().getId().equals(user.getId()));
            }
            if (user.isProveedor()) {
                return l.getEstado() == EstadoLicitacion.PUBLICADA || 
                       propuestaRepository.findByLicitacionId(l.getId()).stream()
                           .anyMatch(p -> p.getUsuario().getId().equals(user.getId()));
            }
            if (user.isEvaluador()) {
                return evaluacionRepository.findByEvaluadorId(user.getId()).stream()
                    .anyMatch(ev -> ev.getLicitacion() != null && ev.getLicitacion().getId().equals(l.getId()));
            }
            return false;
        }).orElse(false);
    }

    private boolean tieneAccesoPropuesta(Long propuestaId, Usuario user) {
        return propuestaRepository.findById(propuestaId).map(p -> {
            if (user.isAreaSolicitante()) {
                Licitacion l = p.getLicitacion();
                return l != null && ((l.getArea() != null && user.getArea() != null && l.getArea().getId().equals(user.getArea().getId()))
                    || (l.getCreadoPor() != null && l.getCreadoPor().getId().equals(user.getId())));
            }
            if (user.isProveedor()) {
                return p.getUsuario() != null && p.getUsuario().getId().equals(user.getId());
            }
            return false;
        }).orElse(false);
    }

    private boolean tieneAccesoEvaluacion(Long evaluacionId, Usuario user) {
        return evaluacionRepository.findById(evaluacionId).map(ev -> {
            if (user.isEvaluador()) {
                return ev.getEvaluador() != null && ev.getEvaluador().getId().equals(user.getId());
            }
            if (user.isAreaSolicitante()) {
                Licitacion l = ev.getLicitacion();
                return l != null && ((l.getArea() != null && user.getArea() != null && l.getArea().getId().equals(user.getArea().getId()))
                    || (l.getCreadoPor() != null && l.getCreadoPor().getId().equals(user.getId())));
            }
            return false;
        }).orElse(false);
    }
}
