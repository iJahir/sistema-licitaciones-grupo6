package com.licitaciones.sistema.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ReporteEvaluacionesDTO {
    private long totalEvaluaciones;
    private double promedioEstrellas;
    private Map<String, Long> cantidadPorResultado; // APROBADO, RECHAZADO, PENDIENTE
    private java.util.List<EvaluacionReportItem> items;

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class EvaluacionReportItem {
        private Long id;
        private String propuesta;
        private String empresa;
        private String evaluador;
        private Integer puntajeTotal;
        private Double puntajePonderado;
        private Integer estrellas;
        private String resultado;
        private String fecha;
    }
}
