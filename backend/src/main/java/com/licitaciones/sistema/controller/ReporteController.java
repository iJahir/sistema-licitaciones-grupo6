package com.licitaciones.sistema.controller;

import com.licitaciones.sistema.dto.*;
import com.licitaciones.sistema.entity.EstadoLicitacion;
import com.licitaciones.sistema.service.ReporteService;
import com.licitaciones.sistema.service.ReporteExportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reportes")
@CrossOrigin(origins = "*", maxAge = 3600)
public class ReporteController {

    @Autowired
    private ReporteService reporteService;

    @Autowired
    private ReporteExportService exportService;

    @Autowired
    private com.licitaciones.sistema.repository.ReporteDescargaRepository descargaRepository;

    @Autowired
    private com.licitaciones.sistema.repository.UsuarioRepository usuarioRepository;

    @GetMapping("/licitaciones")
    @PreAuthorize("hasRole('ADMINISTRADOR') or hasRole('GESTOR_LICITACIONES') or hasRole('AUTORIDAD')")
    public ResponseEntity<ReporteLicitacionesDTO> getReporteLicitaciones(
            @RequestParam(required = false) Long areaId,
            @RequestParam(required = false) EstadoLicitacion estado,
            @RequestParam(required = false) String fechaInicio,
            @RequestParam(required = false) String fechaFin) {
        
        return ResponseEntity.ok(reporteService.getReporteLicitaciones(areaId, estado, fechaInicio, fechaFin));
    }

    @GetMapping("/propuestas")
    @PreAuthorize("hasRole('ADMINISTRADOR') or hasRole('GESTOR_LICITACIONES') or hasRole('AUTORIDAD')")
    public ResponseEntity<ReportePropuestasDTO> getReportePropuestas(
            @RequestParam(required = false) Long licitacionId,
            @RequestParam(required = false) String estado) {
        
        return ResponseEntity.ok(reporteService.getReportePropuestas(licitacionId, estado));
    }

    @GetMapping("/evaluaciones")
    @PreAuthorize("hasRole('ADMINISTRADOR') or hasRole('GESTOR_LICITACIONES') or hasRole('AUTORIDAD') or hasRole('EVALUADOR')")
    public ResponseEntity<ReporteEvaluacionesDTO> getReporteEvaluaciones(
            @RequestParam(required = false) Long evaluadorId) {
        
        return ResponseEntity.ok(reporteService.getReporteEvaluaciones(evaluadorId));
    }

    @GetMapping("/evaluaciones-performance")
    @PreAuthorize("hasRole('ADMINISTRADOR') or hasRole('GESTOR_LICITACIONES') or hasRole('AUTORIDAD')")
    public ResponseEntity<ReporteEvaluadoresDTO> getReporteEvaluadores() {
        return ResponseEntity.ok(reporteService.getReporteEvaluadores());
    }

    @GetMapping("/contratos")
    @PreAuthorize("hasRole('ADMINISTRADOR') or hasRole('GESTOR_LICITACIONES') or hasRole('AUTORIDAD')")
    public ResponseEntity<ReporteContratosDTO> getReporteContratos(
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) String fechaInicio,
            @RequestParam(required = false) String fechaFin) {
        
        return ResponseEntity.ok(reporteService.getReporteContratos(estado, fechaInicio, fechaFin));
    }

    @GetMapping("/adjudicaciones")
    @PreAuthorize("hasRole('ADMINISTRADOR') or hasRole('GESTOR_LICITACIONES') or hasRole('AUTORIDAD')")
    public ResponseEntity<ReporteAdjudicacionesDTO> getReporteAdjudicaciones(
            @RequestParam(required = false) Long areaId,
            @RequestParam(required = false) String fechaInicio,
            @RequestParam(required = false) String fechaFin) {
        
        return ResponseEntity.ok(reporteService.getReporteAdjudicaciones(areaId, fechaInicio, fechaFin));
    }

    @GetMapping("/financiero")
    @PreAuthorize("hasRole('ADMINISTRADOR') or hasRole('GESTOR_LICITACIONES') or hasRole('AUTORIDAD')")
    public ResponseEntity<ReporteFinancieroDTO> getReporteFinanciero() {
        return ResponseEntity.ok(reporteService.getReporteFinanciero());
    }

    @GetMapping("/auditoria")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<ReporteAuditoriaDTO> getReporteAuditoria(
            @RequestParam(required = false) String modulo,
            @RequestParam(required = false) String username,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {
        
        return ResponseEntity.ok(reporteService.getReporteAuditoria(modulo, username, page, size));
    }

    @GetMapping("/descargas")
    @PreAuthorize("hasRole('ADMINISTRADOR') or hasRole('GESTOR_LICITACIONES') or hasRole('AUTORIDAD')")
    public ResponseEntity<?> getDescargas() {
        return ResponseEntity.ok(descargaRepository.findRecentDescargas().stream().map(d -> {
            java.util.Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", d.getId());
            
            String nombre = "Reporte de " + d.getModulo();
            String icon = "fa-file-invoice";
            String iconColorClass = "blue";
            String badgeClass = "module-licitaciones";
            
            if ("licitaciones".equalsIgnoreCase(d.getModulo())) {
                nombre = "Resumen de Licitaciones";
                icon = "fa-chart-column";
                iconColorClass = "purple";
                badgeClass = "module-licitaciones";
            } else if ("propuestas".equalsIgnoreCase(d.getModulo())) {
                nombre = "Propuestas Recibidas";
                icon = "fa-file-invoice";
                iconColorClass = "green";
                badgeClass = "module-propuestas";
            } else if ("adjudicaciones".equalsIgnoreCase(d.getModulo())) {
                nombre = "Adjudicaciones por Periodo";
                icon = "fa-trophy";
                iconColorClass = "orange";
                badgeClass = "module-adjudicaciones";
            } else if ("financiero".equalsIgnoreCase(d.getModulo())) {
                nombre = "Análisis Financiero";
                icon = "fa-chart-pie";
                iconColorClass = "red";
                badgeClass = "module-financieros";
            } else if ("contratos".equalsIgnoreCase(d.getModulo())) {
                nombre = "Contratos por Estado";
                icon = "fa-file-contract";
                iconColorClass = "blue";
                badgeClass = "module-contratos";
            } else if ("evaluaciones".equalsIgnoreCase(d.getModulo())) {
                nombre = "Reporte de Evaluaciones";
                icon = "fa-scale-balanced";
                iconColorClass = "orange";
                badgeClass = "module-evaluaciones";
            } else if ("cronograma".equalsIgnoreCase(d.getModulo())) {
                nombre = "Cronograma de Licitaciones";
                icon = "fa-calendar-days";
                iconColorClass = "blue";
                badgeClass = "module-licitaciones";
            }

            map.put("nombre", nombre);
            map.put("modulo", d.getModulo());
            map.put("badgeClass", badgeClass);
            map.put("descripcion", "Generado por " + d.getUserFullName());
            map.put("formato", d.getTipo().toUpperCase());
            map.put("formatoClass", d.getTipo().toLowerCase());
            
            java.time.format.DateTimeFormatter dtf = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy, hh:mm a");
            map.put("fecha", d.getFecha().format(dtf));
            map.put("icon", icon);
            map.put("iconColorClass", iconColorClass);
            map.put("filtros", d.getFiltros());
            
            return map;
        }).collect(java.util.stream.Collectors.toList()));
    }

    @GetMapping("/{tipoReporte}/exportar/{formato}")
    @PreAuthorize("hasRole('ADMINISTRADOR') or hasRole('GESTOR_LICITACIONES') or hasRole('AUTORIDAD')")
    public ResponseEntity<byte[]> exportarReporte(
            @PathVariable String tipoReporte,
            @PathVariable String formato,
            @RequestParam(required = false) Long areaId,
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) String fechaInicio,
            @RequestParam(required = false) String fechaFin,
            @RequestParam(required = false) Long licitacionId,
            @RequestParam(required = false) Long evaluadorId) {

        // Log download to database
        try {
            org.springframework.security.core.Authentication authentication = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            String username = "Sistema/Anon";
            String fullName = "Usuario Anónimo";
            com.licitaciones.sistema.entity.Usuario user = null;
            if (authentication != null && authentication.isAuthenticated() && !authentication.getPrincipal().equals("anonymousUser")) {
                username = authentication.getName();
                user = usuarioRepository.findByUsername(username).orElse(null);
                if (user != null) {
                    fullName = user.getNombreCompleto();
                }
            }
            
            StringBuilder filtros = new StringBuilder();
            if (areaId != null) filtros.append("Área ID: ").append(areaId).append("; ");
            if (estado != null && !estado.isEmpty()) filtros.append("Estado: ").append(estado).append("; ");
            if (fechaInicio != null && !fechaInicio.isEmpty()) filtros.append("Fecha Inicio: ").append(fechaInicio).append("; ");
            if (fechaFin != null && !fechaFin.isEmpty()) filtros.append("Fecha Fin: ").append(fechaFin).append("; ");
            if (licitacionId != null) filtros.append("Licitación ID: ").append(licitacionId).append("; ");
            if (evaluadorId != null) filtros.append("Evaluador ID: ").append(evaluadorId).append("; ");
            if (filtros.length() == 0) filtros.append("Sin filtros aplicados");
            
            com.licitaciones.sistema.entity.ReporteDescarga descarga = com.licitaciones.sistema.entity.ReporteDescarga.builder()
                    .usuario(user)
                    .username(username)
                    .userFullName(fullName)
                    .modulo(tipoReporte)
                    .tipo(formato)
                    .filtros(filtros.toString())
                    .fecha(java.time.LocalDateTime.now())
                    .build();
            descargaRepository.save(descarga);
        } catch (Exception e) {
            e.printStackTrace();
        }

        byte[] data = exportService.exportarReporte(
                tipoReporte, formato, areaId, estado, fechaInicio, fechaFin, licitacionId, evaluadorId
        );

        String filename = "reporte_" + tipoReporte + "_" + System.currentTimeMillis() + 
                ("pdf".equalsIgnoreCase(formato) ? ".pdf" : ".xlsx");

        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename);

        MediaType mediaType = "pdf".equalsIgnoreCase(formato) ? 
                MediaType.APPLICATION_PDF : 
                MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

        return ResponseEntity.ok()
                .headers(headers)
                .contentType(mediaType)
                .body(data);
    }
}
