package com.licitaciones.sistema.dto;

import lombok.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReporteAdjudicacionesDTO {
    private long totalAdjudicaciones;
    private BigDecimal montoTotalAdjudicado;
    private double promedioMontoAdjudicado;
    private List<AdjudicionReportItem> items;
    private Map<String, Long> adjudicacionesPorMes;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AdjudicionReportItem {
        private Long licitacionId;
        private String licitacionTitulo;
        private String areaNombre;
        private String proveedorNombre;
        private BigDecimal montoAdjudicado;
        private String fechaAdjudicacion;
        private String estado;
    }
}
