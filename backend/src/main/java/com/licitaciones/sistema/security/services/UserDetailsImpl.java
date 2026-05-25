package com.licitaciones.sistema.security.services;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.licitaciones.sistema.entity.Usuario;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

public class UserDetailsImpl implements UserDetails {
  private static final long serialVersionUID = 1L;

  private Long id;

  private String username;

  private String nombre;

  private String apellido;

  private String nombreCompleto;

  private String email;
  
  private String urlFoto;

  @JsonIgnore
  private String password;

  private String empresaNombre;
  private String ruc;
  private Collection<? extends GrantedAuthority> authorities;

  public UserDetailsImpl(Long id, String username, String nombre, String apellido, String nombreCompleto, String email, String urlFoto, String empresaNombre, String ruc, String password,
      Collection<? extends GrantedAuthority> authorities) {
    this.id = id;
    this.username = username;
    this.nombre = nombre;
    this.apellido = apellido;
    this.nombreCompleto = nombreCompleto;
    this.email = email;
    this.urlFoto = urlFoto;
    this.empresaNombre = empresaNombre;
    this.ruc = ruc;
    this.password = password;
    this.authorities = authorities;
  }

  public static UserDetailsImpl build(Usuario user) {
    List<GrantedAuthority> authorities = new java.util.ArrayList<>();
    for (com.licitaciones.sistema.entity.Rol role : user.getRoles()) {
      String roleName = role.getName().name();
      authorities.add(new SimpleGrantedAuthority(roleName));
      if ("ROLE_ADMIN".equals(roleName) || "ROLE_ADMINISTRADOR".equals(roleName)) {
        if (!authorities.stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
          authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
        }
        if (!authorities.stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMINISTRADOR"))) {
          authorities.add(new SimpleGrantedAuthority("ROLE_ADMINISTRADOR"));
        }
      }
    }

    return new UserDetailsImpl(
        user.getId(), 
        user.getUsername(),
        user.getNombre(),
        user.getApellido(),
        user.getNombreCompleto(),
        user.getEmail(),
        user.getUrlFoto(),
        user.getEmpresaNombre(),
        user.getRuc(),
        user.getPassword(), 
        authorities);
  }

  @Override
  public Collection<? extends GrantedAuthority> getAuthorities() {
    return authorities;
  }

  public Long getId() {
    return id;
  }

  public String getNombre() {
    return nombre;
  }

  public String getApellido() {
    return apellido;
  }

  public String getNombreCompleto() {
    return nombreCompleto;
  }

  public String getEmail() {
    return email;
  }

  public String getUrlFoto() {
    return urlFoto;
  }

  public String getEmpresaNombre() {
    return empresaNombre;
  }

  public String getRuc() {
    return ruc;
  }

  @Override
  public String getPassword() {
    return password;
  }

  @Override
  public String getUsername() {
    return username;
  }

  @Override
  public boolean isAccountNonExpired() {
    return true;
  }

  @Override
  public boolean isAccountNonLocked() {
    return true;
  }

  @Override
  public boolean isCredentialsNonExpired() {
    return true;
  }

  @Override
  public boolean isEnabled() {
    return true;
  }

  @Override
  public boolean equals(Object o) {
    if (this == o)
      return true;
    if (o == null || getClass() != o.getClass())
      return false;
    UserDetailsImpl user = (UserDetailsImpl) o;
    return Objects.equals(id, user.id);
  }
}
