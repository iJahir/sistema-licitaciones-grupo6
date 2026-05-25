package com.licitaciones.sistema.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LicitacionEvaluacionDTO {
    private Long id;
    private String titulo;
    private String area;
    private String estado;
    private Integer totalPropuestas;
    private Integer propuestasEvaluadas;
    private Double progreso;
}
