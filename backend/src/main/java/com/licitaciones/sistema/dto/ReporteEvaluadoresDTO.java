package com.licitaciones.sistema.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ReporteEvaluadoresDTO {
    private long totalEvaluadores;
    private long totalEvaluaciones;
    private double promedioEstrellasGeneral;
    private List<EvaluadorStatsItem> items;

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class EvaluadorStatsItem {
        private Long id;
        private String nombre;
        private String username;
        private long evaluacionesRealizadas;
        private double promedioEstrellas;
        private double promedioPuntaje;
        private long propuestasAprobadas;
    }
}
