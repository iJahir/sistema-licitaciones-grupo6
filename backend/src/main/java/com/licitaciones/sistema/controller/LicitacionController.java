package com.licitaciones.sistema.controller;

import com.licitaciones.sistema.entity.Licitacion;
import com.licitaciones.sistema.entity.LicitacionHito;
import com.licitaciones.sistema.entity.LicitacionHistorial;
import com.licitaciones.sistema.service.LicitacionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.licitaciones.sistema.entity.Usuario;
import com.licitaciones.sistema.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import com.licitaciones.sistema.service.ZipService;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/licitaciones")
public class LicitacionController {

    @Autowired
    private LicitacionService licitacionService;

    @Autowired
    private ZipService zipService;

    @Value("${app.upload.dir}")
    private String uploadDir;

    @Autowired
    private UsuarioRepository userRepository;

    @Autowired
    private com.licitaciones.sistema.service.ContratoService contratoService;

    @Autowired
    private com.licitaciones.sistema.service.AuditoriaService auditoriaService;

    @Autowired
    private com.licitaciones.sistema.service.EvaluacionService evaluacionService;

    @GetMapping
    public ResponseEntity<Page<Licitacion>> getAll(
            @RequestParam(defaultValue = "") String search,
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) String area,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id,desc") String[] sort,
            Authentication authentication) {
        String sortProp = "id";
        org.springframework.data.domain.Sort.Direction direction = org.springframework.data.domain.Sort.Direction.DESC;
        if (sort != null && sort.length > 0) {
            String s = sort[0];
            if (s.contains(",")) {
                String[] parts = s.split(",");
                sortProp = parts[0];
                if (parts.length > 1 && parts[1].equalsIgnoreCase("asc")) {
                    direction = org.springframework.data.domain.Sort.Direction.ASC;
                }
            } else {
                sortProp = s;
                if (sort.length > 1 && sort[1].equalsIgnoreCase("asc")) {
                    direction = org.springframework.data.domain.Sort.Direction.ASC;
                }
            }
        }
        Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size, 
            org.springframework.data.domain.Sort.by(direction, sortProp));
            
        Usuario currentUser = null;
        if (authentication != null && authentication.isAuthenticated() && !authentication.getPrincipal().equals("anonymousUser")) {
            currentUser = userRepository.findByUsername(authentication.getName()).orElse(null);
        }
        
        Page<Licitacion> result = licitacionService.search(search, estado, area, pageable, currentUser);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Licitacion> getById(@PathVariable Long id) {
        return licitacionService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping(consumes = { MediaType.MULTIPART_FORM_DATA_VALUE })
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GESTOR_LICITACIONES','ADMINISTRADOR','AUTORIDAD','AREA_SOLICITANTE')")
    public ResponseEntity<?> create(
            @RequestPart("licitacion") String licitacionJson,
            @RequestPart(value = "files", required = false) MultipartFile[] files,
            Authentication authentication) throws IOException {
        
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.findAndRegisterModules(); // Para manejar LocalDateTime
        Licitacion licitacion = objectMapper.readValue(licitacionJson, Licitacion.class);

        // Set creator
        String username = authentication.getName();
        Usuario user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        licitacion.setCreadoPor(user);

        Licitacion saved = licitacionService.saveWithFiles(licitacion, files);
        auditoriaService.registrarAccion("CREAR_LICITACION", "LICITACIONES", "Se ha creado la licitación: " + saved.getTitulo());
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GESTOR_LICITACIONES','ADMINISTRADOR','AUTORIDAD','AREA_SOLICITANTE')")
    public ResponseEntity<Licitacion> update(@PathVariable Long id, @RequestBody Licitacion licitacionDetails) throws IOException {
        licitacionDetails.setId(id);
        // Usar la lógica unificada de procesamiento que incluye auditoría y bypass
        Licitacion updated = licitacionService.procesarGuardadoCompleto(licitacionDetails, null);
        auditoriaService.registrarAccion("EDITAR_LICITACION", "LICITACIONES", "Se ha editado la licitación: " + updated.getTitulo());
        return ResponseEntity.ok(updated);
    }

    @PutMapping("/{id}/estado")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GESTOR_LICITACIONES','ADMINISTRADOR','AUTORIDAD','AREA_SOLICITANTE')")
    public ResponseEntity<?> cambiarEstado(
            @PathVariable Long id, 
            @RequestBody Map<String, String> body,
            Authentication authentication) {
        
        String nuevoEstadoStr = body.get("estado");
        com.licitaciones.sistema.entity.EstadoLicitacion nuevoEstado = com.licitaciones.sistema.entity.EstadoLicitacion.valueOf(nuevoEstadoStr);
        
        Usuario user = userRepository.findByUsername(authentication.getName()).orElseThrow();
        licitacionService.cambiarEstado(id, nuevoEstado, user);
        auditoriaService.registrarAccion("CAMBIO_ESTADO", "LICITACIONES", "Se ha cambiado el estado de la licitación con ID: " + id + " a " + nuevoEstadoStr);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GESTOR_LICITACIONES','ADMINISTRADOR','AUTORIDAD')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        licitacionService.deleteById(id);
        auditoriaService.registrarAccion("ELIMINAR_LICITACION", "LICITACIONES", "Se ha eliminado (lógicamente) la licitación con ID: " + id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/cancelar")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GESTOR_LICITACIONES','ADMINISTRADOR','AUTORIDAD','AREA_SOLICITANTE')")
    public ResponseEntity<?> cancelar(
            @PathVariable Long id, 
            @RequestBody Map<String, String> body,
            Authentication authentication) {
        
        String motivo = body.get("motivo");
        if (motivo == null || motivo.isBlank()) {
            return ResponseEntity.badRequest().body("El motivo es obligatorio.");
        }

        Usuario user = userRepository.findByUsername(authentication.getName()).orElseThrow();
        licitacionService.cancelar(id, motivo, user);
        auditoriaService.registrarAccion("CANCELAR_LICITACION", "LICITACIONES", "Se ha cancelado la licitación con ID: " + id + " por motivo: " + motivo);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/hitos")
    public ResponseEntity<List<LicitacionHito>> getHitos(@PathVariable Long id) {
        return licitacionService.findById(id)
                .map(l -> ResponseEntity.ok(l.getHitos()))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/historial")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GESTOR_LICITACIONES','ADMINISTRADOR','AUTORIDAD')")
    public ResponseEntity<List<LicitacionHistorial>> getHistorial(@PathVariable Long id) {
        return licitacionService.findById(id)
                .map(l -> ResponseEntity.ok(l.getHistorial()))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/zip")
    public ResponseEntity<byte[]> downloadZip(@PathVariable Long id) throws IOException {
        Licitacion licitacion = licitacionService.findById(id)
                .orElseThrow(() -> new RuntimeException("Licitación no encontrada"));

        Map<String, String> filesToZip = new HashMap<>();
        // Note: Make sure DocumentoLicitacion is imported or use full path
        for (com.licitaciones.sistema.entity.DocumentoLicitacion doc : licitacion.getDocumentos()) {
            String localPath = getLocalPath(doc.getRutaArchivo());
            filesToZip.put(doc.getNombreArchivo(), localPath);
        }

        byte[] zipContent = zipService.createZip(filesToZip);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"LIC-" + id + ".zip\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(zipContent);
    }

    @GetMapping("/{id}/propuestas/zip")
    public ResponseEntity<byte[]> downloadPropuestasZip(@PathVariable Long id) throws IOException {
        byte[] zipContent = evaluacionService.downloadAllProposalsZip(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"LIC-" + id + "-propuestas.zip\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(zipContent);
    }

    @GetMapping("/{id}/ranking")
    public ResponseEntity<List<com.licitaciones.sistema.entity.Propuesta>> getRanking(@PathVariable Long id, Authentication authentication) {
        Usuario user = userRepository.findByUsername(authentication.getName()).orElse(null);
        List<com.licitaciones.sistema.entity.Propuesta> ranking = licitacionService.getRanking(id);
        if (user != null && user.isProveedor()) {
            return ResponseEntity.ok(ranking.stream()
                .filter(p -> p.getUsuario() != null && p.getUsuario().getId().equals(user.getId()))
                .collect(java.util.stream.Collectors.toList()));
        }
        return ResponseEntity.ok(ranking);
    }

    @PostMapping("/{id}/aprobar-resultados")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'AUTORIDAD', 'GESTOR_LICITACIONES', 'AUDITOR', 'SUPER_ADMIN')")
    public ResponseEntity<?> aprobarResultados(@PathVariable Long id, Authentication authentication) {
        Usuario user = userRepository.findByUsername(authentication.getName()).orElseThrow();
        licitacionService.aprobarResultados(id, user);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/adjudicar/{propuestaId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GESTOR_LICITACIONES','ADMINISTRADOR','AUTORIDAD','AREA_SOLICITANTE')")
    public ResponseEntity<?> adjudicar(
            @PathVariable Long id, 
            @PathVariable Long propuestaId,
            Authentication authentication) {
        Usuario user = userRepository.findByUsername(authentication.getName()).orElseThrow();
        licitacionService.adjudicar(id, propuestaId, user);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/rechazar-adjudicacion/{propuestaId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GESTOR_LICITACIONES','ADMINISTRADOR','AUTORIDAD','AREA_SOLICITANTE')")
    public ResponseEntity<?> rechazarAdjudicacion(
            @PathVariable Long id, 
            @PathVariable Long propuestaId,
            @RequestParam(value = "motivo", required = false, defaultValue = "Rechazado por el comité de adjudicaciones") String motivo,
            Authentication authentication) {
        Usuario user = userRepository.findByUsername(authentication.getName()).orElseThrow();
        licitacionService.rechazarAdjudicacion(id, propuestaId, user, motivo);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/participantes")
    public ResponseEntity<List<com.licitaciones.sistema.entity.Participante>> getParticipantes(@PathVariable Long id) {
        return ResponseEntity.ok(licitacionService.findById(id)
                .map(l -> l.getParticipantes())
                .orElse(new java.util.ArrayList<>()));
    }

    private String getLocalPath(String fileUrl) {
        String prefix = "http://localhost:8080/api/files/";
        if (fileUrl != null && fileUrl.startsWith(prefix)) {
            String relative = fileUrl.substring(prefix.length());
            return java.nio.file.Paths.get(uploadDir).resolve(relative).toString();
        }
        return fileUrl;
    }
}
