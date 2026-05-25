package com.licitaciones.sistema.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "licitacion_historial")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LicitacionHistorial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "licitacion_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Licitacion licitacion;

    private Integer version;
    
    @Column(columnDefinition = "TEXT")
    private String datosJson; // Snapshot del objeto en JSON
    
    private LocalDateTime fechaCambio;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id")
    private Usuario modificadoPor;
    
    private String comentario; // Motivo del cambio
}
