package com.licitaciones.sistema.dto;

import com.licitaciones.sistema.entity.EstadoPropuesta;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PropuestaEvalDTO {
    private Long id;
    private String nombre;
    private String proveedor;
    private String licitacionTitulo;
    private String area;
    private Double monto;
    private LocalDateTime fechaEnvio;
    private LocalDateTime fechaLimite;
    private String estadoPropuesta;
    private String estadoEvaluacion; // PENDIENTE, BORRADOR, FINALIZADO
    private Integer puntajeTotal;
    private Double progreso;
    private String archivoUrl;
    private List<EvaluadorResumenDTO> evaluadores;
}

