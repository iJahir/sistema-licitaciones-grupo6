package com.licitaciones.sistema.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.List;

@Entity
@Table(name = "rubricas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Rubrica {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "licitacion_id", nullable = false)
    private Licitacion licitacion;

    private String nombre;

    @OneToMany(mappedBy = "rubrica", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Criterio> criterios;
}
