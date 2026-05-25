package com.licitaciones.sistema.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "documentos_propuesta")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentoPropuesta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "propuesta_id", nullable = false)
    @JsonIgnore
    private Propuesta propuesta;

    private String nombreArchivo;
    private String rutaArchivo;
    private String tipoArchivo;
}
