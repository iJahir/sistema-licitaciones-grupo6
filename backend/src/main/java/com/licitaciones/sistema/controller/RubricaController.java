package com.licitaciones.sistema.controller;

import com.licitaciones.sistema.entity.Rubrica;
import com.licitaciones.sistema.service.RubricaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayInputStream;

@RestController
@RequestMapping("/api/rubricas")
public class RubricaController {

    @Autowired
    private RubricaService rubricaService;

    @GetMapping("/licitacion/{licitacionId}")
    public ResponseEntity<Rubrica> getByLicitacion(@PathVariable Long licitacionId) {
        return rubricaService.findByLicitacion(licitacionId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @GetMapping("/licitacion/{licitacionId}/pdf")
    @PreAuthorize("hasRole('ADMINISTRADOR') or hasRole('EVALUADOR') or hasRole('OBSERVADOR') or hasRole('PROVEEDOR') or hasRole('AREA_SOLICITANTE')")
    public ResponseEntity<InputStreamResource> downloadCriteriosPdf(@PathVariable Long licitacionId) {
        ByteArrayInputStream in = rubricaService.exportCriteriosPdf(licitacionId);
        HttpHeaders headers = new HttpHeaders();
        headers.add("Content-Disposition", "attachment; filename=criterios-licitacion-" + licitacionId + ".pdf");
        
        return ResponseEntity.ok()
                .headers(headers)
                .contentType(MediaType.APPLICATION_PDF)
                .body(new InputStreamResource(in));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMINISTRADOR') or hasRole('AREA_SOLICITANTE')")
    public ResponseEntity<Rubrica> create(@RequestBody Rubrica rubrica) {
        return ResponseEntity.ok(rubricaService.save(rubrica));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        rubricaService.delete(id);
        return ResponseEntity.ok().build();
    }
}

