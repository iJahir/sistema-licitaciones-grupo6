package com.licitaciones.sistema.controller;

import com.licitaciones.sistema.entity.Contrato;
import com.licitaciones.sistema.entity.Usuario;
import com.licitaciones.sistema.service.ContratoService;
import com.licitaciones.sistema.service.UsuarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import com.licitaciones.sistema.entity.RoleName;

@RestController
@RequestMapping("/api/contratos")
@CrossOrigin(origins = "*")
public class ContratoController {

    @Autowired
    private ContratoService contratoService;

    @Autowired
    private UsuarioService usuarioService;

    @Autowired
    private com.licitaciones.sistema.service.ContratoPdfService contratoPdfService;

    @Autowired
    private com.licitaciones.sistema.repository.ReporteDescargaRepository descargaRepository;

    @Autowired
    private com.licitaciones.sistema.service.AuditoriaService auditoriaService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'SUPER_ADMIN', 'GESTOR_LICITACIONES', 'AREA_SOLICITANTE', 'AUTORIDAD', 'OBSERVADOR', 'PROVEEDOR')")
    public List<Contrato> getAll() {
        Usuario currentUser = getCurrentUser();
        boolean isAdmin = currentUser.isAdmin() || currentUser.isAuditor() || currentUser.isObservador() || currentUser.isAutoridad();
        
        List<Contrato> all = contratoService.findAll();
        if (isAdmin) {
            return all;
        }
        
        boolean isAreaSolicitante = currentUser.getRoles().stream()
                .anyMatch(r -> r.getName() == RoleName.ROLE_AREA_SOLICITANTE);
        if (isAreaSolicitante) {
            return all.stream()
                    .filter(c -> c.getLicitacion() != null && c.getLicitacion().getCreadoPor() != null 
                            && c.getLicitacion().getCreadoPor().getId().equals(currentUser.getId()))
                    .collect(java.util.stream.Collectors.toList());
        }
        
        boolean isProveedor = currentUser.getRoles().stream()
                .anyMatch(r -> r.getName() == RoleName.ROLE_PROVEEDOR);
        if (isProveedor) {
            return all.stream()
                    .filter(c -> c.getPropuesta().getUsuario().getId().equals(currentUser.getId()))
                    .collect(java.util.stream.Collectors.toList());
        }
        
        return java.util.Collections.emptyList();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'SUPER_ADMIN', 'GESTOR_LICITACIONES', 'AREA_SOLICITANTE', 'AUTORIDAD', 'OBSERVADOR', 'PROVEEDOR')")
    public ResponseEntity<Contrato> getById(@PathVariable Long id) {
        Usuario currentUser = getCurrentUser();
        boolean isAdmin = currentUser.isAdmin() || currentUser.isAuditor() || currentUser.isObservador() || currentUser.isAutoridad();
        
        java.util.Optional<Contrato> contratoOpt = contratoService.findById(id);
        if (!contratoOpt.isPresent()) {
            return ResponseEntity.notFound().build();
        }
        Contrato contrato = contratoOpt.get();
        
        if (isAdmin) {
            return ResponseEntity.ok(contrato);
        }
        
        if (currentUser.isProveedor()) {
            if (contrato.getPropuesta() != null && contrato.getPropuesta().getUsuario() != null 
                    && contrato.getPropuesta().getUsuario().getId().equals(currentUser.getId())) {
                return ResponseEntity.ok(contrato);
            }
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();
        }
        
        if (currentUser.isAreaSolicitante()) {
            if (contrato.getLicitacion() != null && contrato.getLicitacion().getCreadoPor() != null 
                    && contrato.getLicitacion().getCreadoPor().getId().equals(currentUser.getId())) {
                return ResponseEntity.ok(contrato);
            }
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();
        }
        
        return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();
    }

    @GetMapping("/licitacion/{licitacionId}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'SUPER_ADMIN', 'GESTOR_LICITACIONES', 'AREA_SOLICITANTE', 'AUTORIDAD', 'OBSERVADOR', 'PROVEEDOR')")
    public ResponseEntity<Contrato> getByLicitacionId(@PathVariable Long licitacionId) {
        Usuario currentUser = getCurrentUser();
        boolean isAdmin = currentUser.isAdmin() || currentUser.isAuditor() || currentUser.isObservador() || currentUser.isAutoridad();
        
        java.util.Optional<Contrato> contratoOpt = contratoService.findByLicitacionId(licitacionId);
        if (!contratoOpt.isPresent()) {
            return ResponseEntity.notFound().build();
        }
        Contrato contrato = contratoOpt.get();
        
        if (isAdmin) {
            return ResponseEntity.ok(contrato);
        }
        
        if (currentUser.isProveedor()) {
            if (contrato.getPropuesta() != null && contrato.getPropuesta().getUsuario() != null 
                    && contrato.getPropuesta().getUsuario().getId().equals(currentUser.getId())) {
                return ResponseEntity.ok(contrato);
            }
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();
        }
        
        if (currentUser.isAreaSolicitante()) {
            if (contrato.getLicitacion() != null && contrato.getLicitacion().getCreadoPor() != null 
                    && contrato.getLicitacion().getCreadoPor().getId().equals(currentUser.getId())) {
                return ResponseEntity.ok(contrato);
            }
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();
        }
        
        return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();
    }

    @PostMapping("/licitacion/{licitacionId}")
    @PreAuthorize("hasRole('ADMINISTRADOR') or hasRole('AUTORIDAD')")
    public ResponseEntity<Contrato> crear(@PathVariable Long licitacionId, @RequestBody Contrato contrato) {
        Usuario currentUser = getCurrentUser();
        Contrato c = contratoService.crearContrato(licitacionId, contrato, currentUser);
        auditoriaService.registrarAccion("CREAR_CONTRATO", "CONTRATOS", "Se ha creado el contrato para la licitación ID: " + licitacionId + " por " + currentUser.getUsername());
        return ResponseEntity.ok(c);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'AUTORIDAD')")
    public ResponseEntity<Contrato> update(@PathVariable Long id, @RequestBody Contrato contrato) {
        Contrato c = contratoService.update(id, contrato);
        auditoriaService.registrarAccion("EDITAR_CONTRATO", "CONTRATOS", "Se ha editado el contrato con ID: " + id);
        return ResponseEntity.ok(c);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'AUTORIDAD')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        contratoService.deleteById(id);
        auditoriaService.registrarAccion("ELIMINAR_CONTRATO", "CONTRATOS", "Se ha eliminado el contrato con ID: " + id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/firmar-proveedor")
    @PreAuthorize("hasRole('PROVEEDOR')")
    public ResponseEntity<Contrato> firmarProveedor(@PathVariable Long id) {
        Usuario currentUser = getCurrentUser();
        Contrato c = contratoService.firmarProveedor(id, currentUser);
        auditoriaService.registrarAccion("FIRMAR_CONTRATO_PROVEEDOR", "CONTRATOS", "El proveedor " + currentUser.getUsername() + " ha firmado el contrato con ID: " + id);
        return ResponseEntity.ok(c);
    }

    @PostMapping("/{id}/firmar-autoridad")
    @PreAuthorize("hasRole('ADMINISTRADOR') or hasRole('AUTORIDAD')")
    public ResponseEntity<Contrato> firmarAutoridad(@PathVariable Long id) {
        Usuario currentUser = getCurrentUser();
        Contrato c = contratoService.firmarAutoridad(id, currentUser);
        auditoriaService.registrarAccion("FIRMAR_CONTRATO_AUTORIDAD", "CONTRATOS", "La autoridad/administrador " + currentUser.getUsername() + " ha firmado el contrato con ID: " + id);
        return ResponseEntity.ok(c);
    }

    @PostMapping("/{id}/validar-area")
    @PreAuthorize("hasRole('AREA_SOLICITANTE')")
    public ResponseEntity<Contrato> validarArea(@PathVariable Long id) {
        Usuario currentUser = getCurrentUser();
        Contrato c = contratoService.validarArea(id, currentUser);
        auditoriaService.registrarAccion("VALIDAR_CONTRATO_AREA", "CONTRATOS", "El área solicitante " + currentUser.getUsername() + " ha validado el contrato con ID: " + id);
        return ResponseEntity.ok(c);
    }

    @GetMapping("/mis-contratos")
    @PreAuthorize("hasRole('PROVEEDOR')")
    public ResponseEntity<List<Contrato>> getMisContratos() {
        Usuario currentUser = getCurrentUser();
        // Filtrar contratos donde el proveedor de la propuesta es el usuario actual
        List<Contrato> all = contratoService.findAll();
        List<Contrato> mine = all.stream()
                .filter(c -> c.getPropuesta().getUsuario().getId().equals(currentUser.getId()))
                .toList();
        return ResponseEntity.ok(mine);
    }

    @GetMapping("/{id}/pdf")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'SUPER_ADMIN', 'GESTOR_LICITACIONES', 'AREA_SOLICITANTE', 'AUTORIDAD', 'OBSERVADOR', 'PROVEEDOR')")
    public ResponseEntity<byte[]> getPdf(@PathVariable Long id) {
        java.util.Optional<Contrato> contratoOpt = contratoService.findById(id);
        if (!contratoOpt.isPresent()) {
            return ResponseEntity.notFound().build();
        }
        Contrato contrato = contratoOpt.get();
        
        // Log download to database
        try {
            Usuario currentUser = getCurrentUser();
            com.licitaciones.sistema.entity.ReporteDescarga descarga = com.licitaciones.sistema.entity.ReporteDescarga.builder()
                    .usuario(currentUser)
                    .username(currentUser.getUsername())
                    .userFullName(currentUser.getNombreCompleto())
                    .modulo("Contratos")
                    .tipo("PDF")
                    .filtros("Contrato Código: " + (contrato.getCodigo() != null ? contrato.getCodigo() : contrato.getId()))
                    .fecha(java.time.LocalDateTime.now())
                    .build();
            descargaRepository.save(descarga);
        } catch (Exception e) {
            e.printStackTrace();
        }
        
        byte[] pdfData = contratoPdfService.generarPdfContrato(contrato);
        String filename = "contrato_" + (contrato.getCodigo() != null ? contrato.getCodigo() : contrato.getId()) + ".pdf";
        
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.add(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename);
        
        return ResponseEntity.ok()
                .headers(headers)
                .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                .body(pdfData);
    }

    private Usuario getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return usuarioService.findByUsername(username).orElseThrow();
    }
}
