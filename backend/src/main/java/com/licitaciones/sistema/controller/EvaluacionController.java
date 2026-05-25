package com.licitaciones.sistema.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.licitaciones.sistema.entity.Evaluacion;
import com.licitaciones.sistema.entity.Licitacion;
import com.licitaciones.sistema.entity.Propuesta;
import com.licitaciones.sistema.entity.Usuario;
import com.licitaciones.sistema.repository.UsuarioRepository;
import com.licitaciones.sistema.service.EvaluacionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import java.io.ByteArrayInputStream;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/evaluaciones")
@CrossOrigin(origins = "*", maxAge = 3600)
public class EvaluacionController {

    @Autowired
    private EvaluacionService evaluacionService;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private com.licitaciones.sistema.service.AuditoriaService auditoriaService;

    @Autowired
    private com.licitaciones.sistema.repository.ReporteDescargaRepository descargaRepository;

    @GetMapping("/mis-evaluaciones")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GESTOR_LICITACIONES','ADMINISTRADOR','AUTORIDAD','AREA_SOLICITANTE') or hasAuthority('ROLE_EVALUADOR') or hasAuthority('ROLE_EVALUADOR_GENERAL') or hasAuthority('ROLE_EVALUADOR_FINANCIERO') or hasAuthority('ROLE_EVALUADOR_TECNICO') or hasAuthority('ROLE_EVALUADOR_LEGAL')")
    public ResponseEntity<?> getMisEvaluacionesPendientes() {
        return ResponseEntity.ok(evaluacionService.getPropuestasPendientes());
    }

    @GetMapping("/mis-asignaciones")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GESTOR_LICITACIONES','ADMINISTRADOR','AUTORIDAD','AREA_SOLICITANTE') or hasAuthority('ROLE_EVALUADOR') or hasAuthority('ROLE_EVALUADOR_GENERAL') or hasAuthority('ROLE_EVALUADOR_FINANCIERO') or hasAuthority('ROLE_EVALUADOR_TECNICO') or hasAuthority('ROLE_EVALUADOR_LEGAL')")
    public ResponseEntity<?> getMisAsignaciones() {
        Usuario currentUser = getCurrentUser();
        if (isAdmin(currentUser)) {
            return ResponseEntity.ok(evaluacionService.getPropuestasPendientes());
        }
        return ResponseEntity.ok(evaluacionService.getMisAsignacionesDTO(currentUser.getId()));
    }

    @GetMapping("/ranking/{licitacionId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GESTOR_LICITACIONES','ADMINISTRADOR','AUTORIDAD','AREA_SOLICITANTE') or hasAuthority('ROLE_EVALUADOR') or hasAuthority('ROLE_EVALUADOR_GENERAL') or hasAuthority('ROLE_EVALUADOR_FINANCIERO') or hasAuthority('ROLE_EVALUADOR_TECNICO') or hasAuthority('ROLE_EVALUADOR_LEGAL') or hasRole('OBSERVADOR') or hasRole('PROVEEDOR')")
    public ResponseEntity<?> getRanking(@PathVariable Long licitacionId) {
        Usuario currentUser = getCurrentUser();
        boolean isAreaSolicitante = currentUser.getRoles().stream()
                .anyMatch(r -> r.getName() == com.licitaciones.sistema.entity.RoleName.ROLE_AREA_SOLICITANTE);
        if (isAreaSolicitante) {
            Licitacion lic = evaluacionService.getLicitacionForEvaluation(licitacionId).orElse(null);
            if (lic == null || lic.getCreadoPor() == null || !lic.getCreadoPor().getId().equals(currentUser.getId())) {
                return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();
            }
        }
        return ResponseEntity.ok(evaluacionService.getRanking(licitacionId));
    }

    @GetMapping("/{licitacionId}/propuestas")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GESTOR_LICITACIONES','ADMINISTRADOR','AUTORIDAD') or hasAuthority('ROLE_EVALUADOR') or hasAuthority('ROLE_EVALUADOR_GENERAL') or hasAuthority('ROLE_EVALUADOR_FINANCIERO') or hasAuthority('ROLE_EVALUADOR_TECNICO') or hasAuthority('ROLE_EVALUADOR_LEGAL')")
    public ResponseEntity<?> getPropuestas(@PathVariable Long licitacionId) {
        return ResponseEntity.ok(evaluacionService.getPropuestasByLicitacion(licitacionId));
    }

    @PostMapping(value = "/propuesta/{propuestaId}", consumes = {"multipart/form-data"})
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GESTOR_LICITACIONES','ADMINISTRADOR','AUTORIDAD') or hasAuthority('ROLE_EVALUADOR') or hasAuthority('ROLE_EVALUADOR_GENERAL') or hasAuthority('ROLE_EVALUADOR_FINANCIERO') or hasAuthority('ROLE_EVALUADOR_TECNICO') or hasAuthority('ROLE_EVALUADOR_LEGAL')")
    public ResponseEntity<?> saveEvaluacion(
            @PathVariable Long propuestaId,
            @RequestPart("evaluacion") String evaluacionJson,
            @RequestPart(value = "file", required = false) MultipartFile file) throws IOException {
        
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        Evaluacion evaluacion = mapper.readValue(evaluacionJson, Evaluacion.class);
        
        Object saved = evaluacionService.saveEvaluation(propuestaId, evaluacion, file);
        auditoriaService.registrarAccion("REGISTRAR_EVALUACION", "EVALUACIONES", "Se ha registrado la evaluación para la propuesta ID: " + propuestaId + " por " + getCurrentUser().getUsername());
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/propuesta/{propuestaId}/usuario/{usuarioId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GESTOR_LICITACIONES','ADMINISTRADOR','AUTORIDAD','PROVEEDOR') or hasAuthority('ROLE_EVALUADOR') or hasAuthority('ROLE_EVALUADOR_GENERAL') or hasAuthority('ROLE_EVALUADOR_FINANCIERO') or hasAuthority('ROLE_EVALUADOR_TECNICO') or hasAuthority('ROLE_EVALUADOR_LEGAL')")
    public ResponseEntity<?> getEvaluacion(@PathVariable Long propuestaId, @PathVariable Long usuarioId) {
        Usuario currentUser = getCurrentUser();
        if (currentUser.isProveedor()) {
            Propuesta prop = evaluacionService.getPropuestaParaEvaluar(propuestaId);
            if (prop == null || prop.getUsuario() == null || !prop.getUsuario().getId().equals(currentUser.getId())) {
                return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();
            }
        }
        Long targetUserId = (!isAdmin(currentUser) || usuarioId == 0) ? currentUser.getId() : usuarioId;
        return evaluacionService.getEvaluacionPorPropuestaYUsuario(propuestaId, targetUserId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GESTOR_LICITACIONES','ADMINISTRADOR','AUTORIDAD') or hasAuthority('ROLE_EVALUADOR') or hasAuthority('ROLE_EVALUADOR_GENERAL') or hasAuthority('ROLE_EVALUADOR_FINANCIERO') or hasAuthority('ROLE_EVALUADOR_TECNICO') or hasAuthority('ROLE_EVALUADOR_LEGAL')")
    public ResponseEntity<?> getLicitacionParaEvaluacion(@PathVariable Long id) {
        Licitacion licitacion = evaluacionService.getLicitacionForEvaluation(id)
                .orElseThrow(() -> new RuntimeException("Licitación no encontrada"));
        
        Usuario currentUser = getCurrentUser();
        java.util.Map<String, Object> response = new java.util.HashMap<>();
        response.put("licitacion", licitacion);
        
        evaluacionService.getMiEvaluacionDeLicitacion(id, currentUser.getId())
                .ifPresent(e -> response.put("evaluacion", e));
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/licitacion/{licitacionId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GESTOR_LICITACIONES','ADMINISTRADOR','AUTORIDAD','AREA_SOLICITANTE') or hasAuthority('ROLE_EVALUADOR') or hasAuthority('ROLE_EVALUADOR_GENERAL') or hasAuthority('ROLE_EVALUADOR_FINANCIERO') or hasAuthority('ROLE_EVALUADOR_TECNICO') or hasAuthority('ROLE_EVALUADOR_LEGAL') or hasRole('OBSERVADOR') or hasRole('PROVEEDOR')")
    public ResponseEntity<?> getEvaluacionesByLicitacion(@PathVariable Long licitacionId) {
        Usuario currentUser = getCurrentUser();
        List<Evaluacion> evals = evaluacionService.getEvaluacionesByLicitacion(licitacionId);
        if (!isAdmin(currentUser)) {
            boolean isAreaSolicitante = currentUser.getRoles().stream()
                .anyMatch(r -> r.getName().name().contains("AREA_SOLICITANTE"));
            if (isAreaSolicitante) {
                Licitacion lic = evaluacionService.getLicitacionForEvaluation(licitacionId).orElse(null);
                if (lic == null || lic.getCreadoPor() == null || !lic.getCreadoPor().getId().equals(currentUser.getId())) {
                    return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();
                }
            } else {
                Long areaId = currentUser.getArea() != null ? currentUser.getArea().getId() : null;
                evals = evals.stream()
                    .filter(e -> e.getEvaluador().getId().equals(currentUser.getId())
                            || (areaId != null && e.getEvaluador().getArea() != null && e.getEvaluador().getArea().getId().equals(areaId)))
                    .collect(java.util.stream.Collectors.toList());
            }
        }
        return ResponseEntity.ok(evals);
    }

    @GetMapping("/propuesta/{propuestaId}/actual")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GESTOR_LICITACIONES','ADMINISTRADOR','AUTORIDAD') or hasAuthority('ROLE_EVALUADOR') or hasAuthority('ROLE_EVALUADOR_GENERAL') or hasAuthority('ROLE_EVALUADOR_FINANCIERO') or hasAuthority('ROLE_EVALUADOR_TECNICO') or hasAuthority('ROLE_EVALUADOR_LEGAL')")
    public ResponseEntity<?> getMiEvaluacionDePropuesta(@PathVariable Long propuestaId) {
        Usuario currentUser = getCurrentUser();
        return evaluacionService.getEvaluacionPorPropuestaYUsuario(propuestaId, currentUser.getId())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @GetMapping("/propuesta/{propuestaId}/info")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GESTOR_LICITACIONES','ADMINISTRADOR','AUTORIDAD') or hasAuthority('ROLE_EVALUADOR') or hasAuthority('ROLE_EVALUADOR_GENERAL') or hasAuthority('ROLE_EVALUADOR_FINANCIERO') or hasAuthority('ROLE_EVALUADOR_TECNICO') or hasAuthority('ROLE_EVALUADOR_LEGAL')")
    public ResponseEntity<?> getPropuestaInfo(@PathVariable Long propuestaId) {
        return ResponseEntity.ok(evaluacionService.getPropuestaParaEvaluar(propuestaId));
    }

    @GetMapping("/propuesta/{propuestaId}/todas")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GESTOR_LICITACIONES','ADMINISTRADOR','AUTORIDAD','AREA_SOLICITANTE','PROVEEDOR') or hasAuthority('ROLE_EVALUADOR') or hasAuthority('ROLE_EVALUADOR_GENERAL') or hasAuthority('ROLE_EVALUADOR_FINANCIERO') or hasAuthority('ROLE_EVALUADOR_TECNICO') or hasAuthority('ROLE_EVALUADOR_LEGAL') or hasRole('OBSERVADOR')")
    public ResponseEntity<?> getTodasEvaluacionesDePropuesta(@PathVariable Long propuestaId) {
        Usuario currentUser = getCurrentUser();
        if (!isAdmin(currentUser)) {
            if (currentUser.isProveedor()) {
                Propuesta prop = evaluacionService.getPropuestaParaEvaluar(propuestaId);
                if (prop == null || prop.getUsuario() == null || !prop.getUsuario().getId().equals(currentUser.getId())) {
                    return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();
                }
            } else {
                boolean isAreaSolicitante = currentUser.getRoles().stream()
                    .anyMatch(r -> r.getName().name().contains("AREA_SOLICITANTE"));
                if (isAreaSolicitante) {
                    Propuesta prop = evaluacionService.getPropuestaParaEvaluar(propuestaId);
                    if (prop == null || prop.getLicitacion() == null || prop.getLicitacion().getCreadoPor() == null 
                            || !prop.getLicitacion().getCreadoPor().getId().equals(currentUser.getId())) {
                        return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();
                    }
                } else {
                    Long areaId = currentUser.getArea() != null ? currentUser.getArea().getId() : null;
                    List<Evaluacion> evals = evaluacionService.getEvaluacionesPorPropuesta(propuestaId);
                    List<Evaluacion> filtered = evals.stream()
                        .filter(e -> e.getEvaluador().getId().equals(currentUser.getId())
                                || (areaId != null && e.getEvaluador().getArea() != null && e.getEvaluador().getArea().getId().equals(areaId)))
                        .collect(java.util.stream.Collectors.toList());
                    return ResponseEntity.ok(filtered);
                }
            }
        }
        return ResponseEntity.ok(evaluacionService.getEvaluacionesPorPropuesta(propuestaId));
    }

    @PostMapping("/{licitacionId}/adjudicar")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GESTOR_LICITACIONES','ADMINISTRADOR','AUTORIDAD')")
    public ResponseEntity<?> adjudicar(@PathVariable Long licitacionId) {
        Object res = evaluacionService.adjudicarLicitacion(licitacionId);
        auditoriaService.registrarAccion("ADJUDICAR_LICITACION", "EVALUACIONES", "Se ha adjudicado la licitación con ID: " + licitacionId + " por " + getCurrentUser().getUsername());
        return ResponseEntity.ok(res);
    }

    @GetMapping("/propuesta/{propuestaId}/pdf/resumen")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GESTOR_LICITACIONES','ADMINISTRADOR','AUTORIDAD','PROVEEDOR') or hasAuthority('ROLE_EVALUADOR') or hasAuthority('ROLE_EVALUADOR_GENERAL') or hasAuthority('ROLE_EVALUADOR_FINANCIERO') or hasAuthority('ROLE_EVALUADOR_TECNICO') or hasAuthority('ROLE_EVALUADOR_LEGAL') or hasRole('OBSERVADOR')")
    public ResponseEntity<InputStreamResource> downloadResumenPdf(
            @PathVariable Long propuestaId,
            @RequestParam(value = "evaluadorId", required = false) Long evaluadorId) {
        Usuario currentUser = getCurrentUser();
        if (currentUser.isProveedor()) {
            Propuesta prop = evaluacionService.getPropuestaParaEvaluar(propuestaId);
            if (prop == null || prop.getUsuario() == null || !prop.getUsuario().getId().equals(currentUser.getId())) {
                return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();
            }
        }
        
        // Log download to database
        try {
            com.licitaciones.sistema.entity.ReporteDescarga descarga = com.licitaciones.sistema.entity.ReporteDescarga.builder()
                    .usuario(currentUser)
                    .username(currentUser.getUsername())
                    .userFullName(currentUser.getNombreCompleto())
                    .modulo("Evaluaciones")
                    .tipo("PDF")
                    .filtros("Resumen Evaluación - Propuesta ID: " + propuestaId + (evaluadorId != null ? ", Evaluador ID: " + evaluadorId : ""))
                    .fecha(java.time.LocalDateTime.now())
                    .build();
            descargaRepository.save(descarga);
        } catch (Exception e) {
            e.printStackTrace();
        }

        ByteArrayInputStream in = evaluacionService.exportResumenPdf(propuestaId, evaluadorId);
        HttpHeaders headers = new HttpHeaders();
        headers.add("Content-Disposition", "attachment; filename=resumen-evaluacion-" + propuestaId + ".pdf");
        
        return ResponseEntity.ok()
                .headers(headers)
                .contentType(MediaType.APPLICATION_PDF)
                .body(new InputStreamResource(in));
    }

    @GetMapping("/propuesta/{propuestaId}/pdf/constancia")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GESTOR_LICITACIONES','ADMINISTRADOR','AUTORIDAD') or hasAuthority('ROLE_EVALUADOR') or hasAuthority('ROLE_EVALUADOR_GENERAL') or hasAuthority('ROLE_EVALUADOR_FINANCIERO') or hasAuthority('ROLE_EVALUADOR_TECNICO') or hasAuthority('ROLE_EVALUADOR_LEGAL') or hasRole('OBSERVADOR') or hasRole('PROVEEDOR')")
    public ResponseEntity<InputStreamResource> downloadConstanciaPdf(@PathVariable Long propuestaId) {
        // Log download to database
        try {
            Usuario currentUser = getCurrentUser();
            com.licitaciones.sistema.entity.ReporteDescarga descarga = com.licitaciones.sistema.entity.ReporteDescarga.builder()
                    .usuario(currentUser)
                    .username(currentUser.getUsername())
                    .userFullName(currentUser.getNombreCompleto())
                    .modulo("Evaluaciones")
                    .tipo("PDF")
                    .filtros("Constancia Evaluación - Propuesta ID: " + propuestaId)
                    .fecha(java.time.LocalDateTime.now())
                    .build();
            descargaRepository.save(descarga);
        } catch (Exception e) {
            e.printStackTrace();
        }

        ByteArrayInputStream in = evaluacionService.exportConstanciaPdf(propuestaId);
        HttpHeaders headers = new HttpHeaders();
        headers.add("Content-Disposition", "attachment; filename=constancia-evaluacion-" + propuestaId + ".pdf");
        
        return ResponseEntity.ok()
                .headers(headers)
                .contentType(MediaType.APPLICATION_PDF)
                .body(new InputStreamResource(in));
    }

    @PostMapping("/propuesta/{propuestaId}/asignar/{evaluadorId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GESTOR_LICITACIONES','ADMINISTRADOR','AUTORIDAD')")
    public ResponseEntity<?> asignarEvaluador(@PathVariable Long propuestaId, @PathVariable Long evaluadorId) {
        Object res = evaluacionService.asignarEvaluadorAPropuesta(propuestaId, evaluadorId);
        auditoriaService.registrarAccion("ASIGNAR_EVALUADOR", "EVALUACIONES", "Se ha asignado el evaluador ID: " + evaluadorId + " a la propuesta ID: " + propuestaId);
        return ResponseEntity.ok(res);
    }

    @DeleteMapping("/propuesta/{propuestaId}/desasignar/{evaluadorId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GESTOR_LICITACIONES','ADMINISTRADOR','AUTORIDAD')")
    public ResponseEntity<?> desasignarEvaluador(@PathVariable Long propuestaId, @PathVariable Long evaluadorId) {
        evaluacionService.desasignarEvaluadorDePropuesta(propuestaId, evaluadorId);
        auditoriaService.registrarAccion("DESASIGNAR_EVALUADOR", "EVALUACIONES", "Se ha desasignado el evaluador ID: " + evaluadorId + " de la propuesta ID: " + propuestaId);
        return ResponseEntity.ok().build();
    }

    private Usuario getCurrentUser() {
        UserDetails userDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return usuarioRepository.findByUsername(userDetails.getUsername()).orElseThrow();
    }

    private boolean isAdmin(Usuario user) {
        return user.isAdmin() || user.isAutoridad();
    }
}
