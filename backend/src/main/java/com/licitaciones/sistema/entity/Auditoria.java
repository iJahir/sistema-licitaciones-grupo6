package com.licitaciones.sistema.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "auditoria")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Auditoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    private String username;
    private String rolUsuario;

    @Column(nullable = false)
    private String accion;

    @Column(nullable = false)
    private String modulo;

    @Column(columnDefinition = "TEXT")
    private String descripcion;

    @Column(nullable = false)
    private LocalDateTime fecha;

    private String ip;
    private String userAgent;

    // Para datos técnicos adicionales (JSON)
    @Column(columnDefinition = "TEXT")
    private String metadata;
}
