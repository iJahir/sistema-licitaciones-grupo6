package com.licitaciones.sistema.controller;

import com.licitaciones.sistema.entity.Proveedor;
import com.licitaciones.sistema.service.ProveedorService;
import com.licitaciones.sistema.service.AuditoriaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/proveedores")
public class ProveedorController {

    @Autowired
    private ProveedorService proveedorService;

    @Autowired
    private AuditoriaService auditoriaService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'AUTORIDAD', 'EVALUADOR')")
    public ResponseEntity<Page<Proveedor>> getAll(
            @RequestParam(required = false) String term,
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) String categoria,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        return ResponseEntity.ok(proveedorService.getAll(term, estado, categoria, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'AUTORIDAD', 'EVALUADOR')")
    public ResponseEntity<Proveedor> getById(@PathVariable Long id) {
        return ResponseEntity.ok(proveedorService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<Proveedor> create(@RequestBody Proveedor proveedor) {
        Proveedor created = proveedorService.save(proveedor);
        auditoriaService.registrarAccion("CREAR_PROVEEDOR", "PROVEEDORES", "Se ha creado el proveedor: " + created.getRazonSocial());
        return ResponseEntity.ok(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<Proveedor> update(@PathVariable Long id, @RequestBody Proveedor proveedor) {
        Proveedor existing = proveedorService.getById(id);
        proveedor.setId(id);
        Proveedor updated = proveedorService.save(proveedor);
        auditoriaService.registrarAccion("EDITAR_PROVEEDOR", "PROVEEDORES", "Se ha editado el proveedor: " + updated.getRazonSocial());
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        Proveedor existing = proveedorService.getById(id);
        proveedorService.delete(id);
        auditoriaService.registrarAccion("ELIMINAR_PROVEEDOR", "PROVEEDORES", "Se ha eliminado el proveedor: " + existing.getRazonSocial());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'AUTORIDAD', 'EVALUADOR')")
    public ResponseEntity<Map<String, Object>> getStats() {
        Map<String, Object> stats = new HashMap<>();
        long total = proveedorService.countTotal();
        long activos = proveedorService.countByEstado("Activo");
        long enProceso = proveedorService.countByEstado("En Proceso");
        long inactivos = proveedorService.countByEstado("Inactivo");
        
        stats.put("total", total);
        stats.put("activos", activos);
        stats.put("enProceso", enProceso);
        stats.put("inactivos", inactivos);
        
        Map<String, Long> pStats = proveedorService.getParticipationStats();
        stats.put("participaciones", pStats.get("total"));
        stats.put("activas", pStats.get("activas"));
        stats.put("categorias", proveedorService.getCategoryStats());
        
        return ResponseEntity.ok(stats);
    }
}
