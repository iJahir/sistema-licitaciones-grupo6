package com.licitaciones.sistema.controller;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import jakarta.validation.Valid;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.licitaciones.sistema.entity.Rol;
import com.licitaciones.sistema.entity.RoleName;
import com.licitaciones.sistema.entity.Usuario;
import com.licitaciones.sistema.dto.JwtResponse;
import com.licitaciones.sistema.dto.MessageResponse;
import com.licitaciones.sistema.dto.LoginRequest;
import com.licitaciones.sistema.dto.SignupRequest;
import com.licitaciones.sistema.repository.RolRepository;
import com.licitaciones.sistema.repository.UsuarioRepository;
import com.licitaciones.sistema.security.jwt.JwtUtils;
import com.licitaciones.sistema.security.services.UserDetailsImpl;
import com.licitaciones.sistema.service.NotificacionService;
import com.licitaciones.sistema.service.AuditoriaService;
import com.licitaciones.sistema.service.PropuestaService;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/auth")
public class AuthController {

  @Autowired
  AuthenticationManager authenticationManager;

  @Autowired
  UsuarioRepository userRepository;

  @Autowired
  RolRepository roleRepository;

  @Autowired
  PasswordEncoder encoder;

  @Autowired
  JwtUtils jwtUtils;

  @Autowired
  NotificacionService notificacionService;

  @Autowired
  AuditoriaService auditoriaService;

  @Autowired
  com.licitaciones.sistema.service.ProveedorService proveedorService;

  @PostMapping("/login")
  public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {

    Authentication authentication = authenticationManager.authenticate(
        new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword()));

    SecurityContextHolder.getContext().setAuthentication(authentication);
    String jwt = jwtUtils.generateJwtToken(authentication);

    UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
    List<String> roles = userDetails.getAuthorities().stream()
        .map(item -> item.getAuthority())
        .collect(Collectors.toList());

    // Nota: El constructor de JwtResponse en este proyecto tiene más parámetros.
    // Usaremos los datos disponibles en userDetails.
    return ResponseEntity.ok(new JwtResponse(
        jwt,
        userDetails.getId(),
        userDetails.getUsername(),
        userDetails.getNombre(),
        userDetails.getApellido(),
        userDetails.getNombre() + " " + userDetails.getApellido(),
        userDetails.getEmail(),
        null, // urlFoto
        userDetails.getEmpresaNombre(),
        userDetails.getRuc(),
        roles));
  }

  @PostMapping("/signup")
  public ResponseEntity<?> registerUser(@Valid @RequestBody SignupRequest signUpRequest) {
    System.out.println("[DEBUG] Intentando registrar: " + signUpRequest.getUsername() + " | " + signUpRequest.getEmail());
    
    if (userRepository.existsByUsername(signUpRequest.getUsername())) {
      System.out.println("[DEBUG] FALLO: El nombre de usuario ya existe");
      return ResponseEntity
          .badRequest()
          .body(new MessageResponse("¡Error: El nombre de usuario ya está en uso!"));
    }

    if (userRepository.existsByEmail(signUpRequest.getEmail())) {
      System.out.println("[DEBUG] FALLO: El email ya existe");
      return ResponseEntity
          .badRequest()
          .body(new MessageResponse("¡Error: El email ya está en uso!"));
    }

    try {
      Usuario user = new Usuario();
      user.setUsername(signUpRequest.getUsername());
      user.setEmail(signUpRequest.getEmail());
      user.setPassword(encoder.encode(signUpRequest.getPassword()));
      user.setNombre(signUpRequest.getNombre());
      user.setApellido(signUpRequest.getApellido());
      user.setEmpresaNombre(signUpRequest.getEmpresaNombre());
      user.setRuc(signUpRequest.getRuc());
      user.setTelefono(signUpRequest.getTelefono());
      user.setCategoria(signUpRequest.getCategoria() != null ? signUpRequest.getCategoria() : "Construcción");
      user.setPais(signUpRequest.getPais() != null ? signUpRequest.getPais() : "Guatemala");
      user.setObservaciones(signUpRequest.getObservaciones());
      user.setClasificacion("Pendiente");
      user.setEnabled(true);

      Set<Rol> roles = new HashSet<>();
      Rol userRole = roleRepository.findByName(RoleName.ROLE_PROVEEDOR)
          .orElseThrow(() -> new RuntimeException("Error: No se encontró el rol solicitado."));
      roles.add(userRole);
      user.setRoles(roles);

      userRepository.save(user);
      System.out.println("[DEBUG] Usuario guardado en DB");

      // Sincronizar en la tabla de proveedores físicos
      proveedorService.syncToProveedoresTable(user);

      try {
        auditoriaService.registrarAccion("REGISTRO", "SEGURIDAD", "Nuevo proveedor registrado: " + user.getUsername());
      } catch (Exception e) {}

      try {
        notificacionService.crearGlobal(
            "Nuevo Proveedor", 
            "Se ha registrado la empresa: " + user.getEmpresaNombre(), 
            "USUARIO", 
            "fa-building-circle-check", 
            "#10b981", 
            "/usuarios"
        );
        System.out.println("[DEBUG] Notificación enviada");
      } catch (Exception e) {}

      return ResponseEntity.ok(new MessageResponse("¡Usuario registrado exitosamente!"));
    } catch (Exception e) {
      System.out.println("[DEBUG] ERROR CRÍTICO EN REGISTRO: " + e.getMessage());
      return ResponseEntity.badRequest().body(new MessageResponse("Error: " + e.getMessage()));
    }
  }
}
