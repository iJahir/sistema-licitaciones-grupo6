package com.licitaciones.sistema.entity;

import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Proveedor {
    private Long id;
    private String razonSocial;
    private String nit;
    private String representanteLegal;
    private String correo;
    private String telefono;
    private String categoria; 
    private String estado; 
    private LocalDateTime fechaRegistro;
    private LocalDateTime ultimaParticipacion;
    private String avatarColor; 
    private String clasificacion;
    private String pais;
    private String observaciones;
    private Integer totalParticipaciones;
    private Integer contratosAdjudicados;
}
