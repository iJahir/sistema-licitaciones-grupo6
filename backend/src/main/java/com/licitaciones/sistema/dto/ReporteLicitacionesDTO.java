package com.licitaciones.sistema.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Map;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ReporteLicitacionesDTO {
    private long totalLicitaciones;
    private Map<String, Long> cantidadPorEstado;
    private Map<String, Long> cantidadPorArea;
    private BigDecimal presupuestoTotal;
    private java.util.List<LicitacionReportItem> items;

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class LicitacionReportItem {
        private Long id;
        private String titulo;
        private String area;
        private String estado;
        private BigDecimal presupuesto;
        private String fechaInicio;
        private String fechaFin;
    }
}
