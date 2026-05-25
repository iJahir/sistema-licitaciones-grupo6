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
public class ReporteContratosDTO {
    private long totalContratos;
    private long contratosFirmados;
    private long contratosPendientes;
    private BigDecimal montoTotalContratos;
    private Map<String, Long> cantidadPorEstado;
    private List<ContratoReportItem> items;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ContratoReportItem {
        private Long id;
        private String codigo;
        private String licitacionTitulo;
        private String proveedorNombre;
        private Double monto;
        private String fechaFirma;
        private String estado;
        private Boolean firmadoProveedor;
        private String fechaFirmaProveedor;
        private Boolean validadoArea;
        private String fechaValidacionArea;
        private Boolean firmadoAutoridad;
        private String fechaFirmaAutoridad;
        private String firmanteArea;
    }
}
