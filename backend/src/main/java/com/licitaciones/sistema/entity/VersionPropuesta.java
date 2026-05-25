package com.licitaciones.sistema.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "versiones_propuesta")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VersionPropuesta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "propuesta_id", nullable = false)
    private Propuesta propuesta;

    private Integer numeroVersion;

    @Column(columnDefinition = "TEXT")
    private String datosJson;

    private LocalDateTime fechaVersion;
}
