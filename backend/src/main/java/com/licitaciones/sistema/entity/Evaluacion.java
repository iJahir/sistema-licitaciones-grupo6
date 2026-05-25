package com.licitaciones.sistema.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "evaluaciones",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_evaluacion_propuesta_evaluador", columnNames = {"propuesta_id", "evaluador_id"})
    },
    indexes = {
        @Index(name = "idx_evaluacion_evaluador", columnList = "evaluador_id"),
        @Index(name = "idx_evaluacion_propuesta", columnList = "propuesta_id")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Evaluacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "licitacion_id", nullable = true)
    private Licitacion licitacion; // Mantener por compatibilidad o histórico, pero opcional

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "propuesta_id", nullable = true) // Cambiaré a false en DBInspector después de migrar datos
    private Propuesta propuesta;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "evaluador_id", nullable = false)
    private Usuario evaluador;

    @Enumerated(EnumType.STRING)
    @Column(name = "especialidad_evaluador", length = 30, nullable = false)
    @Builder.Default
    private EvaluadorEspecialidad especialidadEvaluador = EvaluadorEspecialidad.GENERAL;

    @Column(name = "sin_conflicto_interes")
    @Builder.Default
    private Boolean sinConflictoInteres = true;

    // Puntuación Detallada (JSON para preguntas por área)
    @Column(columnDefinition = "TEXT")
    private String puntajesJson;

    @Column(columnDefinition = "TEXT")
    private String respuestasJson;

    private Integer puntajePrecio;
    private Integer puntajeCalidad;
    private Integer puntajeExperiencia;
    private Integer puntajeTiempo;
    
    private Integer calidad;
    private Integer claridad;
    private Integer viabilidad;

    private Integer puntajeTotal; // 0-50
    private Double puntajeTotalPonderado;
    private Integer estrellas;    // 1-5

    @Column(columnDefinition = "TEXT")
    private String comentarioGeneral;

    private Boolean cumpleRequisitos;

    @Column(columnDefinition = "TEXT")
    private String comentarios;

    @Column(columnDefinition = "TEXT")
    private String observaciones;

    // Informe y Estados
    private String archivoPdf;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private EstadoEvaluacion resultado = EstadoEvaluacion.PENDIENTE; // APROBADO, RECHAZADO, PENDIENTE

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private EstadoTramite estadoTramite = EstadoTramite.BORRADOR; // BORRADOR, FINALIZADO

    private LocalDateTime fecha;

    @Builder.Default
    private Integer version = 1;

    @Builder.Default
    @Column(name = "active", nullable = false, columnDefinition = "bit default 1")
    private Boolean active = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_evaluador", length = 30)
    @Builder.Default
    private TipoEvaluador tipoEvaluador = TipoEvaluador.OBLIGATORIO;

    @Column(name = "ip_address", length = 100)
    private String ipAddress;

    @Column(name = "user_agent", length = 255)
    private String userAgent;

    @Column(name = "device", length = 100)
    private String device;

    @Column(name = "session_id", length = 100)
    private String sessionId;

    @Column(name = "document_hash", length = 255)
    private String documentHash;

    @Lob
    @Column(name = "firma_digital")
    private String firmaDigital;

    // --- Enterprise Audit & Scoring extensions ---
    @Column(name = "assigned_by")
    private String assignedBy;

    @Column(name = "updated_by")
    private String updatedBy;

    @Column(name = "reassigned_by")
    private String reassignedBy;

    @Column(name = "assigned_at")
    private LocalDateTime assignedAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "deadline")
    private LocalDateTime deadline;

    @Column(name = "score_total")
    private Double scoreTotal;

    @Column(name = "score_tecnico")
    private Double scoreTecnico;

    @Column(name = "score_financiero")
    private Double scoreFinanciero;

    @Column(name = "score_legal")
    private Double scoreLegal;

    @PrePersist
    protected void onCreate() {
        this.fecha = LocalDateTime.now();
        if (this.assignedAt == null) this.assignedAt = LocalDateTime.now();
        if (this.resultado == null) this.resultado = EstadoEvaluacion.PENDIENTE;
        if (this.estadoTramite == null) this.estadoTramite = EstadoTramite.BORRADOR;
    }
}

