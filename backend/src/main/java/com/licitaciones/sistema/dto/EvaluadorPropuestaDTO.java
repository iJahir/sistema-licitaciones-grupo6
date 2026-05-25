package com.licitaciones.sistema.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EvaluadorPropuestaDTO {
    private Long evaluacionId;
    private Long evaluadorId;
    private String nombreCompleto;
    private String username;
    private String rolEvaluador;
    private String especialidad;
    private String areaNombre;
    private String estadoTramite;
    private String estadoEvaluacion;
    private String resultado;
    private Boolean calificado;
    private Integer puntajeTotal;
    private Integer estrellas;
    private String observaciones;
    private LocalDateTime fecha;

    // Enterprise audit and scoring
    private String assignedBy;
    private String updatedBy;
    private String reassignedBy;
    private LocalDateTime assignedAt;
    private LocalDateTime updatedAt;
    private LocalDateTime deadline;
    private Double scoreTotal;
    private Double scoreTecnico;
    private Double scoreFinanciero;
    private Double scoreLegal;
}

