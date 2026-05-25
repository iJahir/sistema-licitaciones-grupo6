package com.licitaciones.sistema.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "criterios")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Criterio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rubrica_id", nullable = false)
    private Rubrica rubrica;

    private String nombre;

    private Double peso;

    private Integer puntajeMaximo;
}
