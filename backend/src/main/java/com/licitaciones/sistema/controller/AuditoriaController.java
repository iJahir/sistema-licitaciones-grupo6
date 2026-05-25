package com.licitaciones.sistema.controller;

import com.licitaciones.sistema.entity.Auditoria;
import com.licitaciones.sistema.service.AuditoriaService;
import jakarta.persistence.criteria.Predicate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.InputStreamResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@CrossOrigin(origins = "http://localhost:4200", maxAge = 3600)
@RestController
@RequestMapping("/api/auditoria")
@PreAuthorize("hasAnyRole('ADMINISTRADOR', 'AUDITOR', 'ADMIN', 'SUPER_ADMIN', 'AUTORIDAD')")
public class AuditoriaController {

    @Autowired
    private AuditoriaService auditoriaService;

    @GetMapping
    public ResponseEntity<Page<Auditoria>> getAuditorias(
            @RequestParam(required = false) String term,
            @RequestParam(required = false) String modulo,
            @RequestParam(required = false) String accion,
            @RequestParam(required = false) String usuario,
            @RequestParam(required = false) String fechaInicio,
            @RequestParam(required = false) String fechaFin,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "fecha,desc") String[] sort) {

        String sortProp = "fecha";
        Sort.Direction direction = Sort.Direction.DESC;
        if (sort != null && sort.length > 0) {
            String s = sort[0];
            if (s.contains(",")) {
                String[] parts = s.split(",");
                sortProp = parts[0];
                if (parts.length > 1 && parts[1].equalsIgnoreCase("asc")) {
                    direction = Sort.Direction.ASC;
                }
            } else {
                sortProp = s;
                if (sort.length > 1 && sort[1].equalsIgnoreCase("asc")) {
                    direction = Sort.Direction.ASC;
                }
            }
        }
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortProp));

        Specification<Auditoria> spec = buildSpecification(term, modulo, accion, usuario, fechaInicio, fechaFin);
        return ResponseEntity.ok(auditoriaService.buscarAuditorias(spec, pageable));
    }

    @GetMapping("/export/excel")
    public ResponseEntity<InputStreamResource> exportExcel(
            @RequestParam(required = false) String term,
            @RequestParam(required = false) String modulo,
            @RequestParam(required = false) String accion,
            @RequestParam(required = false) String usuario,
            @RequestParam(required = false) String fechaInicio,
            @RequestParam(required = false) String fechaFin) throws IOException {

        Specification<Auditoria> spec = buildSpecification(term, modulo, accion, usuario, fechaInicio, fechaFin);
        List<Auditoria> auditorias = auditoriaService.buscarTodas(spec);
        ByteArrayInputStream in = auditoriaService.exportToExcel(auditorias);

        HttpHeaders headers = new HttpHeaders();
        headers.add("Content-Disposition", "attachment; filename=auditoria.xlsx");

        return ResponseEntity
                .ok()
                .headers(headers)
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(new InputStreamResource(in));
    }

    @GetMapping("/export/pdf")
    public ResponseEntity<InputStreamResource> exportPdf(
            @RequestParam(required = false) String term,
            @RequestParam(required = false) String modulo,
            @RequestParam(required = false) String accion,
            @RequestParam(required = false) String usuario,
            @RequestParam(required = false) String fechaInicio,
            @RequestParam(required = false) String fechaFin) {

        Specification<Auditoria> spec = buildSpecification(term, modulo, accion, usuario, fechaInicio, fechaFin);
        List<Auditoria> auditorias = auditoriaService.buscarTodas(spec);
        ByteArrayInputStream in = auditoriaService.exportToPdf(auditorias);

        HttpHeaders headers = new HttpHeaders();
        headers.add("Content-Disposition", "attachment; filename=auditoria.pdf");

        return ResponseEntity
                .ok()
                .headers(headers)
                .contentType(MediaType.APPLICATION_PDF)
                .body(new InputStreamResource(in));
    }

    private Specification<Auditoria> buildSpecification(String term, String modulo, String accion, String usuario, String fechaInicio, String fechaFin) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (term != null && !term.isEmpty()) {
                String search = "%" + term.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("username")), search),
                        cb.like(cb.lower(root.get("descripcion")), search),
                        cb.like(cb.lower(root.get("accion")), search),
                        cb.like(cb.lower(root.get("modulo")), search)
                ));
            }

            if (modulo != null && !modulo.isEmpty()) {
                predicates.add(cb.equal(root.get("modulo"), modulo));
            }

            if (accion != null && !accion.isEmpty()) {
                predicates.add(cb.equal(root.get("accion"), accion));
            }

            if (usuario != null && !usuario.isEmpty()) {
                predicates.add(cb.equal(root.get("username"), usuario));
            }

            if (fechaInicio != null && !fechaInicio.isEmpty()) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("fecha"), LocalDateTime.parse(fechaInicio)));
            }

            if (fechaFin != null && !fechaFin.isEmpty()) {
                predicates.add(cb.lessThanOrEqualTo(root.get("fecha"), LocalDateTime.parse(fechaFin)));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
