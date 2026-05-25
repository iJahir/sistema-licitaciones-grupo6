package com.licitaciones.sistema.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "notificaciones")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notificacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario; // Si es null, es una notificación global de sistema

    @Column(nullable = false)
    private String titulo;

    @Column(nullable = false, length = 500)
    private String mensaje;

    private String icono; // Clase FontAwesome (ej: fa-user-check)
    
    @Builder.Default
    private String color = "#4e73df"; // Color distintivo

    @Column(nullable = false)
    private LocalDateTime fecha;

    @Builder.Default
    private boolean leida = false;

    private String tipo; // LOGIN, LICITACION, PROPUESTA, EVALUACION, AUDITORIA

    private String link; // URL a la que redirigir si se hace clic
}
