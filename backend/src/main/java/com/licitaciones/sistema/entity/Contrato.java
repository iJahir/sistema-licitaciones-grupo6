package com.licitaciones.sistema.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "contratos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@EntityListeners(AuditingEntityListener.class)
public class Contrato {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "licitacion_id", nullable = false)
    @JsonIgnoreProperties({"propuestas", "propuestaGanadora", "hitos", "historial", "evaluadores", "participantes"})
    private Licitacion licitacion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "propuesta_id", nullable = false)
    @JsonIgnoreProperties("licitacion")
    private Propuesta propuesta;

    @Column(unique = true, nullable = false)
    private String codigo;

    private Double monto;

    private LocalDateTime fechaFirma;
    private LocalDateTime fechaInicio;
    private LocalDateTime fechaFin;

    @Builder.Default
    private Boolean firmadoProveedor = false;
    @Builder.Default
    private Boolean firmadoAutoridad = false;
    @Builder.Default
    private Boolean validadoArea = false;
    private LocalDateTime fechaFirmaProveedor;
    private LocalDateTime fechaFirmaAutoridad;
    private LocalDateTime fechaValidacionArea;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private EstadoContrato estado = EstadoContrato.PENDIENTE;

    private String archivoUrl;

    @Column(columnDefinition = "TEXT")
    private String observaciones;

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

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum EstadoContrato {
        PENDIENTE,
        FIRMADO,
        FINALIZADO,
        CANCELADO
    }
}
