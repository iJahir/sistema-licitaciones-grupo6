package com.licitaciones.sistema.controller;

import com.licitaciones.sistema.entity.RoleMetadata;
import com.licitaciones.sistema.service.RoleMetadataService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/roles-permisos")
@CrossOrigin(origins = "*", maxAge = 3600)
public class RoleMetadataController {

    @Autowired
    private RoleMetadataService roleMetadataService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'AUTORIDAD')")
    public ResponseEntity<List<Map<String, Object>>> getAll() {
        return ResponseEntity.ok(roleMetadataService.getAll());
    }

    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'AUTORIDAD')")
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(roleMetadataService.getStats());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<RoleMetadata> create(@RequestBody RoleMetadata roleMetadata) {
        return ResponseEntity.ok(roleMetadataService.save(roleMetadata));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<RoleMetadata> update(@PathVariable Long id, @RequestBody RoleMetadata roleMetadata) {
        roleMetadata.setId(id);
        return ResponseEntity.ok(roleMetadataService.save(roleMetadata));
    }

    @PostMapping("/{id}/clonar")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<RoleMetadata> cloneRole(@PathVariable Long id) {
        return ResponseEntity.ok(roleMetadataService.clone(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        roleMetadataService.delete(id);
        return ResponseEntity.ok().build();
    }
}
