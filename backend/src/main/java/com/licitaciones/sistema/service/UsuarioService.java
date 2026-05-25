package com.licitaciones.sistema.service;

import com.licitaciones.sistema.dto.PasswordResetRequest;
import com.licitaciones.sistema.dto.UsuarioDTO;
import com.licitaciones.sistema.entity.Rol;
import com.licitaciones.sistema.entity.RoleName;
import com.licitaciones.sistema.entity.Usuario;
import com.licitaciones.sistema.repository.RolRepository;
import com.licitaciones.sistema.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.*;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class UsuarioService {

    @Value("${app.upload.dir}")
    private String uploadDir;

    @Autowired
    private UsuarioRepository userRepository;

    @Autowired
    private RolRepository roleRepository;

    @Autowired
    private PasswordEncoder encoder;

    @Autowired
    private com.licitaciones.sistema.repository.AreaRepository areaRepository;

    @Autowired
    private ProveedorService proveedorService;

    public java.util.Optional<Usuario> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    public Page<UsuarioDTO> getAll(String term, Pageable pageable) {
        Page<Usuario> users;
        if (term != null && !term.isEmpty()) {
            users = userRepository.searchInternos(term, pageable);
        } else {
            users = userRepository.findAllInternos(pageable);
        }
        return users.map(this::mapToDTO);
    }

    public java.util.List<UsuarioDTO> getEvaluadores() {
        return userRepository.findByRoleNameIn(java.util.List.of(
                RoleName.ROLE_EVALUADOR,
                RoleName.ROLE_EVALUADOR_GENERAL,
                RoleName.ROLE_EVALUADOR_FINANCIERO,
                RoleName.ROLE_EVALUADOR_TECNICO,
                RoleName.ROLE_EVALUADOR_LEGAL
            ))
            .stream()
            .map(this::mapToDTO)
            .collect(Collectors.toList());
    }

    public UsuarioDTO getById(Long id) {
        Usuario user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        if (user.getEliminado()) throw new RuntimeException("El usuario ha sido eliminado");
        return mapToDTO(user);
    }

    @Transactional
    public UsuarioDTO create(Usuario userRequest, Set<String> strRoles) {
        // Restricción Autoridad
        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        Usuario currentUser = userRepository.findByUsername(currentUsername).orElse(null);
        if (currentUser != null && currentUser.isAutoridad() && !currentUser.hasAnyRole(RoleName.ROLE_ADMINISTRADOR, RoleName.ROLE_SUPER_ADMIN, RoleName.ROLE_ADMIN)) {
            if (strRoles != null && (strRoles.contains("ROLE_ADMINISTRADOR") || strRoles.contains("ROLE_SUPER_ADMIN") || strRoles.contains("ROLE_ADMIN"))) {
                throw new RuntimeException("Error: Una Autoridad no puede asignar roles de Administrador.");
            }
        }

        if (userRepository.existsByUsername(userRequest.getUsername())) {
            throw new RuntimeException("Error: El nombre de usuario ya existe");
        }
        if (userRepository.existsByEmail(userRequest.getEmail())) {
            throw new RuntimeException("Error: El correo electrónico ya existe");
        }

        Usuario user = Usuario.builder()
                .username(userRequest.getUsername())
                .email(userRequest.getEmail())
                .nombre(userRequest.getNombre())
                .apellido(userRequest.getApellido())
                .password(encoder.encode(userRequest.getPassword()))
                .enabled(userRequest.getEnabled())
                .requiereCambioPassword(userRequest.getRequiereCambioPassword())
                .empresaNombre(userRequest.getEmpresaNombre())
                .ruc(userRequest.getRuc())
                .telefono(userRequest.getTelefono())
                .categoria(userRequest.getCategoria())
                .pais(userRequest.getPais())
                .clasificacion(userRequest.getClasificacion())
                .observaciones(userRequest.getObservaciones())
                .build();

        if (userRequest.getArea() != null && userRequest.getArea().getId() != null) {
            areaRepository.findById(userRequest.getArea().getId())
                .ifPresent(user::setArea);
        }

        Set<Rol> roles = new HashSet<>();
        if (strRoles == null || strRoles.isEmpty()) {
            Rol userRole = roleRepository.findByName(RoleName.ROLE_PROVEEDOR)
                    .orElseThrow(() -> new RuntimeException("Error: Rol no encontrado."));
            roles.add(userRole);
        } else {
            strRoles.forEach(role -> {
                try {
                    RoleName rn = RoleName.valueOf(role);
                    Rol adminRole = roleRepository.findByName(rn)
                            .orElseThrow(() -> new RuntimeException("Error: Rol no encontrado: " + role));
                    roles.add(adminRole);
                } catch (IllegalArgumentException e) {
                    throw new RuntimeException("Error: Nombre de rol inválido: " + role);
                }
            });
        }

        user.setRoles(roles);
        Usuario savedUser = userRepository.save(user);
        
        // Sincronizar en la tabla de proveedores físicos
        proveedorService.syncToProveedoresTable(savedUser);

        return mapToDTO(savedUser);
    }

    @Transactional
    public UsuarioDTO update(Long id, Usuario userRequest, Set<String> strRoles, String adminPassword) {
        // 1. Verify Admin Password
        String adminUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        Usuario admin = userRepository.findByUsername(adminUsername)
                .orElseThrow(() -> new RuntimeException("Administrador no encontrado"));

        if (!encoder.matches(adminPassword, admin.getPassword())) {
            throw new RuntimeException("Error: La contraseña del administrador es incorrecta. Autorización denegada.");
        }

        // Restricción Autoridad
        if (admin.isAutoridad() && !admin.hasAnyRole(RoleName.ROLE_ADMINISTRADOR, RoleName.ROLE_SUPER_ADMIN, RoleName.ROLE_ADMIN)) {
            if (strRoles != null && (strRoles.contains("ROLE_ADMINISTRADOR") || strRoles.contains("ROLE_SUPER_ADMIN") || strRoles.contains("ROLE_ADMIN"))) {
                throw new RuntimeException("Error: Una Autoridad no puede asignar roles de Administrador.");
            }
            Usuario targetUser = userRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
            if (targetUser.hasAnyRole(RoleName.ROLE_ADMINISTRADOR, RoleName.ROLE_SUPER_ADMIN, RoleName.ROLE_ADMIN)) {
                throw new RuntimeException("Error: Una Autoridad no puede editar un Administrador.");
            }
        }

        Usuario user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        user.setNombre(userRequest.getNombre());
        user.setApellido(userRequest.getApellido());
        user.setEmail(userRequest.getEmail());
        user.setEnabled(userRequest.getEnabled());
        user.setRequiereCambioPassword(userRequest.getRequiereCambioPassword());

        // Copiar los campos del proveedor de manera segura (evitando sobreescribir con null si provienen del form básico)
        if (userRequest.getEmpresaNombre() != null) user.setEmpresaNombre(userRequest.getEmpresaNombre());
        if (userRequest.getRuc() != null) user.setRuc(userRequest.getRuc());
        if (userRequest.getTelefono() != null) user.setTelefono(userRequest.getTelefono());
        if (userRequest.getCategoria() != null) user.setCategoria(userRequest.getCategoria());
        if (userRequest.getPais() != null) user.setPais(userRequest.getPais());
        if (userRequest.getClasificacion() != null) user.setClasificacion(userRequest.getClasificacion());
        if (userRequest.getObservaciones() != null) user.setObservaciones(userRequest.getObservaciones());

        if (strRoles != null && !strRoles.isEmpty()) {
            Set<Rol> roles = new HashSet<>();
            strRoles.forEach(role -> {
                try {
                    RoleName rn = RoleName.valueOf(role);
                    Rol r = roleRepository.findByName(rn)
                            .orElseThrow(() -> new RuntimeException("Error: Rol no encontrado: " + role));
                    roles.add(r);
                } catch (IllegalArgumentException e) {
                   // Ignore or handle
                }
            });
            user.setRoles(roles);
        }

        if (userRequest.getArea() != null && userRequest.getArea().getId() != null) {
            areaRepository.findById(userRequest.getArea().getId())
                .ifPresent(user::setArea);
        } else if (userRequest.getArea() == null) {
            user.setArea(null);
        }

        Usuario savedUser = userRepository.save(user);
        
        // Sincronizar en la tabla de proveedores físicos
        proveedorService.syncToProveedoresTable(savedUser);

        return mapToDTO(savedUser);
    }

    @Transactional
    public void delete(Long id) {
        // Restricción Autoridad
        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        Usuario currentUser = userRepository.findByUsername(currentUsername).orElse(null);
        if (currentUser != null && currentUser.isAutoridad() && !currentUser.hasAnyRole(RoleName.ROLE_ADMINISTRADOR, RoleName.ROLE_SUPER_ADMIN, RoleName.ROLE_ADMIN)) {
            Usuario targetUser = userRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
            if (targetUser.hasAnyRole(RoleName.ROLE_ADMINISTRADOR, RoleName.ROLE_SUPER_ADMIN, RoleName.ROLE_ADMIN)) {
                throw new RuntimeException("Error: Una Autoridad no puede eliminar un Administrador.");
            }
        }

        Usuario user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        user.setEliminado(true);
        userRepository.save(user);
        
        // Eliminar de la tabla física de proveedores
        proveedorService.deleteFromPhysicalTable(id);
    }

    @Transactional
    public void toggleStatus(Long id) {
        // Restricción Autoridad
        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        Usuario currentUser = userRepository.findByUsername(currentUsername).orElse(null);
        if (currentUser != null && currentUser.isAutoridad() && !currentUser.hasAnyRole(RoleName.ROLE_ADMINISTRADOR, RoleName.ROLE_SUPER_ADMIN, RoleName.ROLE_ADMIN)) {
            Usuario targetUser = userRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
            if (targetUser.hasAnyRole(RoleName.ROLE_ADMINISTRADOR, RoleName.ROLE_SUPER_ADMIN, RoleName.ROLE_ADMIN)) {
                throw new RuntimeException("Error: Una Autoridad no puede cambiar el estado de un Administrador.");
            }
        }

        Usuario user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        user.setEnabled(!user.getEnabled());
        Usuario savedUser = userRepository.save(user);
        
        // Sincronizar estado en la tabla física de proveedores
        proveedorService.syncToProveedoresTable(savedUser);
    }

    @Transactional
    public void resetPassword(Long id, PasswordResetRequest request) {
        // 1. Get Current Admin
        String adminUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        Usuario admin = userRepository.findByUsername(adminUsername)
                .orElseThrow(() -> new RuntimeException("Administrador no encontrado"));

        // 2. Verify Admin Password
        if (!encoder.matches(request.getAdminPassword(), admin.getPassword())) {
            throw new RuntimeException("Error: La contraseña del administrador es incorrecta. No se puede autorizar el cambio.");
        }

        // Restricción Autoridad
        if (admin.isAutoridad() && !admin.hasAnyRole(RoleName.ROLE_ADMINISTRADOR, RoleName.ROLE_SUPER_ADMIN, RoleName.ROLE_ADMIN)) {
            Usuario targetUser = userRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
            if (targetUser.hasAnyRole(RoleName.ROLE_ADMINISTRADOR, RoleName.ROLE_SUPER_ADMIN, RoleName.ROLE_ADMIN)) {
                throw new RuntimeException("Error: Una Autoridad no puede restablecer la contraseña de un Administrador.");
            }
        }

        // 3. Update User Password
        Usuario user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        user.setPassword(encoder.encode(request.getNewPassword()));
        user.setRequiereCambioPassword(true);
        userRepository.save(user);
    }

    public UsuarioDTO uploadPhoto(Long id, MultipartFile file) throws IOException {
        Usuario user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        String subPath = "fotos/" + id;
        Path finalDir = Paths.get(uploadDir).resolve(subPath);
        Files.createDirectories(finalDir);

        String fileName = "perfil.jpg";
        Path targetPath = finalDir.resolve(fileName);
        
        // Reemplazar si ya existe
        Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

        // Crear JSON con información del usuario como pidió el usuario
        String jsonInfo = String.format(
            "{\n  \"usuario\": \"%s\",\n  \"nombre\": \"%s %s\",\n  \"email\": \"%s\",\n  \"id\": %d,\n  \"fecha_foto\": \"%s\"\n}",
            user.getUsername(), user.getNombre(), user.getApellido(), user.getEmail(), user.getId(), java.time.LocalDateTime.now()
        );
        Files.write(finalDir.resolve("datos_usuario.json"), jsonInfo.getBytes());

        // Guardamos solo la ruta relativa en la base de datos para mayor flexibilidad
        String relativePath = subPath + "/" + fileName;
        user.setUrlFoto(relativePath);
        userRepository.save(user);

        return mapToDTO(user);
    }

    private UsuarioDTO mapToDTO(Usuario user) {
        return UsuarioDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .nombre(user.getNombre())
                .apellido(user.getApellido())
                .enabled(Boolean.TRUE.equals(user.getEnabled()))
                .roles(user.getRoles() != null 
                    ? user.getRoles().stream()
                        .map(r -> r.getName() != null ? r.getName().name() : "S_R")
                        .collect(Collectors.toSet()) 
                    : new HashSet<>())
                .primeraConexion(user.getPrimeraConexion())
                .ultimaConexion(user.getUltimaConexion())
                .ultimaActividad(user.getUltimaActividad())
                .requiereCambioPassword(Boolean.TRUE.equals(user.getRequiereCambioPassword()))
                .fechaCreacion(user.getFechaCreacion())
                .areaId(user.getArea() != null ? user.getArea().getId() : null)
                .areaNombre(user.getArea() != null ? user.getArea().getNombre() : null)
                .urlFoto(user.getUrlFoto())
                .build();
    }
}
