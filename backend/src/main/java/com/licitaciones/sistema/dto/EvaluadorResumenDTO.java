package com.licitaciones.sistema.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EvaluadorResumenDTO {
    private Long evaluadorId;
    private String nombreCompleto;
    private String estadoTramite;  // BORRADOR | FINALIZADO
    private String resultado;      // PENDIENTE | APROBADO | RECHAZADO
    private Integer puntajeTotal;
}
