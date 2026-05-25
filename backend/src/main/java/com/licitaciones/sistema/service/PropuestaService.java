package com.licitaciones.sistema.service;

import com.licitaciones.sistema.dto.EvaluadorPropuestaDTO;
import com.licitaciones.sistema.entity.*;
import com.licitaciones.sistema.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class PropuestaService {

    @Autowired
    private PropuestaRepository propuestaRepository;

    @Autowired
    private DocumentoPropuestaRepository documentoPropuestaRepository;

    @Autowired
    private VersionPropuestaRepository versionPropuestaRepository;

    @Autowired
    private EvaluacionRepository evaluacionRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private LicitacionRepository licitacionRepository;

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private NotificacionService notificacionService;

    @Autowired
    private CalendarioEventoService calendarioEventoService;

    @Autowired
    private ParticipanteService participanteService;



    public List<Propuesta> findAll() {
        return propuestaRepository.findAll();
    }

    public List<Propuesta> findAsignadasAEvaluador(Long evaluadorId) {
        return evaluacionRepository.findBandejaByEvaluadorId(evaluadorId).stream()
                .map(Evaluacion::getPropuesta)
                .filter(java.util.Objects::nonNull)
                .collect(java.util.stream.Collectors.toMap(
                        Propuesta::getId,
                        this::attachEvaluadores,
                        (first, duplicate) -> first,
                        java.util.LinkedHashMap::new
                ))
                .values().stream().collect(java.util.stream.Collectors.toList());
    }

    public List<Propuesta> findAllConEvaluadores() {
        return propuestaRepository.findAllForPayload().stream()
                .map(this::attachEvaluadores)
                .collect(java.util.stream.Collectors.toList());
    }

    public List<Propuesta> findByUsuario(Usuario usuario) {
        return propuestaRepository.findByUsuario(usuario);
    }

    public List<Propuesta> findByLicitacion(Long licitacionId) {
        return propuestaRepository.findByLicitacionId(licitacionId);
    }

    public Optional<Propuesta> findById(Long id) {
        return propuestaRepository.findById(id).map(this::attachEvaluadores);
    }

    public boolean isEvaluatorAssigned(Long propuestaId, Long evaluadorId) {
        return evaluacionRepository.findByPropuestaIdAndEvaluadorIdAndActiveTrue(propuestaId, evaluadorId).isPresent();
    }

    private Propuesta attachEvaluadores(Propuesta propuesta) {
        List<Evaluacion> evaluaciones = evaluacionRepository.findAllByPropuestaIdConEvaluador(propuesta.getId());

        // VISIBILIDAD RESTRINGIDA: non-admin evaluators only see their own evaluation
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !auth.getPrincipal().equals("anonymousUser")) {
            String username = auth.getName();
            Optional<Usuario> userOpt = usuarioRepository.findByUsername(username);
            if (userOpt.isPresent()) {
                Usuario user = userOpt.get();
                boolean isAdmin = user.getRoles().stream()
                        .anyMatch(r -> r.getName().name().contains("ADMIN") || r.getName().name().contains("GESTOR_LICITACIONES"));
                boolean isEvaluator = user.getRoles().stream()
                        .anyMatch(r -> r.getName().name().contains("EVALUADOR"));
                
                if (isEvaluator && !isAdmin) {
                    final Long userAreaId = user.getArea() != null ? user.getArea().getId() : null;
                    evaluaciones = evaluaciones.stream()
                            .filter(e -> e.getEvaluador().getId().equals(user.getId())
                                    || (userAreaId != null && e.getEvaluador().getArea() != null
                                        && e.getEvaluador().getArea().getId().equals(userAreaId)))
                            .collect(java.util.stream.Collectors.toList());
                }
            }
        }

        List<EvaluadorPropuestaDTO> evaluadores = evaluaciones.stream()
                .filter(e -> e.getEvaluador() != null)
                .map(this::toEvaluadorPropuestaDTO)
                .collect(java.util.stream.Collectors.toList());

        propuesta.setEvaluadores(evaluadores);
        return propuesta;
    }

    private EvaluadorPropuestaDTO toEvaluadorPropuestaDTO(Evaluacion evaluacion) {
        Usuario evaluador = evaluacion.getEvaluador();
        boolean calificado = evaluacion.getEstadoTramite() == EstadoTramite.FINALIZADO
                || (evaluacion.getPuntajesJson() != null && !evaluacion.getPuntajesJson().isBlank());

        return EvaluadorPropuestaDTO.builder()
                .evaluacionId(evaluacion.getId())
                .evaluadorId(evaluador.getId())
                .nombreCompleto(evaluador.getNombreCompleto())
                .username(evaluador.getUsername())
                .rolEvaluador(resolveEvaluatorRole(evaluacion))
                .especialidad(evaluacion.getEspecialidadEvaluador() != null ? evaluacion.getEspecialidadEvaluador().name() : "GENERAL")
                .areaNombre(evaluador.getArea() != null ? evaluador.getArea().getNombre() : "GENERAL")
                .estadoTramite(evaluacion.getEstadoTramite() != null ? evaluacion.getEstadoTramite().name() : "BORRADOR")
                .estadoEvaluacion(calificado ? "Calificado" : "Pendiente")
                .resultado(evaluacion.getResultado() != null ? evaluacion.getResultado().name() : "PENDIENTE")
                .calificado(calificado)
                .puntajeTotal(calificado ? evaluacion.getPuntajeTotal() : null)
                .estrellas(calificado ? evaluacion.getEstrellas() : null)
                .observaciones(calificado ? evaluacion.getObservaciones() : null)
                .fecha(calificado ? evaluacion.getFecha() : null)
                // Enterprise audit and scoring fields
                .assignedBy(evaluacion.getAssignedBy())
                .updatedBy(evaluacion.getUpdatedBy())
                .reassignedBy(evaluacion.getReassignedBy())
                .assignedAt(evaluacion.getAssignedAt())
                .updatedAt(evaluacion.getUpdatedAt())
                .deadline(evaluacion.getDeadline())
                .scoreTotal(evaluacion.getScoreTotal())
                .scoreTecnico(evaluacion.getScoreTecnico())
                .scoreFinanciero(evaluacion.getScoreFinanciero())
                .scoreLegal(evaluacion.getScoreLegal())
                .build();
    }


    private String resolveEvaluatorRole(Evaluacion evaluacion) {
        if (evaluacion.getEspecialidadEvaluador() != null) {
            return "ROLE_EVALUADOR_" + evaluacion.getEspecialidadEvaluador().name();
        }
        return evaluacion.getEvaluador().getRoles().stream()
                .map(r -> r.getName().name())
                .filter(r -> r.startsWith("ROLE_EVALUADOR"))
                .findFirst()
                .orElse("ROLE_EVALUADOR_GENERAL");
    }

    public Optional<Propuesta> findByLicitacionAndUsuario(Long licitacionId, Usuario user) {
        Licitacion licitacion = licitacionRepository.findById(licitacionId)
                .orElseThrow(() -> new RuntimeException("Licitación no encontrada"));
        return propuestaRepository.findTopByLicitacionAndUsuarioOrderByFechaEnvioDesc(licitacion, user);
    }

    @Transactional
    public Evaluacion asignarEvaluador(Long propuestaId, Long evaluadorId) {
        Optional<Evaluacion> existente = evaluacionRepository.findByPropuestaIdAndEvaluadorId(propuestaId, evaluadorId);
        if (existente.isPresent()) {
            return existente.get();
        }

        Propuesta propuesta = propuestaRepository.findById(propuestaId)
                .orElseThrow(() -> new RuntimeException("Propuesta no encontrada"));
        Usuario evaluador = usuarioRepository.findById(evaluadorId)
                .orElseThrow(() -> new RuntimeException("Evaluador no encontrado"));

        Evaluacion evaluacion = new Evaluacion();
        evaluacion.setPropuesta(propuesta);
        evaluacion.setEvaluador(evaluador);
        evaluacion.setLicitacion(propuesta.getLicitacion());
        evaluacion.setEspecialidadEvaluador(resolveEspecialidad(evaluador));
        evaluacion.setFecha(LocalDateTime.now());
        evaluacion.setEstadoTramite(EstadoTramite.BORRADOR);
        evaluacion.setResultado(EstadoEvaluacion.PENDIENTE);
        evaluacion.setPuntajeTotal(0);
        evaluacion.setEstrellas(0);
        evaluacion.setSinConflictoInteres(true);
        evaluacion.setPuntajesJson(null);
        evaluacion.setRespuestasJson(null);
        evaluacion.setObservaciones(null);
        evaluacion.setComentarios(null);

        Evaluacion saved = evaluacionRepository.save(evaluacion);

        notificacionService.crear(
                evaluador,
                "Nueva Asignación de Evaluación",
                "Se le ha asignado la evaluación de la propuesta " + propuesta.getEmpresaNombre(),
                "EVALUACION",
                "fa-users-gear",
                "blue",
                "/evaluaciones/evaluar/" + propuestaId
        );

        return saved;
    }

    private EvaluadorEspecialidad resolveEspecialidad(Usuario evaluador) {
        java.util.Set<RoleName> roles = evaluador.getRoles().stream()
                .map(Rol::getName)
                .collect(java.util.stream.Collectors.toSet());
        if (roles.contains(RoleName.ROLE_EVALUADOR_FINANCIERO)) return EvaluadorEspecialidad.FINANCIERO;
        if (roles.contains(RoleName.ROLE_EVALUADOR_TECNICO)) return EvaluadorEspecialidad.TECNICO;
        if (roles.contains(RoleName.ROLE_EVALUADOR_LEGAL)) return EvaluadorEspecialidad.LEGAL;
        return EvaluadorEspecialidad.GENERAL;
    }

    @Transactional
    public Propuesta saveWithFiles(Propuesta propuesta, MultipartFile[] files, boolean isAdmin) throws IOException {
        // Enterprise Validation: Check if user is a VALIDATED Participant
        if (!isAdmin) {
            Participante p = participanteService.findByLicitacionAndUsuario(
                propuesta.getLicitacion().getId(), propuesta.getUsuario().getId())
                .orElseThrow(() -> new RuntimeException("Debe inscribirse en la licitación antes de enviar una propuesta."));
            
            if (p.getEstado() != EstadoParticipante.VALIDADO) {
                throw new RuntimeException("Su estado de participación es " + p.getEstado() + ". Debe estar VALIDADO para enviar propuestas.");
            }
            propuesta.setParticipante(p);
        }

        // Logging for debugging (will help find why 0 is arriving)
        System.out.println("Processing Proposal: id=" + propuesta.getId() + 
                           ", estado=" + propuesta.getEstado() + 
                           ", monto=" + propuesta.getMontoOfertado());

        // Validations - Only required for final submission (ENVIADA)
        if (propuesta.getEstado() == EstadoPropuesta.ENVIADA) {
            if (propuesta.getMontoOfertado() == null || propuesta.getMontoOfertado() <= 0) {
                String errorMsg = "Error en validación: El monto ofertado es " + 
                                  (propuesta.getMontoOfertado() == null ? "nulo" : propuesta.getMontoOfertado()) + 
                                  ". Debe ser mayor a 0 para enviar la propuesta.";
                throw new RuntimeException(errorMsg);
            }
    
            if (propuesta.getEmpresaNombre() == null || propuesta.getEmpresaNombre().isBlank()) {
                throw new RuntimeException("El nombre de la empresa es obligatorio para enviar la propuesta definitiva.");
            }
        }

        // Enforce deadline
        Licitacion licitacion = licitacionRepository.findById(propuesta.getLicitacion().getId())
                .orElseThrow(() -> new RuntimeException("Licitación no encontrada"));
        
        if (licitacion.getFechaCierre() != null && LocalDateTime.now().isAfter(licitacion.getFechaCierre())) {
            throw new RuntimeException("El plazo de postulación ha finalizado. Fecha de cierre: " + licitacion.getFechaCierre());
        }

        if (!licitacion.getEstado().equals(EstadoLicitacion.PUBLICADA)) {
            throw new RuntimeException("Solo se pueden enviar propuestas a licitaciones en estado PUBLICADA");
        }

        // Handle versioning if it's an update
        if (propuesta.getId() != null) {
            createVersionSnapshot(propuesta);
            propuesta.setVersionActual(propuesta.getVersionActual() == null ? 1 : propuesta.getVersionActual() + 1);
        } else {
            propuesta.setVersionActual(1);
        }

        if (propuesta.getEstado() == EstadoPropuesta.ENVIADA) {
            propuesta.setFechaEnvio(LocalDateTime.now());
        }

        Propuesta saved = propuestaRepository.save(propuesta);

        // Notificar recepción de propuesta
        notificacionService.crearGlobal(
            "Nueva Propuesta", 
            "Empresa " + saved.getEmpresaNombre() + " ha enviado una propuesta para: " + licitacion.getTitulo(), 
            "PROPUESTA", 
            "fa-file-invoice-dollar", 
            "#36b9cc", 
            "/propuestas"
        );

        // Evento de Calendario: Propuesta Recibida
        calendarioEventoService.registrarEvento(
            "Propuesta Recibida: " + saved.getEmpresaNombre(),
            "Se ha recibido una nueva propuesta para la licitación: " + licitacion.getTitulo(),
            com.licitaciones.sistema.entity.TipoEvento.PROPUESTA_RECIBIDA,
            saved.getFechaEnvio(),
            saved.getId(),
            "propuesta",
            2,
            saved.getUsuario()
        );

        // Handle files
        if (files != null && files.length > 0) {
            String subPath = "LIC-" + saved.getLicitacion().getId() + "/propuestas";
            
            for (int i = 0; i < files.length; i++) {
                MultipartFile file = files[i];
                // Guarda en local con sub-ruta y obtiene la URL
                String fileUrl = fileStorageService.saveFile(file, subPath);

                // El primer archivo se guarda como la URL principal de la propuesta
                if (i == 0) {
                    saved.setArchivoUrl(fileUrl);
                    propuestaRepository.save(saved);
                }

                documentoPropuestaRepository.save(DocumentoPropuesta.builder()
                        .propuesta(saved)
                        .nombreArchivo(file.getOriginalFilename())
                        .rutaArchivo(fileUrl)
                        .tipoArchivo(file.getContentType())
                        .build());
            }
        }

        return saved;
    }

    private void createVersionSnapshot(Propuesta p) {
        try {
            // Build a safe snapshot Map to avoid JPA lazy-loading and circular reference issues
            java.util.Map<String, Object> snapshot = new java.util.LinkedHashMap<>();
            snapshot.put("id", p.getId());
            snapshot.put("nombre", p.getNombre());
            snapshot.put("descripcion", p.getDescripcion());
            snapshot.put("montoOfertado", p.getMontoOfertado());
            snapshot.put("moneda", p.getMoneda());
            snapshot.put("tiempoEntregaDias", p.getTiempoEntregaDias());
            snapshot.put("empresaNombre", p.getEmpresaNombre());
            snapshot.put("identificacionRuc", p.getIdentificacionRuc());
            snapshot.put("contactoNombre", p.getContactoNombre());
            snapshot.put("contactoEmail", p.getContactoEmail());
            snapshot.put("contactoTelefono", p.getContactoTelefono());
            snapshot.put("estado", p.getEstado() != null ? p.getEstado().name() : null);
            snapshot.put("detalleCosto", p.getDetalleCosto());
            snapshot.put("datosAreaJson", p.getDatosAreaJson());
            snapshot.put("comentarios", p.getComentarios());
            snapshot.put("archivoUrl", p.getArchivoUrl());
            snapshot.put("declaracionVeracidad", p.isDeclaracionVeracidad());
            snapshot.put("aceptacionBases", p.isAceptacionBases());
            snapshot.put("noConflictoInteres", p.isNoConflictoInteres());
            snapshot.put("fechaEnvio", p.getFechaEnvio() != null ? p.getFechaEnvio().toString() : null);
            snapshot.put("licitacionId", p.getLicitacion() != null ? p.getLicitacion().getId() : null);
            snapshot.put("usuarioId", p.getUsuario() != null ? p.getUsuario().getId() : null);

            com.fasterxml.jackson.databind.ObjectMapper safeMapper = new com.fasterxml.jackson.databind.ObjectMapper();
            safeMapper.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
            String json = safeMapper.writeValueAsString(snapshot);

            versionPropuestaRepository.save(VersionPropuesta.builder()
                    .propuesta(p)
                    .numeroVersion(p.getVersionActual())
                    .datosJson(json)
                    .fechaVersion(LocalDateTime.now())
                    .build());
        } catch (Exception e) {
            // Log but do not fail the main save operation
            System.err.println("Warning: Could not save version snapshot for propuesta " + p.getId() + ": " + e.getMessage());
        }
    }

    public List<VersionPropuesta> getHistory(Long id) {
        Propuesta p = propuestaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Propuesta no encontrada"));
        return versionPropuestaRepository.findByPropuestaOrderByNumeroVersionDesc(p);
    }

    @Transactional
    public Propuesta validarPropuesta(Long id) {
        Propuesta p = propuestaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Propuesta no encontrada"));
        
        if (p.getEstado() != EstadoPropuesta.ENVIADA) {
            throw new RuntimeException("Solo se pueden validar propuestas en estado ENVIADA");
        }
        
        p.setEstado(EstadoPropuesta.VALIDADA);
        return propuestaRepository.save(p);
    }

    @Transactional
    public Propuesta rechazarPropuesta(Long id, String motivo) {
        Propuesta p = propuestaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Propuesta no encontrada"));
        
        if (p.getEstado() != EstadoPropuesta.ENVIADA) {
            throw new RuntimeException("Solo se pueden rechazar propuestas en estado ENVIADA");
        }

        if (motivo == null || motivo.isBlank()) {
            throw new RuntimeException("El motivo de rechazo es obligatorio");
        }
        
        p.setEstado(EstadoPropuesta.RECHAZADA);
        p.setMotivoRechazo(motivo);
        return propuestaRepository.save(p);
    }

    @Transactional
    public Propuesta marcarIncompleta(Long id, String motivo) {
        Propuesta p = propuestaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Propuesta no encontrada"));
        
        p.setEstado(EstadoPropuesta.INCOMPLETA);
        p.setMotivoRechazo(motivo);
        return propuestaRepository.save(p);
    }

    public List<Usuario> obtenerEvaluadoresDisponibles() {
        return usuarioRepository.findByRoleNameIn(java.util.List.of(
            RoleName.ROLE_EVALUADOR,
            RoleName.ROLE_EVALUADOR_GENERAL,
            RoleName.ROLE_EVALUADOR_FINANCIERO,
            RoleName.ROLE_EVALUADOR_TECNICO,
            RoleName.ROLE_EVALUADOR_LEGAL
        ));
    }

    public List<java.util.Map<String, Object>> sugerirEvaluadores(Long id) {
        Propuesta propuesta = propuestaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Propuesta no encontrada"));
        Licitacion licitacion = propuesta.getLicitacion();

        String combinedText = (propuesta.getNombre() + " " + propuesta.getDescripcion() + " " + licitacion.getTitulo() + " " + licitacion.getDescripcion()).toLowerCase();
        double budget = propuesta.getMontoOfertado() != null ? propuesta.getMontoOfertado() : (licitacion.getPresupuesto() != null ? licitacion.getPresupuesto() : 0.0);

        List<Usuario> allEvaluators = obtenerEvaluadoresDisponibles();
        List<java.util.Map<String, Object>> suggestions = new java.util.ArrayList<>();

        boolean needsFinancial = budget > 100000;
        boolean needsTechnical = combinedText.contains("tecnolog") || combinedText.contains("comput") || combinedText.contains("sistemas") || combinedText.contains("software") || combinedText.contains("licencia") || combinedText.contains("servidor") || combinedText.contains("redes");
        boolean needsLegal = combinedText.contains("contrato") || combinedText.contains("legal") || combinedText.contains("juridic") || combinedText.contains("ley") || combinedText.contains("normativ") || combinedText.contains("pliego");

        for (Usuario ev : allEvaluators) {
            java.util.Set<RoleName> roles = ev.getRoles().stream().map(Rol::getName).collect(java.util.stream.Collectors.toSet());
            String reason = null;
            String especialidad = "GENERAL";

            if (roles.contains(RoleName.ROLE_EVALUADOR_FINANCIERO) && needsFinancial) {
                reason = "Presupuesto alto (" + String.format("$%,.2f", budget) + ") requiere análisis de riesgo financiero.";
                especialidad = "FINANCIERO";
            } else if (roles.contains(RoleName.ROLE_EVALUADOR_TECNICO) && needsTechnical) {
                reason = "Palabras clave tecnológicas detectadas en el expediente.";
                especialidad = "TECNICO";
            } else if (roles.contains(RoleName.ROLE_EVALUADOR_LEGAL) && needsLegal) {
                reason = "Bases complejas o términos contractuales requieren opinión legal.";
                especialidad = "LEGAL";
            } else if (roles.contains(RoleName.ROLE_EVALUADOR_GENERAL) || roles.contains(RoleName.ROLE_EVALUADOR)) {
                reason = "Evaluador general asignable por defecto para validación administrativa.";
                especialidad = "GENERAL";
            }

            if (reason != null) {
                java.util.Map<String, Object> sug = new java.util.HashMap<>();
                sug.put("evaluadorId", ev.getId());
                sug.put("username", ev.getUsername());
                sug.put("nombreCompleto", ev.getNombreCompleto());
                sug.put("especialidad", especialidad);
                sug.put("areaNombre", ev.getArea() != null ? ev.getArea().getNombre() : "GENERAL");
                sug.put("razonSugerencia", reason);
                suggestions.add(sug);
            }
        }

        if (suggestions.isEmpty()) {
            for (Usuario ev : allEvaluators) {
                java.util.Map<String, Object> sug = new java.util.HashMap<>();
                sug.put("evaluadorId", ev.getId());
                sug.put("username", ev.getUsername());
                sug.put("nombreCompleto", ev.getNombreCompleto());
                sug.put("especialidad", "GENERAL");
                sug.put("areaNombre", ev.getArea() != null ? ev.getArea().getNombre() : "GENERAL");
                sug.put("razonSugerencia", "Asignable para validación de rúbrica general.");
                suggestions.add(sug);
            }
        }

        return suggestions;
    }

    @Transactional
    public void guardarAsignacionEvaluadores(Long id, List<java.util.Map<String, Object>> evaluadoresPayload, String adminUsername) {
        Propuesta propuesta = propuestaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Propuesta no encontrada"));

        List<Evaluacion> existingEvals = evaluacionRepository.findAllByPropuestaId(id);
        
        java.util.Set<Long> payloadEvaluatorIds = new java.util.HashSet<>();
        
        Usuario admin = usuarioRepository.findByUsername(adminUsername)
                .orElseThrow(() -> new RuntimeException("Administrador no encontrado"));
        String adminRoleName = admin.getRoles().stream()
                .map(r -> r.getName().name().replace("ROLE_", ""))
                .findFirst().orElse("ADMINISTRADOR");
        String auditUserDetail = admin.getNombreCompleto() + " (" + adminRoleName + ")";

        for (java.util.Map<String, Object> payload : evaluadoresPayload) {
            Number evIdNum = (Number) payload.get("evaluadorId");
            if (evIdNum == null) continue;
            Long evaluadorId = evIdNum.longValue();
            payloadEvaluatorIds.add(evaluadorId);

            String specStr = (String) payload.get("especialidad");
            EvaluadorEspecialidad especialidad = EvaluadorEspecialidad.GENERAL;
            if (specStr != null) {
                try {
                    especialidad = EvaluadorEspecialidad.valueOf(specStr);
                } catch (Exception e) {}
            }

            String tipoStr = (String) payload.get("tipoEvaluador");
            TipoEvaluador tipoEvaluador = TipoEvaluador.OBLIGATORIO;
            if (tipoStr != null) {
                try {
                    tipoEvaluador = TipoEvaluador.valueOf(tipoStr);
                } catch (Exception e) {}
            }

            LocalDateTime deadline = null;
            if (payload.get("deadline") != null) {
                try {
                    deadline = LocalDateTime.parse((String) payload.get("deadline"));
                } catch (Exception e) {
                    try {
                        deadline = java.time.LocalDate.parse((String) payload.get("deadline")).atStartOfDay();
                    } catch (Exception ex) {}
                }
            }

            Usuario evaluador = usuarioRepository.findById(evaluadorId)
                    .orElseThrow(() -> new RuntimeException("Evaluador no encontrado"));

            // 1. CONFLICT OF INTEREST CHECK
            if (evaluador.getEmpresaNombre() != null && !evaluador.getEmpresaNombre().isBlank() && 
                evaluador.getEmpresaNombre().equalsIgnoreCase(propuesta.getEmpresaNombre())) {
                throw new RuntimeException("ConflictOfInterest: El evaluador " + evaluador.getNombreCompleto() + " pertenece a la misma empresa proveedora que presenta la propuesta.");
            }
            if (evaluador.getRuc() != null && !evaluador.getRuc().isBlank() && 
                evaluador.getRuc().equalsIgnoreCase(propuesta.getIdentificacionRuc())) {
                throw new RuntimeException("ConflictOfInterest: El RUC del evaluador " + evaluador.getNombreCompleto() + " coincide con el de la propuesta.");
            }
            if (evaluador.getId().equals(propuesta.getUsuario().getId())) {
                throw new RuntimeException("ConflictOfInterest: El evaluador " + evaluador.getNombreCompleto() + " no puede evaluar su propia propuesta.");
            }
            if (evaluador.getArea() != null && propuesta.getUsuario().getArea() != null && 
                evaluador.getArea().getId().equals(propuesta.getUsuario().getArea().getId())) {
                throw new RuntimeException("ConflictOfInterest: El evaluador " + evaluador.getNombreCompleto() + " pertenece al mismo departamento interno que formuló la propuesta.");
            }

            Optional<Evaluacion> existente = existingEvals.stream()
                    .filter(e -> e.getEvaluador().getId().equals(evaluadorId))
                    .findFirst();

            if (existente.isPresent()) {
                Evaluacion eval = existente.get();
                boolean changed = false;
                
                if (!eval.getActive()) {
                    eval.setActive(true);
                    eval.setResultado(EstadoEvaluacion.PENDIENTE);
                    eval.setEstadoTramite(EstadoTramite.BORRADOR);
                    eval.setPuntajesJson(null);
                    eval.setRespuestasJson(null);
                    eval.setPuntajeTotal(0);
                    eval.setEstrellas(0);
                    eval.setComentarios(null);
                    eval.setObservaciones(null);
                    changed = true;
                }

                if (deadline != null && !deadline.equals(eval.getDeadline())) {
                    eval.setDeadline(deadline);
                    changed = true;
                }
                
                if (especialidad != eval.getEspecialidadEvaluador()) {
                    eval.setEspecialidadEvaluador(especialidad);
                    changed = true;
                }

                if (tipoEvaluador != eval.getTipoEvaluador()) {
                    eval.setTipoEvaluador(tipoEvaluador);
                    changed = true;
                }

                if (changed) {
                    eval.setUpdatedBy(auditUserDetail);
                    eval.setUpdatedAt(LocalDateTime.now());
                    evaluacionRepository.save(eval);
                    
                    calendarioEventoService.registrarEvento(
                        "Asignación Actualizada",
                        "Se actualizó la fecha límite o especialidad de la evaluación técnica para " + eval.getEvaluador().getNombreCompleto() + " en la propuesta de " + propuesta.getEmpresaNombre(),
                        TipoEvento.EVENTO_GENERAL,
                        LocalDateTime.now(),
                        propuesta.getId(),
                        "propuesta",
                        2,
                        admin
                    );
                }
            } else {
                Evaluacion eval = new Evaluacion();
                eval.setPropuesta(propuesta);
                eval.setEvaluador(evaluador);
                eval.setLicitacion(propuesta.getLicitacion());
                eval.setEspecialidadEvaluador(especialidad);
                eval.setTipoEvaluador(tipoEvaluador);
                eval.setActive(true);
                eval.setFecha(LocalDateTime.now());
                eval.setEstadoTramite(EstadoTramite.BORRADOR);
                eval.setResultado(EstadoEvaluacion.PENDIENTE);
                eval.setAssignedBy(auditUserDetail);
                eval.setAssignedAt(LocalDateTime.now());
                eval.setDeadline(deadline);
                eval.setPuntajeTotal(0);
                eval.setEstrellas(0);
                eval.setSinConflictoInteres(true);

                evaluacionRepository.save(eval);

                notificacionService.crear(
                        evaluador,
                        "Nueva Asignación de Evaluación",
                        "Has sido asignado para evaluar la propuesta de " + propuesta.getEmpresaNombre() + ". Fecha límite: " + (deadline != null ? deadline.toLocalDate() : "Sin fecha límite"),
                        "EVALUACION",
                        "fa-clipboard-check",
                        "blue",
                        "/evaluaciones/evaluar/" + propuesta.getId()
                );

                calendarioEventoService.registrarEvento(
                        "Evaluador Asignado: " + evaluador.getNombreCompleto(),
                        admin.getNombreCompleto() + " asignó a " + evaluador.getNombreCompleto() + " como evaluador " + especialidad.name() + " (" + tipoEvaluador + ") para la propuesta de " + propuesta.getEmpresaNombre(),
                        TipoEvento.EVALUACION_EN_CURSO,
                        LocalDateTime.now(),
                        propuesta.getId(),
                        "propuesta",
                        2,
                        admin
                );
            }
        }

        for (Evaluacion eval : existingEvals) {
            if (eval.getActive() && !payloadEvaluatorIds.contains(eval.getEvaluador().getId())) {
                if (eval.getEstadoTramite() == EstadoTramite.FINALIZADO) {
                    throw new RuntimeException("No se puede reemplazar o desasignar al evaluador " + eval.getEvaluador().getNombreCompleto() + " porque ya ha finalizado su calificación.");
                }
                
                eval.setActive(false);
                eval.setResultado(EstadoEvaluacion.REASIGNADA);
                eval.setReassignedBy(auditUserDetail);
                eval.setUpdatedAt(LocalDateTime.now());
                evaluacionRepository.save(eval);

                calendarioEventoService.registrarEvento(
                        "Evaluador Removido: " + eval.getEvaluador().getNombreCompleto(),
                        admin.getNombreCompleto() + " removió al evaluador " + eval.getEvaluador().getNombreCompleto() + " de la propuesta de " + propuesta.getEmpresaNombre(),
                        TipoEvento.EVENTO_GENERAL,
                        LocalDateTime.now(),
                        propuesta.getId(),
                        "propuesta",
                        2,
                        admin
                );
            }
        }

        long activeCount = evaluadoresPayload.size();
        if (activeCount == 0) {
            propuesta.setEstado(EstadoPropuesta.PENDIENTE_EVALUACION);
        } else {
            propuesta.setEstado(EstadoPropuesta.EN_EVALUACION);
        }
        propuestaRepository.save(propuesta);
    }
}

