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
public class ReportePropuestasDTO {
    private long totalPropuestas;
    private double promedioPuntaje;
    private BigDecimal montoTotalOfertado;
    private Map<String, Long> cantidadPorEstado;
    private java.util.List<PropuestaReportItem> items;

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class PropuestaReportItem {
        private Long id;
        private Long licitacionId;
        private String licitacionTitulo;
        private String empresa;
        private String estado;
        private Double monto;
        private Integer puntaje;
        private Integer estrellas;
        private String fechaEnvio;
    }
}
