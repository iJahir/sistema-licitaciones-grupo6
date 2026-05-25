package com.licitaciones.sistema.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "reporte_descarga")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReporteDescarga {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    private String username;
    private String userFullName;

    @Column(nullable = false)
    private String modulo; // e.g. "Licitaciones", "Propuestas", "Contratos", "Adjudicaciones", "Financiero"

    @Column(nullable = false)
    private String tipo; // e.g. "PDF", "EXCEL"

    @Column(columnDefinition = "TEXT")
    private String filtros; // JSON or text representation of filters applied

    @Column(nullable = false)
    private LocalDateTime fecha;
}
