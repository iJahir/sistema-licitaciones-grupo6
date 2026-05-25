package com.licitaciones.sistema.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class JwtResponse {
	private String token;
	private String type = "Bearer";
	private Long id;
	private String username;
	private String nombre;
	private String apellido;
	private String nombreCompleto;
	private String email;
	private String urlFoto;
	private String empresaNombre;
	private String ruc;
	private List<String> roles;

	public JwtResponse(String accessToken, Long id, String username, String nombre, String apellido, String nombreCompleto, String email, String urlFoto, String empresaNombre, String ruc, List<String> roles) {
		this.token = accessToken;
		this.id = id;
		this.username = username;
		this.nombre = nombre;
		this.apellido = apellido;
		this.nombreCompleto = nombreCompleto;
		this.email = email;
		this.urlFoto = urlFoto;
		this.empresaNombre = empresaNombre;
		this.ruc = ruc;
		this.roles = roles;
	}
}
