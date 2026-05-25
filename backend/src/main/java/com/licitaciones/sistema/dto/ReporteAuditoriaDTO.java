package com.licitaciones.sistema.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ReporteAuditoriaDTO {
    private long totalAcciones;
    private int totalPages;
    private long totalElements;
    private int currentPage;
    private int pageSize;
    private Map<String, Long> accionesPorModulo;
    private Map<String, Long> accionesPorUsuario;
    private List<AuditoriaReportItem> contenido;

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class AuditoriaReportItem {
        private Long id;
        private String username;
        private String rol;
        private String accion;
        private String modulo;
        private String descripcion;
        private String fecha;
        private String ip;
    }
}
