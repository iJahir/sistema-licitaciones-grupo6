package com.licitaciones.sistema.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "licitaciones", indexes = {
    @Index(name = "idx_licitacion_estado", columnList = "estado"),
    @Index(name = "idx_licitacion_area", columnList = "area_id"),
    @Index(name = "idx_licitacion_fechas", columnList = "fechaCierre, fechaPublicacion")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "byteBuddyInterceptor"})
@EntityListeners(AuditingEntityListener.class)
public class Licitacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    private String titulo;

    @NotBlank
    @Column(columnDefinition = "TEXT")
    private String descripcion;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "area_id")
    private Area area;

    @Column(name = "area_solicitante")
    private String areaSolicitante; // Campo legacy para sincronización con SQL manual

    @NotBlank
    private String tipo;

    @Column(columnDefinition = "TEXT")
    private String bases;

    @Column(columnDefinition = "TEXT")
    private String requisitos;

    private Double presupuesto;

    private LocalDateTime fechaPublicacion;
    private LocalDateTime fechaCierre;
    private LocalDateTime fechaEvaluacion;
    private LocalDateTime fechaAdjudicacion;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private EstadoLicitacion estado = EstadoLicitacion.BORRADOR;

    private String motivoCancelacion;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "propuesta_ganadora_id")
    @JsonIgnoreProperties("licitacion")
    private Propuesta propuestaGanadora;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "aprobado_por_id")
    private Usuario aprobadoPor;

    private LocalDateTime fechaAprobacion;

    @Builder.Default
    private Integer versionActual = 1;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id")
    private Usuario creadoPor;

    @OneToMany(mappedBy = "licitacion", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<DocumentoLicitacion> documentos = new ArrayList<>();

    private String archivoUrl;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "licitacion_evaluadores",
        joinColumns = @JoinColumn(name = "licitacion_id"),
        inverseJoinColumns = @JoinColumn(name = "usuario_id")
    )
    @Builder.Default
    private List<Usuario> evaluadores = new ArrayList<>();

    @OneToMany(mappedBy = "licitacion", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    @OrderBy("fecha DESC")
    private List<LicitacionHito> hitos = new ArrayList<>();

    @OneToMany(mappedBy = "licitacion", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    @OrderBy("version DESC")
    private List<LicitacionHistorial> historial = new ArrayList<>();

    @OneToMany(mappedBy = "licitacion", fetch = FetchType.LAZY)
    @Builder.Default
    @com.fasterxml.jackson.annotation.JsonIgnore
    private List<Propuesta> propuestas = new ArrayList<>();

    @org.hibernate.annotations.Formula("(select count(1) from propuestas p where p.licitacion_id = id)")
    private Integer propuestasCount;

    public int getPropuestasCount() {
        return propuestasCount != null ? propuestasCount : 0;
    }

    @OneToMany(mappedBy = "licitacion", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    @com.fasterxml.jackson.annotation.JsonIgnore
    private List<Participante> participantes = new java.util.ArrayList<>();

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Deprecated
    private LocalDateTime fechaCreacion;
}
