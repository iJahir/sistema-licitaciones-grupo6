package com.licitaciones.sistema.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "usuarios", 
    uniqueConstraints = { 
      @UniqueConstraint(columnNames = "username"),
      @UniqueConstraint(columnNames = "email") 
    })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "byteBuddyInterceptor"})
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "area_id", nullable = true)
    private Area area;

    @NotBlank
    @Size(max = 20)
    private String username;

    @Column(nullable = true)
    @Size(max = 50)
    private String nombre;

    @Column(nullable = true)
    @Size(max = 50)
    private String apellido;

    @NotBlank
    @Size(max = 50)
    @Email
    private String email;

    @NotBlank
    @Size(max = 120)
    private String password;

    @Builder.Default
    @JsonIgnore
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "usuario_roles", 
               joinColumns = @JoinColumn(name = "usuario_id"), 
               inverseJoinColumns = @JoinColumn(name = "rol_id"))
    private Set<Rol> roles = new HashSet<>();

    @Builder.Default
    @Column(nullable = false)
    private Boolean enabled = true;

    @Builder.Default
    @Column(nullable = false)
    private Boolean eliminado = false;

    @Column(nullable = true)
    private java.time.LocalDateTime primeraConexion;

    @Column(nullable = true)
    private java.time.LocalDateTime ultimaConexion;

    @Column(nullable = true)
    private java.time.LocalDateTime ultimaActividad;

    @Builder.Default
    @Column(nullable = false)
    private Boolean requiereCambioPassword = false;

    @Column(nullable = true)
    private String urlFoto;

    @Column(nullable = true)
    private String empresaNombre;

    @Column(nullable = true)
    private String ruc;

    @Column(nullable = true)
    private String categoria;

    @Column(nullable = true)
    private String telefono;

    @Column(nullable = true)
    private String pais;

    @Column(nullable = true)
    private String clasificacion;

    @Column(nullable = true)
    @Size(max = 1000)
    private String observaciones;

    @Builder.Default
    @Column(nullable = true)
    private java.time.LocalDateTime fechaCreacion = java.time.LocalDateTime.now();

    public String getNombreCompleto() {
        if (nombre == null && apellido == null) return username;
        return ((nombre != null ? nombre : "") + " " + (apellido != null ? apellido : "")).trim();
    }

    public boolean hasAnyRole(RoleName... roleNames) {
        if (roles == null) return false;
        return roles.stream().anyMatch(r -> {
            RoleName name = r.getName();
            return java.util.Arrays.stream(roleNames).anyMatch(rn -> rn == name);
        });
    }

    public boolean isAdmin() {
        return hasAnyRole(
            RoleName.ROLE_ADMINISTRADOR,
            RoleName.ROLE_SUPER_ADMIN,
            RoleName.ROLE_ADMIN,
            RoleName.ROLE_GESTOR_LICITACIONES
        );
    }

    public boolean isAutoridad() {
        return hasAnyRole(RoleName.ROLE_AUTORIDAD);
    }

    public boolean isAuditor() {
        return hasAnyRole(RoleName.ROLE_AUDITOR);
    }

    public boolean isObservador() {
        return hasAnyRole(RoleName.ROLE_OBSERVADOR);
    }

    public boolean isAreaSolicitante() {
        return hasAnyRole(RoleName.ROLE_AREA_SOLICITANTE);
    }

    public boolean isProveedor() {
        return hasAnyRole(RoleName.ROLE_PROVEEDOR);
    }

    public boolean isEvaluador() {
        return hasAnyRole(
            RoleName.ROLE_EVALUADOR,
            RoleName.ROLE_EVALUADOR_GENERAL,
            RoleName.ROLE_EVALUADOR_FINANCIERO,
            RoleName.ROLE_EVALUADOR_TECNICO,
            RoleName.ROLE_EVALUADOR_LEGAL
        );
    }
}
