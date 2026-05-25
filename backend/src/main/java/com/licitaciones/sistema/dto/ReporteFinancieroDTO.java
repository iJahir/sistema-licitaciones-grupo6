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
public class ReporteFinancieroDTO {
    private BigDecimal presupuestoTotal;
    private BigDecimal presupuestoEjecutado;
    private BigDecimal montoAdjudicado;
    private long contratosActivos;
    private long contratosFinalizados;
    
    private Map<String, BigDecimal> ejecucionPorArea;
    private List<TopContratoItem> topContratos;
    private List<TopProveedorItem> topProveedores;
    private Map<String, BigDecimal> gastoMensual;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TopContratoItem {
        private String codigo;
        private String licitacionTitulo;
        private String proveedorNombre;
        private BigDecimal monto;
        private String estado;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TopProveedorItem {
        private String proveedorNombre;
        private long contratosAdjudicados;
        private BigDecimal montoTotal;
    }
}
