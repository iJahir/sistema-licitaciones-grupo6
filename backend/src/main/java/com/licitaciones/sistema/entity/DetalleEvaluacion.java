package com.licitaciones.sistema.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "detalle_evaluacion")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DetalleEvaluacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "evaluacion_id", nullable = false)
    private Evaluacion evaluacion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "criterio_id", nullable = false)
    private Criterio criterio;

    private Integer puntaje;

    @Column(columnDefinition = "TEXT")
    private String comentario;
}
