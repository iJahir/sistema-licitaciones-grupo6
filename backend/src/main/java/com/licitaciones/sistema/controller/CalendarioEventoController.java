package com.licitaciones.sistema.controller;

import com.licitaciones.sistema.entity.CalendarioEvento;
import com.licitaciones.sistema.entity.Usuario;
import com.licitaciones.sistema.repository.UsuarioRepository;
import com.licitaciones.sistema.service.CalendarioEventoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/calendario")
public class CalendarioEventoController {

    @Autowired
    private CalendarioEventoService service;

    @Autowired
    private UsuarioRepository userRepository;

    @GetMapping
    public ResponseEntity<List<CalendarioEvento>> getEvents(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end,
            Authentication authentication) {
        
        Usuario user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        
        if (start != null && end != null) {
            return ResponseEntity.ok(service.findByDateAndRole(start, end, user));
        } else {
            return ResponseEntity.ok(service.findByRole(user));
        }
    }

    @GetMapping("/dia/{fecha}")
    public ResponseEntity<List<CalendarioEvento>> getEventsByDay(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fecha,
            Authentication authentication) {
        
        Usuario user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        
        LocalDateTime start = fecha.withHour(0).withMinute(0).withSecond(0);
        LocalDateTime end = fecha.withHour(23).withMinute(59).withSecond(59);
        
        return ResponseEntity.ok(service.findByDateAndRole(start, end, user));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GESTOR_LICITACIONES','ADMINISTRADOR','ADMIN')")
    public ResponseEntity<CalendarioEvento> create(@RequestBody CalendarioEvento evento, Authentication authentication) {
        Usuario user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        
        evento.setUsuario(user);
        if (evento.getArea() == null) {
            evento.setArea(user.getArea());
        }
        
        return ResponseEntity.ok(service.save(evento));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GESTOR_LICITACIONES','ADMINISTRADOR','ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
