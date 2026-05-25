package com.licitaciones.sistema.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "historial_actividad")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Historial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime fecha;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    private String usuarioNombre;
    private String usuarioRol;
    private String usuarioAvatar;

    @Column(nullable = false)
    private String accion;

    @Column(nullable = false)
    private String modulo;

    private String moduloIcon;

    @Column(columnDefinition = "TEXT")
    private String detalle;

    private String resultado;

    private String ipOrigen;

    private String tipo;
}
