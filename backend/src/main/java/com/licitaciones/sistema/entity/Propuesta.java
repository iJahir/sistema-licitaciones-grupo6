package com.licitaciones.sistema.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.licitaciones.sistema.dto.EvaluadorPropuestaDTO;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "propuestas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "byteBuddyInterceptor"})
public class Propuesta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "licitacion_id", nullable = false)
    @JsonIgnoreProperties({"propuestas", "propuestaGanadora", "hitos", "historial", "evaluadores", "participantes", "aprobadoPor", "creadoPor"})
    private Licitacion licitacion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    @JsonIgnoreProperties({"roles", "area"})
    private Usuario usuario;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "participante_id")
    @JsonIgnoreProperties({"licitacion", "usuario"})
    private Participante participante;

    @NotBlank
    private String nombre;

    @Column(columnDefinition = "TEXT")
    private String descripcion;

    private Double montoOfertado;

    private Integer tiempoEntregaDias;
    
    // Información del Proveedor
    private String empresaNombre;
    private String identificacionRuc;
    private String contactoNombre;
    private String contactoEmail;
    private String contactoTelefono;

    // Oferta Económica
    private String moneda;
    
    @Column(columnDefinition = "TEXT")
    private String detalleCosto;

    // Datos Dinámicos por Área (JSON)
    @Column(columnDefinition = "TEXT")
    private String datosAreaJson;

    @Column(columnDefinition = "TEXT")
    private String comentarios;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private EstadoPropuesta estado = EstadoPropuesta.BORRADOR;

    private LocalDateTime fechaEnvio;

    private Integer versionActual;

    @OneToMany(mappedBy = "propuesta", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @Builder.Default
    private List<DocumentoPropuesta> documentos = new ArrayList<>();

    @Transient
    @Builder.Default
    private List<EvaluadorPropuestaDTO> evaluadores = new ArrayList<>();

    @Column(nullable = true)
    private String archivoUrl;

    // Declaraciones
    private boolean declaracionVeracidad;
    private boolean aceptacionBases;
    private boolean noConflictoInteres;
    
    @Column(columnDefinition = "TEXT")
    private String motivoRechazo;

    // Campos de evaluación (para ranking y vista rápida)
    private Integer puntajeTotal;
    private Integer estrellas;

    @Column(name = "score_total")
    private Double scoreTotal;

    @Column(name = "score_tecnico")
    private Double scoreTecnico;

    @Column(name = "score_financiero")
    private Double scoreFinanciero;

    @Column(name = "score_legal")
    private Double scoreLegal;
}

