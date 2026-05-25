package com.licitaciones.sistema.controller;

import com.licitaciones.sistema.entity.Noticia;
import com.licitaciones.sistema.entity.Usuario;
import com.licitaciones.sistema.repository.UsuarioRepository;
import com.licitaciones.sistema.service.NoticiaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/noticias")
public class NoticiaController {

    @Autowired
    private NoticiaService service;

    @Autowired
    private UsuarioRepository userRepository;

    @GetMapping
    public ResponseEntity<List<Noticia>> getRecent(@RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(service.findRecent(limit));
    }

    @PutMapping("/{id}/leer")
    public ResponseEntity<Void> marcarComoLeida(@PathVariable Long id, Authentication authentication) {
        Usuario user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        
        service.marcarComoLeida(id, user.getId());
        return ResponseEntity.ok().build();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<Noticia> create(@RequestBody Noticia noticia) {
        return ResponseEntity.ok(service.save(noticia));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
