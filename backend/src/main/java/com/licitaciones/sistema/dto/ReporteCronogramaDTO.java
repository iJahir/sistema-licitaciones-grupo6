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
public class ReporteCronogramaDTO {
    private long totalEventos;
    private long totalLicitacionesAsociadas;
    private long totalPropuestasAsociadas;
    private List<CronogramaReportItem> items;

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class CronogramaReportItem {
        private Long id;
        private String titulo;
        private String descripcion;
        private String tipoEvento;
        private String fechaEvento;
        private String referenciaTipo;
        private String prioridad;
        private String area;
        private String usuario;
    }
}
