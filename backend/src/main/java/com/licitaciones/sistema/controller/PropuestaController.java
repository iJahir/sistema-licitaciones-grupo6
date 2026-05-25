package com.licitaciones.sistema.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.licitaciones.sistema.entity.Propuesta;
import com.licitaciones.sistema.entity.Usuario;
import com.licitaciones.sistema.service.PropuestaService;
import com.licitaciones.sistema.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

import com.licitaciones.sistema.service.AuditoriaService;

@RestController
@RequestMapping("/api/propuestas")
public class PropuestaController {

    @Autowired
    private PropuestaService propuestaService;

    @Autowired
    private UsuarioRepository userRepository;

    @Autowired
    private AuditoriaService auditoriaService;

    @GetMapping
    @PreAuthorize("hasRole('ADMINISTRADOR') or hasRole('SUPER_ADMIN') or hasRole('GESTOR_LICITACIONES') or hasRole('AUDITOR') or hasRole('OBSERVADOR') or hasAuthority('ROLE_EVALUADOR') or hasAuthority('ROLE_EVALUADOR_GENERAL') or hasAuthority('ROLE_EVALUADOR_FINANCIERO') or hasAuthority('ROLE_EVALUADOR_TECNICO') or hasAuthority('ROLE_EVALUADOR_LEGAL') or hasRole('AREA_SOLICITANTE') or hasRole('PROVEEDOR') or hasRole('AUTORIDAD')")
    public List<Propuesta> getAll(Authentication authentication) {
        Usuario user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        
        boolean isGlobalView = user.isAdmin() || user.isAuditor() || user.isObservador() || user.isAutoridad();
        
        if (isGlobalView) {
            return propuestaService.findAllConEvaluadores();
        }

        if (user.isAreaSolicitante()) {
            return propuestaService.findAllConEvaluadores().stream()
                    .filter(p -> p.getLicitacion() != null && p.getLicitacion().getCreadoPor() != null && p.getLicitacion().getCreadoPor().getId().equals(user.getId()))
                    .collect(java.util.stream.Collectors.toList());
        }

        if (user.isProveedor()) {
            return propuestaService.findByUsuario(user);
        }

        boolean isEvaluator = user.getRoles().stream()
                .anyMatch(r -> r.getName().name().contains("EVALUADOR"));
        
        if (isEvaluator) {
            return propuestaService.findAsignadasAEvaluador(user.getId());
        }

        return java.util.Collections.emptyList();
    }

    @GetMapping("/asignadas")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GESTOR_LICITACIONES','ADMINISTRADOR','AUTORIDAD') or hasAuthority('ROLE_EVALUADOR') or hasAuthority('ROLE_EVALUADOR_GENERAL') or hasAuthority('ROLE_EVALUADOR_FINANCIERO') or hasAuthority('ROLE_EVALUADOR_TECNICO') or hasAuthority('ROLE_EVALUADOR_LEGAL')")
    public ResponseEntity<List<Propuesta>> getAsignadas(Authentication authentication) {
        Usuario user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        
        if (user.isAdmin()) {
            return ResponseEntity.ok(propuestaService.findAllConEvaluadores());
        }
        return ResponseEntity.ok(propuestaService.findAsignadasAEvaluador(user.getId()));
    }

    @GetMapping("/mis-propuestas")
    @PreAuthorize("hasRole('PROVEEDOR') or hasRole('ADMINISTRADOR')")
    public List<Propuesta> getMyPropuestas(Authentication authentication) {
        Usuario user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        return propuestaService.findByUsuario(user);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Propuesta> getById(@PathVariable Long id, Authentication authentication) {
        if (authentication != null && authentication.isAuthenticated() && !authentication.getPrincipal().equals("anonymousUser")) {
            Usuario user = userRepository.findByUsername(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
            
            boolean isAdminOrAuditor = user.isAdmin() || user.isAuditor() || user.isObservador() || user.isAreaSolicitante() || user.isAutoridad();
            
            if (!isAdminOrAuditor) {
                boolean isEvaluator = user.getRoles().stream()
                        .anyMatch(r -> r.getName().name().contains("EVALUADOR"));
                
                if (isEvaluator) {
                    boolean isAssigned = propuestaService.isEvaluatorAssigned(id, user.getId());
                    if (!isAssigned) {
                        return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();
                    }
                }
            }
        }
        return propuestaService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/evaluadores/{evaluadorId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GESTOR_LICITACIONES','ADMINISTRADOR','AUTORIDAD')")
    public ResponseEntity<?> asignarEvaluador(@PathVariable Long id, @PathVariable Long evaluadorId) {
        return ResponseEntity.ok(propuestaService.asignarEvaluador(id, evaluadorId));
    }

    @Autowired
    private com.licitaciones.sistema.service.UsuarioService usuarioService;

    @GetMapping("/evaluadores/disponibles")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GESTOR_LICITACIONES','ADMINISTRADOR','AUTORIDAD')")
    public ResponseEntity<List<com.licitaciones.sistema.dto.UsuarioDTO>> getEvaluadoresDisponibles() {
        return ResponseEntity.ok(usuarioService.getEvaluadores());
    }

    @GetMapping("/{id}/sugerir-evaluadores")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GESTOR_LICITACIONES','ADMINISTRADOR','AUTORIDAD')")
    public ResponseEntity<List<java.util.Map<String, Object>>> sugerirEvaluadores(@PathVariable Long id) {
        return ResponseEntity.ok(propuestaService.sugerirEvaluadores(id));
    }

    @PostMapping("/{id}/evaluadores")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GESTOR_LICITACIONES','ADMINISTRADOR','AUTORIDAD')")
    public ResponseEntity<?> guardarAsignacionEvaluadores(
            @PathVariable Long id, 
            @RequestBody List<java.util.Map<String, Object>> evaluadoresPayload,
            Authentication authentication) {
        propuestaService.guardarAsignacionEvaluadores(id, evaluadoresPayload, authentication.getName());
        return ResponseEntity.ok().build();
    }


    @GetMapping("/licitacion/{licitacionId}")
    public List<Propuesta> getByLicitacion(@PathVariable Long licitacionId) {
        return propuestaService.findByLicitacion(licitacionId);
    }

    @GetMapping("/licitacion/{licitacionId}/mia")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Propuesta> getMiPropuesta(@PathVariable Long licitacionId, Authentication authentication) {
        Usuario user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        return propuestaService.findByLicitacionAndUsuario(licitacionId, user)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @PostMapping(consumes = { MediaType.MULTIPART_FORM_DATA_VALUE })
    @PreAuthorize("hasRole('PROVEEDOR') or hasRole('ADMINISTRADOR')")
    public ResponseEntity<?> create(
            @RequestPart("propuesta") String propuestaJson,
            @RequestPart(value = "files", required = false) MultipartFile[] files,
            Authentication authentication) throws IOException {
        
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.findAndRegisterModules();
        Propuesta propuesta = objectMapper.readValue(propuestaJson, Propuesta.class);

        Usuario user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        propuesta.setUsuario(user);

        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMINISTRADOR"));
        
        Propuesta saved = propuestaService.saveWithFiles(propuesta, files, isAdmin);
        auditoriaService.registrarAccion("CREAR_PROPUESTA", "PROPUESTAS", 
                "Se ha registrado la propuesta para la licitación ID: " + saved.getLicitacion().getId() + " por: " + user.getUsername());
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('PROVEEDOR') or hasRole('ADMINISTRADOR')")
    public ResponseEntity<?> update(
            @PathVariable Long id,
            @RequestPart("propuesta") String propuestaJson,
            @RequestPart(value = "files", required = false) MultipartFile[] files,
            Authentication authentication) throws IOException {
        
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.findAndRegisterModules();
        Propuesta updatedPropuesta = objectMapper.readValue(propuestaJson, Propuesta.class);
        
        return propuestaService.findById(id)
                .map(existing -> {
                    existing.setNombre(updatedPropuesta.getNombre());
                    existing.setDescripcion(updatedPropuesta.getDescripcion());
                    existing.setMontoOfertado(updatedPropuesta.getMontoOfertado());
                    existing.setTiempoEntregaDias(updatedPropuesta.getTiempoEntregaDias());
                    existing.setEstado(updatedPropuesta.getEstado());
                    existing.setDeclaracionVeracidad(updatedPropuesta.isDeclaracionVeracidad());
                    existing.setAceptacionBases(updatedPropuesta.isAceptacionBases());
                    existing.setNoConflictoInteres(updatedPropuesta.isNoConflictoInteres());
                    
                    try {
                        boolean isAdmin = authentication.getAuthorities().stream()
                                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMINISTRADOR"));
                        Propuesta saved = propuestaService.saveWithFiles(existing, files, isAdmin);
                        auditoriaService.registrarAccion("EDITAR_PROPUESTA", "PROPUESTAS", 
                                "Se ha editado la propuesta ID: " + id + " por: " + authentication.getName());
                        return ResponseEntity.ok(saved);
                    } catch (IOException e) {
                        return ResponseEntity.internalServerError().build();
                    }
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/historial")
    public ResponseEntity<List<?>> getHistory(@PathVariable Long id) {
        return ResponseEntity.ok(propuestaService.getHistory(id));
    }

    @PutMapping("/{id}/validar")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GESTOR_LICITACIONES','ADMINISTRADOR','AUTORIDAD','AUDITOR')")
    public ResponseEntity<Propuesta> validar(@PathVariable Long id) {
        Propuesta p = propuestaService.validarPropuesta(id);
        auditoriaService.registrarAccion("VALIDAR_PROPUESTA", "PROPUESTAS", 
                "Se ha Validado la propuesta ID: " + id);
        return ResponseEntity.ok(p);
    }

    @PutMapping("/{id}/rechazar")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GESTOR_LICITACIONES','ADMINISTRADOR','AUTORIDAD','AUDITOR')")
    public ResponseEntity<Propuesta> rechazar(@PathVariable Long id, @RequestBody java.util.Map<String, String> payload) {
        String motivo = payload.get("motivo");
        Propuesta p = propuestaService.rechazarPropuesta(id, motivo);
        auditoriaService.registrarAccion("RECHAZAR_PROPUESTA", "PROPUESTAS", 
                "Se ha Rechazado la propuesta ID: " + id + " por motivo: " + motivo);
        return ResponseEntity.ok(p);
    }

    @PutMapping("/{id}/incompleta")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GESTOR_LICITACIONES','ADMINISTRADOR','AUTORIDAD','AUDITOR')")
    public ResponseEntity<Propuesta> incompleta(@PathVariable Long id, @RequestBody java.util.Map<String, String> payload) {
        String motivo = payload.get("motivo");
        Propuesta p = propuestaService.marcarIncompleta(id, motivo);
        auditoriaService.registrarAccion("MARCAR_INCOMPLETA_PROPUESTA", "PROPUESTAS", 
                "Se ha marcado como Incompleta la propuesta ID: " + id + " por motivo: " + motivo);
        return ResponseEntity.ok(p);
    }
}
