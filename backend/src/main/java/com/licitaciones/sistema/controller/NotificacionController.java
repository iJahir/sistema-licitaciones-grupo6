package com.licitaciones.sistema.controller;

import com.licitaciones.sistema.entity.Notificacion;
import com.licitaciones.sistema.service.NotificacionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notificaciones")
@CrossOrigin(origins = "*", maxAge = 3600)
public class NotificacionController {

    @Autowired
    private NotificacionService notificacionService;

    @Autowired
    private com.licitaciones.sistema.repository.UsuarioRepository userRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'AUTORIDAD', 'AREA_SOLICITANTE', 'PROVEEDOR', 'EVALUADOR', 'GESTOR_LICITACIONES')")
    public List<Notificacion> getRecent(org.springframework.security.core.Authentication auth) {
        com.licitaciones.sistema.entity.Usuario user = userRepository.findByUsername(auth.getName()).orElseThrow();
        return notificacionService.obtenerNotificacionesParaUsuario(user);
    }

    @GetMapping("/mis-notificaciones")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'AUTORIDAD', 'AREA_SOLICITANTE', 'PROVEEDOR', 'EVALUADOR', 'GESTOR_LICITACIONES')")
    public List<Notificacion> getMyNotifications(org.springframework.security.core.Authentication auth) {
        com.licitaciones.sistema.entity.Usuario user = userRepository.findByUsername(auth.getName()).orElseThrow();
        return notificacionService.obtenerNotificacionesParaUsuario(user);
    }

    @GetMapping("/count")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'AUTORIDAD', 'AREA_SOLICITANTE', 'PROVEEDOR', 'EVALUADOR', 'GESTOR_LICITACIONES')")
    public long getUnreadCount(org.springframework.security.core.Authentication auth) {
        com.licitaciones.sistema.entity.Usuario user = userRepository.findByUsername(auth.getName()).orElseThrow();
        return notificacionService.contarNoLeidasParaUsuario(user);
    }

    @PutMapping("/{id}/leer")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'AUTORIDAD', 'AREA_SOLICITANTE', 'PROVEEDOR', 'EVALUADOR', 'GESTOR_LICITACIONES')")
    public ResponseEntity<?> markAsRead(@PathVariable Long id) {
        notificacionService.marcarComoLeida(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/leer-todas")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'AUTORIDAD', 'AREA_SOLICITANTE', 'PROVEEDOR', 'EVALUADOR', 'GESTOR_LICITACIONES')")
    public ResponseEntity<?> markAllAsRead(org.springframework.security.core.Authentication auth) {
        com.licitaciones.sistema.entity.Usuario user = userRepository.findByUsername(auth.getName()).orElseThrow();
        notificacionService.marcarTodasComoLeidasParaUsuario(user);
        return ResponseEntity.ok().build();
    }
}
