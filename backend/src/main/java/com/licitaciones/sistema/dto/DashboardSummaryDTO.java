package com.licitaciones.sistema.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import java.util.List;

@Getter
@Setter
@Builder
public class DashboardSummaryDTO {
    private Stats stats;
    private List<LicitacionRecentDTO> recentLicitaciones;
    private List<AlertDTO> alerts;
    
    private java.util.Map<String, Long> licitacionesPorEstado;
    private java.util.Map<String, Long> propuestasPorEstado;
    private java.util.Map<String, Long> creadasPorMes;
    private java.util.Map<String, Long> adjudicadasPorMes;
    private java.util.Map<String, Long> cerradasPorMes;

    @Getter @Setter @Builder
    public static class Stats {
        private Long totalLicitaciones;
        private Long enProceso;
        private Long evaluadas;
        private Long participantes;
        private Long totalContratos;
        
        // Percentages/Trends
        private String totalTrend;
        private String enProcesoTrend;
        private String evaluadasTrend;
        private String participantesTrend;

        // Financial KPIs
        private Double valorEstimadoTotal;
        private Double valorAdjudicadoTotal;
        private Double ahorroEstimado;
        private Double porcentajeAhorroPromedio;

        // System indicators
        private Long accionesHoy;
        private Long usuariosEnLinea;
    }

    @Getter @Setter @Builder
    public static class LicitacionRecentDTO {
        private Long id;
        private String titulo;
        private String creadorNombre;
        private String area;
        private String estado;
        private String fechaCierre;
        private String createdAt;
    }

    @Getter @Setter @Builder
    public static class AlertDTO {
        private String type; // 'urgent', 'info', 'warning'
        private String message;
        private Long referenceId;
    }
}
