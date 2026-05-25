package com.licitaciones.sistema.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "licitacion_hitos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LicitacionHito {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "licitacion_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Licitacion licitacion;

    private String titulo;
    
    @Column(columnDefinition = "TEXT")
    private String descripcion;
    
    private LocalDateTime fecha;
    
    private String icono; // fa-plus, fa-check, etc.
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id")
    private Usuario realizadoPor;
}
