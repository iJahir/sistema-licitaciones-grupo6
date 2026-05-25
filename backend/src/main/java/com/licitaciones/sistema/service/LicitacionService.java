package com.licitaciones.sistema.service;

import com.licitaciones.sistema.entity.DocumentoLicitacion;
import com.licitaciones.sistema.entity.Licitacion;
import com.licitaciones.sistema.entity.RoleName;
import com.licitaciones.sistema.repository.DocumentoLicitacionRepository;
import com.licitaciones.sistema.repository.LicitacionRepository;
import com.licitaciones.sistema.entity.Usuario;
import com.licitaciones.sistema.entity.LicitacionHito;
import com.licitaciones.sistema.entity.LicitacionHistorial;
import com.licitaciones.sistema.repository.LicitacionHitoRepository;
import com.licitaciones.sistema.repository.LicitacionHistorialRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.Predicate;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.licitaciones.sistema.entity.Contrato;
import com.licitaciones.sistema.service.ContratoService;

@Service
public class LicitacionService {

    @Autowired
    private LicitacionRepository licitacionRepository;

    @Autowired
    private DocumentoLicitacionRepository documentoLicitacionRepository;

    @Autowired
    private LicitacionHitoRepository hitoRepository;

    @Autowired
    private LicitacionHistorialRepository historialRepository;

    @Autowired
    private com.licitaciones.sistema.repository.PropuestaRepository propuestaRepository;

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private ObjectMapper objectMapper; // Para serializar a JSON

    @Autowired
    private com.licitaciones.sistema.service.NotificacionService notificacionService;

    @Autowired
    private CalendarioEventoService calendarioEventoService;

    @Autowired
    private AuditoriaService auditoriaService;

    @Autowired
    private ContratoService contratoService;

    @Autowired
    private com.licitaciones.sistema.repository.EvaluacionRepository evaluacionRepository;

    private String normalize(String s) {
        if (s == null) return "";
        String normalized = java.text.Normalizer.normalize(s, java.text.Normalizer.Form.NFD);
        normalized = normalized.replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        normalized = normalized.replaceAll("[^a-zA-Z0-9\\s]", " ");
        normalized = normalized.replaceAll("\\s+", " ").trim().toLowerCase();
        return normalized;
    }

    private int getLevenshteinDistance(String s1, String s2) {
        int[] prev = new int[s2.length() + 1];
        int[] curr = new int[s2.length() + 1];
        for (int j = 0; j <= s2.length(); j++) {
            prev[j] = j;
        }
        for (int i = 1; i <= s1.length(); i++) {
            curr[0] = i;
            for (int j = 1; j <= s2.length(); j++) {
                int cost = (s1.charAt(i - 1) == s2.charAt(j - 1)) ? 0 : 1;
                curr[j] = Math.min(Math.min(curr[j - 1] + 1, prev[j] + 1), prev[j - 1] + cost);
            }
            int[] temp = prev;
            prev = curr;
            curr = temp;
        }
        return prev[s2.length()];
    }

    private boolean isSimilarTitle(String s1, String s2) {
        String n1 = normalize(s1);
        String n2 = normalize(s2);
        if (n1.equals(n2)) return true;
        int distance = getLevenshteinDistance(n1, n2);
        int maxLength = Math.max(n1.length(), n2.length());
        if (maxLength == 0) return true;
        double similarity = 1.0 - ((double) distance / maxLength);
        return similarity >= 0.85;
    }

    public List<Licitacion> findAll() {
        return licitacionRepository.findAll();
    }

    public Page<Licitacion> search(String text, String estado, String area, Pageable pageable, Usuario currentUser) {
        Specification<Licitacion> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Visibility by Role
            if (currentUser != null) {
                boolean isGlobalView = currentUser.isAdmin() || currentUser.isAuditor() || currentUser.isObservador() || currentUser.isAutoridad();

                if (isGlobalView) {
                    // Admin/Auditor/Observador/Autoridad see all
                } else if (currentUser.isAreaSolicitante()) {
                    // Area Solicitante only sees their own tenders
                    predicates.add(cb.equal(root.get("creadoPor").get("id"), currentUser.getId()));
                } else if (currentUser.isProveedor()) {
                    Predicate publicas = root.get("estado").in(
                        com.licitaciones.sistema.entity.EstadoLicitacion.PUBLICADA,
                        com.licitaciones.sistema.entity.EstadoLicitacion.EN_INSCRIPCION,
                        com.licitaciones.sistema.entity.EstadoLicitacion.EN_EVALUACION
                    );
                    
                    jakarta.persistence.criteria.Subquery<Long> subquery = query.subquery(Long.class);
                    jakarta.persistence.criteria.Root<com.licitaciones.sistema.entity.Propuesta> propRoot = subquery.from(com.licitaciones.sistema.entity.Propuesta.class);
                    subquery.select(propRoot.get("licitacion").get("id"));
                    subquery.where(
                        cb.equal(propRoot.get("usuario").get("id"), currentUser.getId()),
                        cb.equal(propRoot.get("licitacion").get("id"), root.get("id"))
                    );
                    
                    Predicate participadas = cb.and(
                        root.get("estado").in(
                            com.licitaciones.sistema.entity.EstadoLicitacion.EVALUADA,
                            com.licitaciones.sistema.entity.EstadoLicitacion.ADJUDICADA,
                            com.licitaciones.sistema.entity.EstadoLicitacion.CONTRATADA,
                            com.licitaciones.sistema.entity.EstadoLicitacion.CERRADA
                        ),
                        cb.exists(subquery)
                    );
                    
                    predicates.add(cb.or(publicas, participadas));
                } else if (currentUser.hasAnyRole(RoleName.ROLE_EVALUADOR)) {
                    predicates.add(root.get("estado").in(
                        com.licitaciones.sistema.entity.EstadoLicitacion.PUBLICADA,
                        com.licitaciones.sistema.entity.EstadoLicitacion.EN_INSCRIPCION,
                        com.licitaciones.sistema.entity.EstadoLicitacion.EN_EVALUACION,
                        com.licitaciones.sistema.entity.EstadoLicitacion.EVALUADA,
                        com.licitaciones.sistema.entity.EstadoLicitacion.ADJUDICADA,
                        com.licitaciones.sistema.entity.EstadoLicitacion.CONTRATADA,
                        com.licitaciones.sistema.entity.EstadoLicitacion.CERRADA
                    ));
                } else {
                    // Default non-drafts
                    predicates.add(cb.notEqual(root.get("estado"), com.licitaciones.sistema.entity.EstadoLicitacion.BORRADOR));
                }
            } else {
                // Anonymous sees public only
                predicates.add(cb.equal(root.get("estado"), com.licitaciones.sistema.entity.EstadoLicitacion.PUBLICADA));
            }

            // Quick Search (Priority Filter)
            if (text != null && !text.trim().isEmpty()) {
                String pattern = "%" + text.trim().toLowerCase() + "%";
                List<Predicate> searchPreds = new ArrayList<>();
                // SQL Server 'TEXT' columns don't support LOWER(). 
                // We use LOWER() only on non-text columns for safety.
                // Prioridad: Título, ID, Tipo
                searchPreds.add(cb.like(cb.lower(root.get("titulo")), pattern));
                searchPreds.add(cb.like(cb.lower(root.get("tipo")), pattern));
                searchPreds.add(cb.like(root.get("descripcion"), pattern)); // TEXT field
                
                // Búsqueda exacta por ID si es numérico
                try {
                    String onlyNumbers = text.trim().replaceAll("[^0-9]", "");
                    if (!onlyNumbers.isEmpty()) {
                        searchPreds.add(cb.equal(root.get("id"), Long.parseLong(onlyNumbers)));
                    }
                } catch (Exception e) { }
                
                predicates.add(cb.or(searchPreds.toArray(new Predicate[0])));
            }

            // Status Filter
            if (estado != null && !estado.trim().isEmpty()) {
                predicates.add(cb.equal(cb.lower(root.get("estado").as(String.class)), estado.trim().toLowerCase()));
            }

            // Area Filter
            if (area != null && !area.trim().isEmpty()) {
                // Safer join to avoid issues with null area field
                predicates.add(cb.equal(cb.lower(root.join("area").get("nombre")), area.trim().toLowerCase()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        System.out.println("DEBUG SEARCH: text=" + text + ", user=" + (currentUser != null ? currentUser.getUsername() : "anonymous"));
        return licitacionRepository.findAll(spec, pageable);
    }

    public Optional<Licitacion> findById(Long id) {
        return licitacionRepository.findById(id);
    }

    public Licitacion save(Licitacion licitacion) {
        return licitacionRepository.save(licitacion);
    }

    public Licitacion saveWithFiles(Licitacion licitacion, MultipartFile[] files) throws IOException {
        return procesarGuardadoCompleto(licitacion, files);
    }

    @org.springframework.transaction.annotation.Transactional
    public Licitacion procesarGuardadoCompleto(Licitacion licitacion, MultipartFile[] files) throws IOException {
        boolean isNew = licitacion.getId() == null;
        boolean existsDuplicate = licitacionRepository.findAll().stream()
            .anyMatch(l -> (isNew || !l.getId().equals(licitacion.getId())) && l.getTitulo() != null 
                    && isSimilarTitle(l.getTitulo(), licitacion.getTitulo())
                    && (l.getPresupuesto() != null && Math.abs(l.getPresupuesto() - licitacion.getPresupuesto()) < 0.01));
        if (existsDuplicate) {
            throw new RuntimeException("Ya existe una licitación registrada con el mismo título y presupuesto.");
        }
        Licitacion existing = null;
        if (!isNew) {
            existing = licitacionRepository.findById(licitacion.getId())
                .orElseThrow(() -> new RuntimeException("Licitación no encontrada para actualización"));
        }

        // ADMIN Override: Bypass validaciones si el marcador está presente
        boolean isAdminMarker = licitacion.getArchivoUrl() != null && licitacion.getArchivoUrl().contains("[ADMIN_FORCE]");
        if (isAdminMarker) {
            licitacion.setArchivoUrl(licitacion.getArchivoUrl().replace("[ADMIN_FORCE]", ""));
            if (licitacion.getArchivoUrl().isEmpty()) licitacion.setArchivoUrl(null);
        }

        // Sincronización de columna legacy area_solicitante para consultas manuales
        if (licitacion.getArea() != null) {
            licitacion.setAreaSolicitante(licitacion.getArea().getNombre());
        }

        // Validaciones si se intenta publicar
        if (licitacion.getEstado() == com.licitaciones.sistema.entity.EstadoLicitacion.PUBLICADA && !isAdminMarker) {
            validatePublishedState(licitacion);
        }

        // Auditoría Profunda y Versión
        String comment = isNew ? "Creación inicial" : "Actualización de datos.";
        if (existing != null) {
            comment = generateDiffComment(existing, licitacion);
            // Solo incrementar versión si ya estaba en un estado formal (Publicada/Cerrada)
            if (existing.getEstado() != com.licitaciones.sistema.entity.EstadoLicitacion.BORRADOR || isAdminMarker) {
                licitacion.setVersionActual(existing.getVersionActual() + 1);
            }
        }

        Licitacion savedLicitacion = licitacionRepository.save(licitacion);

        // Hitos y Notificaciones
        if (isNew) {
            registrarHito(savedLicitacion, "Creación de Licitación", "Borrador inicial creado.", "fa-plus", savedLicitacion.getCreadoPor());
            notificacionService.crearGlobal("Nueva Licitación", "Se ha creado: " + savedLicitacion.getTitulo(), "LICITACION", "fa-folder-plus", "#1cc88a", "/licitaciones/detail/" + savedLicitacion.getId());
        } else {
            registrarHito(savedLicitacion, "Licitación Actualizada", comment, "fa-edit", null); // usuarioActual se podría pasar
        }

        // Manejo de Archivos si existen
        if (files != null && files.length > 0) {
            String subPath = "LIC-" + savedLicitacion.getId() + "/documentos";
            for (MultipartFile file : files) {
                String fileUrl = fileStorageService.saveFile(file, subPath);
                documentoLicitacionRepository.save(DocumentoLicitacion.builder()
                        .licitacion(savedLicitacion)
                        .nombreArchivo(file.getOriginalFilename())
                        .rutaArchivo(fileUrl)
                        .tipoArchivo(file.getContentType())
                        .fechaSubida(LocalDateTime.now())
                        .build());
                if (savedLicitacion.getArchivoUrl() == null) {
                    savedLicitacion.setArchivoUrl(fileUrl);
                }
            }
            licitacionRepository.save(savedLicitacion);
        }

        // Snapshot en historial
        crearVersionHistorial(savedLicitacion, comment);

        // Sync with Calendar
        calendarioEventoService.syncLicitacionEvents(savedLicitacion);

        return savedLicitacion;
    }

    @org.springframework.transaction.annotation.Transactional
    public void cambiarEstado(Long id, com.licitaciones.sistema.entity.EstadoLicitacion nuevoEstado, Usuario usuario) {
        Licitacion l = licitacionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Licitación no encontrada"));
        
        com.licitaciones.sistema.entity.EstadoLicitacion anterior = l.getEstado();
        
        // Strict Business Logic: State Transitions
        if (nuevoEstado == com.licitaciones.sistema.entity.EstadoLicitacion.PUBLICADA) {
            if (anterior != com.licitaciones.sistema.entity.EstadoLicitacion.BORRADOR) {
                throw new RuntimeException("Solo se puede publicar desde estado BORRADOR.");
            }
            validatePublishedState(l);
        }

        if (nuevoEstado == com.licitaciones.sistema.entity.EstadoLicitacion.CERRADA) {
            if (anterior != com.licitaciones.sistema.entity.EstadoLicitacion.PUBLICADA) {
                throw new RuntimeException("Solo se puede cerrar desde estado PUBLICADA.");
            }
        }

        if (nuevoEstado == com.licitaciones.sistema.entity.EstadoLicitacion.EN_EVALUACION) {
            if (anterior != com.licitaciones.sistema.entity.EstadoLicitacion.CERRADA) {
                throw new RuntimeException("Solo se puede iniciar evaluación desde estado CERRADA.");
            }
        }

        l.setEstado(nuevoEstado);
        licitacionRepository.save(l);
        registrarHito(l, "Cambio de Estado", "De " + anterior + " a " + nuevoEstado, "fa-sync", usuario);
        crearVersionHistorial(l, "Cambio manual de estado a " + nuevoEstado);

        // Notificaciones automáticas por estado
        if (nuevoEstado == com.licitaciones.sistema.entity.EstadoLicitacion.PUBLICADA) {
            notificacionService.crearGlobal("Licitación Publicada", "Se ha publicado la licitación: " + l.getTitulo(), "LICITACION", "fa-bullhorn", "#38bdf8", "/licitaciones/detail/" + l.getId());
        } else if (nuevoEstado == com.licitaciones.sistema.entity.EstadoLicitacion.CERRADA) {
            notificacionService.crearGlobal("Recepción Cerrada", "La licitación " + l.getTitulo() + " ha cerrado su fase de propuestas.", "LICITACION", "fa-lock", "#fb923c", "/licitaciones/detail/" + l.getId());
        } else if (nuevoEstado == com.licitaciones.sistema.entity.EstadoLicitacion.EN_EVALUACION) {
            notificacionService.crearGlobal("Evaluación Iniciada", "La licitación " + l.getTitulo() + " está en fase de evaluación técnica y económica.", "EVALUACION", "fa-microchip", "#8b5cf6", "/licitaciones/detail/" + l.getId());
        }
    }

    @org.springframework.transaction.annotation.Transactional
    public void cancelar(Long id, String motivo, Usuario usuario) {
        Licitacion l = licitacionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Licitación no encontrada"));
        
        if (l.getEstado() == com.licitaciones.sistema.entity.EstadoLicitacion.ADJUDICADA || 
            l.getEstado() == com.licitaciones.sistema.entity.EstadoLicitacion.CONTRATADA) {
            throw new RuntimeException("No se puede cancelar una licitación ya adjudicada o contratada.");
        }

        l.setEstado(com.licitaciones.sistema.entity.EstadoLicitacion.CANCELADA);
        l.setMotivoCancelacion(motivo);
        licitacionRepository.save(l);

        registrarHito(l, "Licitación Cancelada", "Motivo: " + motivo, "fa-times-circle", usuario);
    }

    public List<com.licitaciones.sistema.entity.Propuesta> getRanking(Long id) {
        return propuestaRepository.findByLicitacionIdOrderByPuntajeTotalDesc(id);
    }

    @org.springframework.transaction.annotation.Transactional
    public void aprobarResultados(Long id, Usuario autoridad) {
        Licitacion l = licitacionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Licitación no encontrada"));
        
        if (l.getEstado() != com.licitaciones.sistema.entity.EstadoLicitacion.EN_EVALUACION) {
            throw new RuntimeException("Solo se pueden aprobar resultados de licitaciones en evaluación.");
        }

        l.setEstado(com.licitaciones.sistema.entity.EstadoLicitacion.EVALUADA);
        l.setAprobadoPor(autoridad);
        l.setFechaAprobacion(LocalDateTime.now());
        
        licitacionRepository.save(l);
        registrarHito(l, "Resultados Aprobados", "La autoridad ha validado el ranking de evaluación.", "fa-check-double", autoridad);
        
        auditoriaService.registrarAccion("APROBAR_RESULTADOS", "LICITACIONES", 
                "Resultados aprobados para licitación ID: " + l.getId() + " por " + autoridad.getUsername());
        
        notificacionService.crearGlobal("Resultados Publicados", "Los resultados de la licitación " + l.getTitulo() + " han sido aprobados.", "LICITACION", "fa-bullhorn", "#36b9cc", "/licitaciones/detail/" + l.getId());
    }

    @org.springframework.transaction.annotation.Transactional
    public void adjudicar(Long id, Long propuestaId, Usuario autoridad) {
        Licitacion l = licitacionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Licitación no encontrada"));
        
        com.licitaciones.sistema.entity.Propuesta p = propuestaRepository.findById(propuestaId)
                .orElseThrow(() -> new RuntimeException("Propuesta no encontrada"));

        if (l.getEstado() != com.licitaciones.sistema.entity.EstadoLicitacion.PUBLICADA &&
            l.getEstado() != com.licitaciones.sistema.entity.EstadoLicitacion.EN_INSCRIPCION &&
            l.getEstado() != com.licitaciones.sistema.entity.EstadoLicitacion.EN_EVALUACION &&
            l.getEstado() != com.licitaciones.sistema.entity.EstadoLicitacion.EVALUADA &&
            l.getEstado() != com.licitaciones.sistema.entity.EstadoLicitacion.CERRADA) {
            throw new RuntimeException("La licitación debe estar en estado PUBLICADA, EN_INSCRIPCION, EN_EVALUACION, EVALUADA o CERRADA para ser adjudicada.");
        }

        // 1. Validar existencia de evaluaciones
        List<com.licitaciones.sistema.entity.Evaluacion> evaluaciones = evaluacionRepository.findAllByPropuestaIdAndActiveTrue(propuestaId);
        if (evaluaciones.isEmpty()) {
            throw new RuntimeException("No se puede adjudicar una propuesta sin evaluaciones registradas.");
        }

        // 2. Validar que todas estén finalizadas (FINALIZADO)
        for (com.licitaciones.sistema.entity.Evaluacion ev : evaluaciones) {
            if (ev.getEstadoTramite() != com.licitaciones.sistema.entity.EstadoTramite.FINALIZADO) {
                throw new RuntimeException("No se puede adjudicar la propuesta. Hay evaluaciones pendientes en estado de borrador.");
            }
        }

        // 3. Validar que ninguna esté RECHAZADA
        for (com.licitaciones.sistema.entity.Evaluacion ev : evaluaciones) {
            if (ev.getResultado() == com.licitaciones.sistema.entity.EstadoEvaluacion.RECHAZADO) {
                throw new RuntimeException("No se puede adjudicar la propuesta. Una o más evaluaciones tienen un resultado RECHAZADO.");
            }
        }

        // 4. Validar promedio de puntajeTotal >= 35.0
        double totalSum = 0;
        for (com.licitaciones.sistema.entity.Evaluacion ev : evaluaciones) {
            totalSum += (ev.getPuntajeTotal() != null ? ev.getPuntajeTotal() : 0);
        }
        double averageScore = totalSum / evaluaciones.size();
        if (averageScore < 35.0) {
            throw new RuntimeException("La propuesta no cumple con el puntaje mínimo promedio requerido de 35.0 (obtuvo: " + String.format(java.util.Locale.US, "%.2f", averageScore) + ").");
        }

        // 5. Auto-rechazar el resto de propuestas asociadas
        List<com.licitaciones.sistema.entity.Propuesta> otrasPropuestas = propuestaRepository.findByLicitacionId(id);
        for (com.licitaciones.sistema.entity.Propuesta opt : otrasPropuestas) {
            if (!opt.getId().equals(propuestaId)) {
                opt.setEstado(com.licitaciones.sistema.entity.EstadoPropuesta.RECHAZADA);
                opt.setMotivoRechazo("Licitación adjudicada a otro participante.");
                propuestaRepository.save(opt);
            }
        }

        // Proceder con la adjudicación de la propuesta ganadora
        l.setEstado(com.licitaciones.sistema.entity.EstadoLicitacion.ADJUDICADA);
        l.setPropuestaGanadora(p);
        l.setFechaAdjudicacion(LocalDateTime.now());
        
        p.setEstado(com.licitaciones.sistema.entity.EstadoPropuesta.GANADORA);
        propuestaRepository.save(p);
        
        licitacionRepository.save(l);
        registrarHito(l, "Licitación Adjudicada", "Se ha seleccionado a " + p.getEmpresaNombre() + " como ganador.", "fa-trophy", autoridad);
        
        auditoriaService.registrarAccion("ADJUDICAR", "LICITACIONES", 
                "Licitación ID: " + l.getId() + " adjudicada a propuesta ID: " + p.getId() + " por " + autoridad.getUsername());
        
        notificacionService.crearGlobal("Licitación Adjudicada", "Felicidades a " + p.getEmpresaNombre() + " por la adjudicación de " + l.getTitulo(), "LICITACION", "fa-award", "#f6c23e", "/licitaciones/detail/" + l.getId());
        
        // Notificación personal al ganador
        notificacionService.crear(p.getUsuario(), "¡Ganaste la Licitación!", "Tu propuesta ha sido seleccionada para: " + l.getTitulo(), "LICITACION", "fa-trophy", "#22c55e", "/licitaciones/detail/" + l.getId());

        // AUTO-GENERATE CONTRACT AS PER REQUIREMENT 9
        Contrato contrato = new Contrato();
        contrato.setLicitacion(l);
        contrato.setPropuesta(p);
        contrato.setMonto(p.getMontoOfertado());
        contrato.setFechaInicio(LocalDateTime.now());
        contrato.setFechaFin(LocalDateTime.now().plusYears(1)); // Default term: 1 year
        contrato.setObservaciones("Contrato generado automáticamente por aprobación de adjudicación por " + autoridad.getNombreCompleto());
        
        // Session metadata capture
        org.springframework.web.context.request.RequestAttributes requestAttributes = org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();
        if (requestAttributes instanceof org.springframework.web.context.request.ServletRequestAttributes) {
            jakarta.servlet.http.HttpServletRequest request = ((org.springframework.web.context.request.ServletRequestAttributes) requestAttributes).getRequest();
            if (request != null) {
                contrato.setIpAddress(request.getRemoteAddr());
                contrato.setUserAgent(request.getHeader("User-Agent"));
                contrato.setSessionId(request.getSession().getId());
                // Simple SHA-256 placeholder hash for verification
                String rawDoc = l.getTitulo() + "|" + p.getEmpresaNombre() + "|" + p.getMontoOfertado() + "|" + LocalDateTime.now();
                try {
                    java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
                    byte[] hash = digest.digest(rawDoc.getBytes(java.nio.charset.StandardCharsets.UTF_8));
                    StringBuilder hexString = new StringBuilder();
                    for (byte b : hash) {
                        String hex = Integer.toHexString(0xff & b);
                        if (hex.length() == 1) hexString.append('0');
                        hexString.append(hex);
                    }
                    contrato.setDocumentHash(hexString.toString());
                } catch (Exception e) {}
            }
        }
        
        contratoService.crearContrato(l.getId(), contrato, autoridad);
    }

    @org.springframework.transaction.annotation.Transactional
    public void rechazarAdjudicacion(Long id, Long propuestaId, Usuario autoridad, String motivo) {
        Licitacion l = licitacionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Licitación no encontrada"));
        
        com.licitaciones.sistema.entity.Propuesta p = propuestaRepository.findById(propuestaId)
                .orElseThrow(() -> new RuntimeException("Propuesta no encontrada"));

        l.setEstado(com.licitaciones.sistema.entity.EstadoLicitacion.EN_EVALUACION); // send back to evaluation
        p.setEstado(com.licitaciones.sistema.entity.EstadoPropuesta.RECHAZADA);
        p.setMotivoRechazo(motivo);
        propuestaRepository.save(p);
        licitacionRepository.save(l);

        registrarHito(l, "Adjudicación Rechazada", "La adjudicación de la propuesta de " + p.getEmpresaNombre() + " fue rechazada por " + autoridad.getNombreCompleto() + ". Motivo: " + motivo, "fa-times-circle", autoridad);
        
        auditoriaService.registrarAccion("RECHAZAR_ADJUDICACION", "LICITACIONES", 
                "Adjudicación de propuesta ID: " + p.getId() + " rechazada por " + autoridad.getUsername() + ". Motivo: " + motivo);

        notificacionService.crearGlobal("Adjudicación Rechazada", "Se ha rechazado la adjudicación de " + p.getEmpresaNombre() + " para la licitación " + l.getTitulo(), "LICITACION", "fa-ban", "#ef4444", "/licitaciones/detail/" + l.getId());
        
        notificacionService.crear(p.getUsuario(), "Adjudicación Rechazada", "La adjudicación de tu propuesta ha sido rechazada. Motivo: " + motivo, "LICITACION", "fa-ban", "#ef4444", "/licitaciones/detail/" + l.getId());
    }

    public void registrarHito(Licitacion l, String titulo, String desc, String icono, Usuario u) {
        hitoRepository.save(LicitacionHito.builder()
                .licitacion(l)
                .titulo(titulo)
                .descripcion(desc)
                .fecha(LocalDateTime.now())
                .icono(icono)
                .realizadoPor(u)
                .build());
    }

    private String generateDiffComment(Licitacion old, Licitacion current) {
        StringBuilder sb = new StringBuilder("Campos modificados: ");
        boolean changed = false;

        if (!compare(old.getTitulo(), current.getTitulo())) { sb.append("[Título] "); changed = true; }
        if (!compare(old.getDescripcion(), current.getDescripcion())) { sb.append("[Descripción] "); changed = true; }
        if (!compare(old.getPresupuesto(), current.getPresupuesto())) { sb.append("[Presupuesto] "); changed = true; }
        if (!compare(old.getBases(), current.getBases())) { sb.append("[Bases] "); changed = true; }
        if (!compare(old.getRequisitos(), current.getRequisitos())) { sb.append("[Requisitos] "); changed = true; }
        if (!compare(old.getEstado(), current.getEstado())) { sb.append("[Estado: " + old.getEstado() + " -> " + current.getEstado() + "] "); changed = true; }
        if (!compare(old.getFechaCierre(), current.getFechaCierre())) { sb.append("[Fecha Cierre] "); changed = true; }

        return changed ? sb.toString() : "Guardado sin cambios significativos.";
    }

    private boolean compare(Object o1, Object o2) {
        if (o1 == null && o2 == null) return true;
        if (o1 == null || o2 == null) return false;
        return o1.equals(o2);
    }

    private void crearVersionHistorial(Licitacion l, String comentario) {
        try {
            String json = objectMapper.writeValueAsString(l);
            historialRepository.save(LicitacionHistorial.builder()
                    .licitacion(l)
                    .version(l.getVersionActual())
                    .datosJson(json)
                    .fechaCambio(LocalDateTime.now())
                    .modificadoPor(null) // TODO: Pasar usuario actual
                    .comentario(comentario)
                    .build());
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void validatePublishedState(Licitacion l) {
        if (l.getTitulo() == null || l.getTitulo().isBlank()) throw new RuntimeException("El título es obligatorio para publicar.");
        if (l.getDescripcion() == null || l.getDescripcion().isBlank()) throw new RuntimeException("La descripción es obligatoria para publicar.");
        if (l.getArea() == null) throw new RuntimeException("El área solicitante es obligatoria para publicar.");
        if (l.getPresupuesto() == null || l.getPresupuesto() <= 0) throw new RuntimeException("El presupuesto debe ser mayor a 0.");
        if (l.getBases() == null || l.getBases().isBlank()) throw new RuntimeException("Las bases son obligatorias para publicar.");
        
        if (l.getFechaPublicacion() == null) throw new RuntimeException("La fecha de publicación es obligatoria.");
        if (l.getFechaCierre() == null) throw new RuntimeException("La fecha de cierre es obligatoria.");

        if (l.getFechaPublicacion().isAfter(l.getFechaCierre())) {
            throw new RuntimeException("La fecha de publicación no puede ser posterior a la de cierre.");
        }
    }

    public void deleteById(Long id) {
        licitacionRepository.deleteById(id);
    }
}
