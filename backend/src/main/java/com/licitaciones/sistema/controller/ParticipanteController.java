package com.licitaciones.sistema.controller;

import com.licitaciones.sistema.entity.Participante;
import com.licitaciones.sistema.entity.Usuario;
import com.licitaciones.sistema.service.ParticipanteService;
import com.licitaciones.sistema.repository.UsuarioRepository;
import com.licitaciones.sistema.service.AuditoriaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/participantes")
public class ParticipanteController {

    @Autowired
    private ParticipanteService participanteService;

    @Autowired
    private UsuarioRepository userRepository;

    @Autowired
    private AuditoriaService auditoriaService;

    @GetMapping("/licitacion/{licitacionId}")
    public ResponseEntity<List<Participante>> getByLicitacion(@PathVariable Long licitacionId) {
        return ResponseEntity.ok(participanteService.findByLicitacion(licitacionId));
    }

    @PostMapping("/inscribir/{licitacionId}")
    @PreAuthorize("hasRole('PROVEEDOR') or hasRole('ADMINISTRADOR')")
    public ResponseEntity<Participante> inscribir(@PathVariable Long licitacionId, Authentication authentication) {
        Usuario user = userRepository.findByUsername(authentication.getName()).orElseThrow();
        Participante p = participanteService.inscribir(licitacionId, user);
        auditoriaService.registrarAccion("INSCRIBIR_PARTICIPANTE", "LICITACIONES", 
                "El usuario " + user.getUsername() + " se ha inscrito en la licitación con ID: " + licitacionId);
        return ResponseEntity.ok(p);
    }

    @PutMapping("/{id}/validar")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'AUTORIDAD', 'GESTOR_LICITACIONES', 'AUDITOR', 'SUPER_ADMIN')")
    public ResponseEntity<Participante> validar(
            @PathVariable Long id, 
            @RequestBody Map<String, Object> body,
            Authentication authentication) {
        
        boolean validado = (boolean) body.get("validado");
        String observaciones = (String) body.get("observaciones");
        Usuario admin = userRepository.findByUsername(authentication.getName()).orElseThrow();
        
        Participante p = participanteService.validar(id, validado, observaciones, admin);
        auditoriaService.registrarAccion("VALIDAR_PARTICIPANTE", "LICITACIONES", 
                "Se ha " + (validado ? "Aprobado" : "Rechazado") + " el participante ID " + id + " en la licitación con ID: " + p.getLicitacion().getId() + " por: " + admin.getUsername());
        return ResponseEntity.ok(p);
    }
}
