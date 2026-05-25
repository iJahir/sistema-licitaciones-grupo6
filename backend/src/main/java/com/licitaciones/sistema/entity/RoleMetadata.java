package com.licitaciones.sistema.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "role_metadata")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoleMetadata {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String roleKey;

    @Column(nullable = false)
    private String displayName;

    @Column(columnDefinition = "TEXT")
    private String descripcion;

    @Builder.Default
    @Column(nullable = false)
    private Boolean enabled = true;

    private String icono;
    private String color;

    @Column(columnDefinition = "TEXT")
    private String permisosJson;
}
