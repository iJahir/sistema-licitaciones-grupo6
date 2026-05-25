package com.licitaciones.sistema.controller;

import com.licitaciones.sistema.dto.PasswordResetRequest;
import com.licitaciones.sistema.dto.UsuarioDTO;
import com.licitaciones.sistema.entity.Usuario;
import com.licitaciones.sistema.service.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.Set;

@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    @Autowired
    private UsuarioService usuarioService;

    @Autowired
    private com.licitaciones.sistema.service.AuditoriaService auditoriaService;

    @PostMapping("/{id}/foto")
    public ResponseEntity<UsuarioDTO> uploadPhoto(@PathVariable Long id, @RequestParam("foto") MultipartFile foto) throws IOException {
        UsuarioDTO updated = usuarioService.uploadPhoto(id, foto);
        auditoriaService.registrarAccion("ACTUALIZAR_FOTO", "USUARIOS", "Se ha actualizado la foto de perfil del usuario: " + updated.getUsername());
        return ResponseEntity.ok(updated);
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMINISTRADOR') or hasRole('AUTORIDAD')")
    public ResponseEntity<Page<UsuarioDTO>> getAll(
            @RequestParam(required = false) String term,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(usuarioService.getAll(term, pageable));
    }

    @GetMapping("/evaluadores")
    @PreAuthorize("hasRole('ADMINISTRADOR') or hasRole('AREA_SOLICITANTE') or hasRole('GESTOR_LICITACIONES') or hasRole('AUTORIDAD')")
    public ResponseEntity<java.util.List<UsuarioDTO>> getEvaluadores() {
        return ResponseEntity.ok(usuarioService.getEvaluadores());
    }

    @GetMapping("/{id}")
    public ResponseEntity<UsuarioDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(usuarioService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMINISTRADOR') or hasRole('AUTORIDAD')")
    public ResponseEntity<UsuarioDTO> create(@Valid @RequestBody Usuario user, @RequestParam Set<String> roles) {
        UsuarioDTO created = usuarioService.create(user, roles);
        auditoriaService.registrarAccion("CREAR_USUARIO", "USUARIOS", "Se ha creado el usuario: " + created.getUsername());
        return ResponseEntity.ok(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRADOR') or hasRole('AUTORIDAD')")
    public ResponseEntity<UsuarioDTO> update(
            @PathVariable Long id, 
            @RequestBody Usuario user, 
            @RequestParam Set<String> roles,
            @RequestParam String adminPassword) {
        UsuarioDTO updated = usuarioService.update(id, user, roles, adminPassword);
        auditoriaService.registrarAccion("EDITAR_USUARIO", "USUARIOS", "Se ha editado el usuario: " + updated.getUsername());
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRADOR') or hasRole('AUTORIDAD')")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        UsuarioDTO user = usuarioService.getById(id);
        usuarioService.delete(id);
        auditoriaService.registrarAccion("ELIMINAR_USUARIO", "USUARIOS", "Se ha eliminado (lógicamente) al usuario: " + user.getUsername());
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}/estado")
    @PreAuthorize("hasRole('ADMINISTRADOR') or hasRole('AUTORIDAD')")
    public ResponseEntity<?> toggleStatus(@PathVariable Long id) {
        usuarioService.toggleStatus(id);
        UsuarioDTO user = usuarioService.getById(id);
        auditoriaService.registrarAccion("CAMBIO_ESTADO", "USUARIOS", "Se ha cambiado el estado del usuario: " + user.getUsername() + " a " + (user.isEnabled() ? "Activo" : "Inactivo"));
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/reset-password")
    @PreAuthorize("hasRole('ADMINISTRADOR') or hasRole('AUTORIDAD')")
    public ResponseEntity<?> resetPassword(@PathVariable Long id, @Valid @RequestBody PasswordResetRequest request) {
        usuarioService.resetPassword(id, request);
        UsuarioDTO user = usuarioService.getById(id);
        auditoriaService.registrarAccion("RESET_PASSWORD", "USUARIOS", "Se ha restablecido la contraseña del usuario: " + user.getUsername());
        return ResponseEntity.ok().build();
    }
}
