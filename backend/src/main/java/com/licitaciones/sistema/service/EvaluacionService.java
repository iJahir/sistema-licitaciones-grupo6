package com.licitaciones.sistema.service;

import com.licitaciones.sistema.entity.Evaluacion;
import com.licitaciones.sistema.entity.Usuario;
import com.licitaciones.sistema.entity.Propuesta;
import com.licitaciones.sistema.repository.EvaluacionRepository;
import com.licitaciones.sistema.repository.PropuestaRepository;
import com.licitaciones.sistema.repository.UsuarioRepository;
import com.licitaciones.sistema.dto.LicitacionEvaluacionDTO;
import com.licitaciones.sistema.dto.PropuestaEvalDTO;
import com.licitaciones.sistema.entity.EstadoEvaluacion;
import com.licitaciones.sistema.entity.EstadoPropuesta;
import com.licitaciones.sistema.entity.EstadoLicitacion;
import com.licitaciones.sistema.entity.Licitacion;
import com.licitaciones.sistema.repository.LicitacionRepository;
import com.licitaciones.sistema.repository.LicitacionHitoRepository;
import com.licitaciones.sistema.entity.LicitacionHito;
import com.licitaciones.sistema.entity.DetalleEvaluacion;
import com.licitaciones.sistema.entity.Criterio;
import com.licitaciones.sistema.entity.Rubrica;
import com.licitaciones.sistema.repository.DetalleEvaluacionRepository;
import com.licitaciones.sistema.repository.CriterioRepository;
import com.licitaciones.sistema.repository.RubricaRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class EvaluacionService {

    @Autowired
    private EvaluacionRepository evaluacionRepository;

    @Autowired
    private PropuestaRepository propuestaRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private LicitacionRepository licitacionRepository;

    @Autowired
    private LicitacionHitoRepository licitacionHitoRepository;

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private ZipService zipService;

    @Autowired
    private DetalleEvaluacionRepository detalleEvaluacionRepository;

    @Autowired
    private CriterioRepository criterioRepository;

    @Autowired
    private RubricaRepository rubricaRepository;

    @Autowired
    private com.licitaciones.sistema.repository.EvaluacionHistorialRepository evaluacionHistorialRepository;

    @Autowired
    private RubricaService rubricaService;

    @Value("${app.upload.dir}")
    private String uploadDir;

    @Autowired
    private NotificacionService notificacionService;

    @Autowired
    private CalendarioEventoService calendarioEventoService;

    // --- EVALUACIÓN DE PROPUESTAS ---
    @org.springframework.transaction.annotation.Transactional
    public Evaluacion saveEvaluation(Long propuestaId, Evaluacion evaluacion, MultipartFile file) throws IOException {
        Usuario evaluador = getCurrentUser();
        Propuesta propuesta = propuestaRepository.findById(propuestaId)
                .orElseThrow(() -> new RuntimeException("Propuesta no encontrada"));

        evaluacion.setPropuesta(propuesta);
        evaluacion.setEvaluador(evaluador);
        
        Licitacion lic = propuesta.getLicitacion();
        if (lic != null && (lic.getEstado() == com.licitaciones.sistema.entity.EstadoLicitacion.PUBLICADA || 
            lic.getEstado() == com.licitaciones.sistema.entity.EstadoLicitacion.EN_INSCRIPCION || 
            lic.getEstado() == com.licitaciones.sistema.entity.EstadoLicitacion.CERRADA)) {
            lic.setEstado(com.licitaciones.sistema.entity.EstadoLicitacion.EN_EVALUACION);
            licitacionRepository.save(lic);
        }
        
        evaluacion.setLicitacion(lic);
        evaluacion.setEspecialidadEvaluador(resolveEspecialidad(evaluador));
        evaluacion.setFecha(LocalDateTime.now());

        // Manejo de Archivo PDF (opcional en evaluación)
        if (file != null && !file.isEmpty()) {
            String subPath = "LIC-" + propuesta.getLicitacion().getId() + "/evaluaciones";
            String fileUrl = fileStorageService.saveFile(file, subPath);
            evaluacion.setArchivoPdf(fileUrl);
        }

        // El puntajeTotal ya viene calculado del frontend (0-50), pero validamos
        if (evaluacion.getPuntajeTotal() == null) {
            evaluacion.setPuntajeTotal(0);
        }
        
        // Conversión a estrellas (0-10: 1, 11-20: 2, 21-30: 3, 31-40: 4, 41-50: 5)
        int stars = (int) Math.ceil(evaluacion.getPuntajeTotal() / 10.0);
        if (stars < 1 && evaluacion.getPuntajeTotal() > 0) stars = 1;
        if (stars > 5) stars = 5;
        evaluacion.setEstrellas(stars);

        // Set specialty scores
        double scoreVal = evaluacion.getPuntajeTotal().doubleValue();
        evaluacion.setScoreTotal(scoreVal);
        com.licitaciones.sistema.entity.EvaluadorEspecialidad esp = evaluacion.getEspecialidadEvaluador() != null ? evaluacion.getEspecialidadEvaluador() : resolveEspecialidad(evaluador);
        if (esp == com.licitaciones.sistema.entity.EvaluadorEspecialidad.TECNICO) {
            evaluacion.setScoreTecnico(scoreVal);
        } else if (esp == com.licitaciones.sistema.entity.EvaluadorEspecialidad.FINANCIERO) {
            evaluacion.setScoreFinanciero(scoreVal);
        } else if (esp == com.licitaciones.sistema.entity.EvaluadorEspecialidad.LEGAL) {
            evaluacion.setScoreLegal(scoreVal);
        }

        // Buscar si ya existe una evaluación previa
        Optional<Evaluacion> existente = evaluacionRepository.findByPropuestaIdAndEvaluadorId(propuestaId, evaluador.getId());
        
        // Registrar inicio de evaluación si es la primera vez que se guarda algo real
        if (!existente.isPresent() || (existente.get().getEstadoTramite() == com.licitaciones.sistema.entity.EstadoTramite.BORRADOR && existente.get().getPuntajesJson() == null)) {
            String especialidadNombre = esp == com.licitaciones.sistema.entity.EvaluadorEspecialidad.TECNICO ? "técnica" : (esp == com.licitaciones.sistema.entity.EvaluadorEspecialidad.FINANCIERO ? "financiera" : (esp == com.licitaciones.sistema.entity.EvaluadorEspecialidad.LEGAL ? "legal" : "general"));
            calendarioEventoService.registrarEvento(
                "Evaluación Iniciada: " + evaluador.getNombreCompleto(),
                evaluador.getNombreCompleto() + " inició la evaluación " + especialidadNombre + " para la propuesta de " + propuesta.getEmpresaNombre(),
                com.licitaciones.sistema.entity.TipoEvento.EVALUACION_EN_CURSO,
                LocalDateTime.now(),
                propuesta.getId(),
                "propuesta",
                2,
                evaluador
            );
        }

        Evaluacion saved;
        if (existente.isPresent()) {
            Evaluacion update = existente.get();

            // Si ya estaba finalizada, guardamos versión anterior en historial
            if (update.getEstadoTramite() == com.licitaciones.sistema.entity.EstadoTramite.FINALIZADO) {
                saveHistorialSnapshot(update);
                update.setVersion(update.getVersion() == null ? 2 : update.getVersion() + 1);
            }

            update.setPuntajesJson(evaluacion.getPuntajesJson());
            update.setPuntajeTotal(evaluacion.getPuntajeTotal());
            update.setEstrellas(stars);
            update.setComentarios(evaluacion.getComentarios());
            update.setObservaciones(evaluacion.getObservaciones());
            update.setRespuestasJson(evaluacion.getRespuestasJson());
            update.setResultado(evaluacion.getResultado());
            update.setEstadoTramite(evaluacion.getEstadoTramite());
            update.setFecha(LocalDateTime.now());
            
            // Sync audit details
            update.setUpdatedBy(evaluador.getNombreCompleto() + " (EVALUADOR)");
            update.setUpdatedAt(LocalDateTime.now());

            // Set specialty scores on update
            double sVal = update.getPuntajeTotal() != null ? update.getPuntajeTotal().doubleValue() : 0.0;
            update.setScoreTotal(sVal);
            if (update.getEspecialidadEvaluador() == com.licitaciones.sistema.entity.EvaluadorEspecialidad.TECNICO) {
                update.setScoreTecnico(sVal);
            } else if (update.getEspecialidadEvaluador() == com.licitaciones.sistema.entity.EvaluadorEspecialidad.FINANCIERO) {
                update.setScoreFinanciero(sVal);
            } else if (update.getEspecialidadEvaluador() == com.licitaciones.sistema.entity.EvaluadorEspecialidad.LEGAL) {
                update.setScoreLegal(sVal);
            }

            // Sincronizar columnas individuales si vienen en el JSON
            syncIndividualScores(update);

            if (evaluacion.getArchivoPdf() != null) update.setArchivoPdf(evaluacion.getArchivoPdf());
            saved = evaluacionRepository.save(update);
        } else {
            evaluacion.setAssignedBy(evaluador.getNombreCompleto() + " (AUTOPROPUESTO)");
            evaluacion.setAssignedAt(LocalDateTime.now());
            syncIndividualScores(evaluacion);
            saved = evaluacionRepository.save(evaluacion);
            
            // Evento de Calendario: Evaluación en Curso
            calendarioEventoService.registrarEvento(
                "Evaluación en Curso: " + saved.getLicitacion().getTitulo(),
                "Se ha iniciado la evaluación de propuestas para esta licitación.",
                com.licitaciones.sistema.entity.TipoEvento.EVALUACION_EN_CURSO,
                saved.getFecha(),
                saved.getLicitacion().getId(),
                "licitacion",
                2,
                saved.getEvaluador()
            );
        }

        // --- SINCRONIZACIÓN CON detalle_evaluacion ---
        syncDetalleEvaluacion(saved);

        // Actualizar resumen en la propuesta solo cuando TODOS los evaluadores hayan finalizado
        if (saved.getEstadoTramite() == com.licitaciones.sistema.entity.EstadoTramite.FINALIZADO) {
            
            // Registro de evento de finalización individual
            String veredictoLabel = saved.getResultado() == EstadoEvaluacion.APROBADO ? "aprobada" : (saved.getResultado() == EstadoEvaluacion.RECHAZADO ? "rechazada" : "con solicitud de subsanación");
            String especialidadNombre = esp == com.licitaciones.sistema.entity.EvaluadorEspecialidad.TECNICO ? "técnica" : (esp == com.licitaciones.sistema.entity.EvaluadorEspecialidad.FINANCIERO ? "financiera" : (esp == com.licitaciones.sistema.entity.EvaluadorEspecialidad.LEGAL ? "legal" : "general"));
            calendarioEventoService.registrarEvento(
                "Evaluación Finalizada: " + evaluador.getNombreCompleto(),
                "Evaluación " + especialidadNombre + " finalizada y " + veredictoLabel + " por " + evaluador.getNombreCompleto() + ".",
                com.licitaciones.sistema.entity.TipoEvento.EVENTO_GENERAL,
                LocalDateTime.now(),
                propuesta.getId(),
                "propuesta",
                2,
                evaluador
            );

            List<Evaluacion> allEvals = evaluacionRepository.findAllByPropuestaIdAndActiveTrue(propuestaId);
            List<Evaluacion> mandatoryEvals = allEvals.stream()
                .filter(e -> e.getTipoEvaluador() == com.licitaciones.sistema.entity.TipoEvaluador.OBLIGATORIO)
                .collect(java.util.stream.Collectors.toList());

            boolean allMandatoryCompleted = mandatoryEvals.stream()
                .allMatch(e -> e.getEstadoTramite() == com.licitaciones.sistema.entity.EstadoTramite.FINALIZADO);

            boolean canAdvance = mandatoryEvals.isEmpty() 
                ? allEvals.stream().allMatch(e -> e.getEstadoTramite() == com.licitaciones.sistema.entity.EstadoTramite.FINALIZADO)
                : allMandatoryCompleted;

            double avgPuntaje = allEvals.stream()
                .filter(e -> e.getEstadoTramite() == com.licitaciones.sistema.entity.EstadoTramite.FINALIZADO)
                .mapToDouble(e -> e.getScoreTotal() != null ? e.getScoreTotal() : (e.getPuntajeTotal() != null ? e.getPuntajeTotal().doubleValue() : 0.0))
                .average().orElse(0.0);
            
            double avgEstrellas = allEvals.stream()
                .filter(e -> e.getEstadoTramite() == com.licitaciones.sistema.entity.EstadoTramite.FINALIZADO)
                .mapToInt(e -> e.getEstrellas() != null ? e.getEstrellas() : 0)
                .average().orElse(0);

            propuesta.setScoreTotal(avgPuntaje);
            propuesta.setPuntajeTotal((int) Math.round(avgPuntaje));
            propuesta.setEstrellas((int) Math.round(avgEstrellas));

            // Calcular score técnico
            double avgScoreTecnico = allEvals.stream()
                .filter(e -> e.getEstadoTramite() == com.licitaciones.sistema.entity.EstadoTramite.FINALIZADO && e.getEspecialidadEvaluador() == com.licitaciones.sistema.entity.EvaluadorEspecialidad.TECNICO)
                .mapToDouble(e -> e.getScoreTotal() != null ? e.getScoreTotal() : 0.0)
                .average().orElse(0.0);
            propuesta.setScoreTecnico(avgScoreTecnico > 0 ? avgScoreTecnico : null);

            // Calcular score financiero
            double avgScoreFinanciero = allEvals.stream()
                .filter(e -> e.getEstadoTramite() == com.licitaciones.sistema.entity.EstadoTramite.FINALIZADO && e.getEspecialidadEvaluador() == com.licitaciones.sistema.entity.EvaluadorEspecialidad.FINANCIERO)
                .mapToDouble(e -> e.getScoreTotal() != null ? e.getScoreTotal() : 0.0)
                .average().orElse(0.0);
            propuesta.setScoreFinanciero(avgScoreFinanciero > 0 ? avgScoreFinanciero : null);

            // Calcular score legal
            double avgScoreLegal = allEvals.stream()
                .filter(e -> e.getEstadoTramite() == com.licitaciones.sistema.entity.EstadoTramite.FINALIZADO && e.getEspecialidadEvaluador() == com.licitaciones.sistema.entity.EvaluadorEspecialidad.LEGAL)
                .mapToDouble(e -> e.getScoreTotal() != null ? e.getScoreTotal() : 0.0)
                .average().orElse(0.0);
            propuesta.setScoreLegal(avgScoreLegal > 0 ? avgScoreLegal : null);

            if (canAdvance) {
                // Validación de puntaje mínimo: mínimo 80/100 (40.0/50.0 en BD)
                boolean anyRejected = allEvals.stream()
                    .filter(e -> e.getEstadoTramite() == com.licitaciones.sistema.entity.EstadoTramite.FINALIZADO)
                    .anyMatch(e -> e.getResultado() == EstadoEvaluacion.RECHAZADO);
                
                boolean anySubsanacion = allEvals.stream()
                    .filter(e -> e.getEstadoTramite() == com.licitaciones.sistema.entity.EstadoTramite.FINALIZADO)
                    .anyMatch(e -> e.getResultado() == EstadoEvaluacion.SUBSANACION);

                if (anyRejected || avgPuntaje < 35.0) {
                    propuesta.setEstado(EstadoPropuesta.RECHAZADA);
                    calendarioEventoService.registrarEvento(
                        "Propuesta Rechazada",
                        "La propuesta de " + propuesta.getEmpresaNombre() + " fue RECHAZADA al no cumplir con el puntaje mínimo o contar con votos desfavorables. Score final: " + (avgPuntaje * 2) + "%",
                        com.licitaciones.sistema.entity.TipoEvento.EVENTO_GENERAL,
                        LocalDateTime.now(),
                        propuesta.getId(),
                        "propuesta",
                        2,
                        evaluador
                    );
                } else if (anySubsanacion || avgPuntaje < 40.0) {
                    propuesta.setEstado(EstadoPropuesta.INCOMPLETA); // SUBSANACIÓN
                    calendarioEventoService.registrarEvento(
                        "Propuesta en Subsanación",
                        "La propuesta de " + propuesta.getEmpresaNombre() + " requiere SUBSANACIÓN al no alcanzar el score del 80% o presentar observaciones. Score actual: " + (avgPuntaje * 2) + "%",
                        com.licitaciones.sistema.entity.TipoEvento.EVENTO_GENERAL,
                        LocalDateTime.now(),
                        propuesta.getId(),
                        "propuesta",
                        2,
                        evaluador
                    );
                } else {
                    propuesta.setEstado(EstadoPropuesta.PENDIENTE_ADJUDICACION);
                    
                    // Sincronizar estado de la licitación a EVALUADA automáticamente
                    Licitacion licitacion = propuesta.getLicitacion();
                    if (licitacion != null && licitacion.getEstado() != com.licitaciones.sistema.entity.EstadoLicitacion.EVALUADA) {
                        licitacion.setEstado(com.licitaciones.sistema.entity.EstadoLicitacion.EVALUADA);
                        licitacionRepository.save(licitacion);
                    }

                    calendarioEventoService.registrarEvento(
                        "Propuesta enviada a adjudicación",
                        "La propuesta de " + propuesta.getEmpresaNombre() + " fue calificada satisfactoriamente con un score de " + (avgPuntaje * 2) + "% y ha sido enviada a Adjudicaciones.",
                        com.licitaciones.sistema.entity.TipoEvento.EVENTO_GENERAL,
                        LocalDateTime.now(),
                        propuesta.getId(),
                        "propuesta",
                        2,
                        evaluador
                    );
                }
            } else {
                propuesta.setEstado(EstadoPropuesta.EN_EVALUACION);
            }
            propuestaRepository.save(propuesta);

            notificacionService.crearGlobal(
                "Evaluación Finalizada", 
                "Se ha completado la evaluación de la propuesta de " + saved.getPropuesta().getEmpresaNombre() + " (Puntaje: " + saved.getPuntajeTotal() + ")", 
                "EVALUACION", 
                "fa-clipboard-check", 
                "#f6c23e", 
                "/evaluaciones"
            );
        }

        return saved;
    }

    private com.licitaciones.sistema.entity.EvaluadorEspecialidad resolveEspecialidad(Usuario evaluador) {
        java.util.Set<com.licitaciones.sistema.entity.RoleName> roles = evaluador.getRoles().stream()
                .map(com.licitaciones.sistema.entity.Rol::getName)
                .collect(java.util.stream.Collectors.toSet());
        if (roles.contains(com.licitaciones.sistema.entity.RoleName.ROLE_EVALUADOR_FINANCIERO)) {
            return com.licitaciones.sistema.entity.EvaluadorEspecialidad.FINANCIERO;
        }
        if (roles.contains(com.licitaciones.sistema.entity.RoleName.ROLE_EVALUADOR_TECNICO)) {
            return com.licitaciones.sistema.entity.EvaluadorEspecialidad.TECNICO;
        }
        if (roles.contains(com.licitaciones.sistema.entity.RoleName.ROLE_EVALUADOR_LEGAL)) {
            return com.licitaciones.sistema.entity.EvaluadorEspecialidad.LEGAL;
        }
        return com.licitaciones.sistema.entity.EvaluadorEspecialidad.GENERAL;
    }

    private void syncIndividualScores(Evaluacion eval) {
        if (eval.getPuntajesJson() == null || eval.getPuntajesJson().isEmpty()) return;
        try {
            ObjectMapper mapper = new ObjectMapper();
            Map<String, Integer> scores = mapper.readValue(eval.getPuntajesJson(), Map.class);
            // Mapeo legacy basado en p1-p5 a columnas fijas
            if (scores.containsKey("p1")) eval.setPuntajePrecio(scores.get("p1"));
            if (scores.containsKey("p2")) {
                eval.setPuntajeCalidad(scores.get("p2"));
                eval.setCalidad(scores.get("p2"));
            }
            if (scores.containsKey("p3")) {
                eval.setCalidad(scores.get("p3"));
                eval.setPuntajeExperiencia(scores.get("p3"));
            }
            if (scores.containsKey("p4")) {
                eval.setClaridad(scores.get("p4"));
                eval.setPuntajeTiempo(scores.get("p4"));
            }
            if (scores.containsKey("p5")) {
                eval.setViabilidad(scores.get("p5"));
            }
            
            // Campos adicionales
            eval.setPuntajeTotalPonderado(eval.getPuntajeTotal() != null ? eval.getPuntajeTotal().doubleValue() : 0.0);
            eval.setComentarioGeneral(eval.getObservaciones());
            eval.setCumpleRequisitos(eval.getResultado() == EstadoEvaluacion.APROBADO);
        } catch (Exception e) {
            System.err.println("Error syncing individual scores: " + e.getMessage());
        }
    }

    private void syncDetalleEvaluacion(Evaluacion eval) {
        if (eval.getPuntajesJson() == null || eval.getPuntajesJson().isEmpty()) return;
        try {
            // Limpiar detalles anteriores para evitar duplicados en actualizaciones
            detalleEvaluacionRepository.deleteByEvaluacionId(eval.getId());

            ObjectMapper mapper = new ObjectMapper();
            Map<String, Integer> scores = mapper.readValue(eval.getPuntajesJson(), Map.class);
            
            // Obtener rúbrica actual de la licitación o crear una por defecto
            Rubrica rubrica = rubricaRepository.findByLicitacionId(eval.getLicitacion().getId())
                    .orElseGet(() -> {
                        String areaNombre = eval.getLicitacion().getArea() != null ? eval.getLicitacion().getArea().getNombre() : "General";
                        Rubrica newRub = Rubrica.builder()
                                .licitacion(eval.getLicitacion())
                                .nombre("Rúbrica " + areaNombre)
                                .build();
                        return rubricaRepository.save(newRub);
                    });

            String areaName = eval.getLicitacion().getArea() != null ? eval.getLicitacion().getArea().getNombre() : "General";
            List<String> labels = rubricaService.getPreguntasPorArea(areaName);
            
            for (int i = 1; i <= 5; i++) {
                String key = "p" + i;
                if (scores.containsKey(key)) {
                    final String name = (i - 1 < labels.size()) ? labels.get(i - 1) : "Criterio " + i;
                    Criterio criterio = criterioRepository.findByNombreAndRubricaId(name, rubrica.getId())
                            .orElseGet(() -> criterioRepository.save(Criterio.builder()
                                    .rubrica(rubrica)
                                    .nombre(name)
                                    .peso(20.0)
                                    .puntajeMaximo(10)
                                    .build()));

                    DetalleEvaluacion detail = DetalleEvaluacion.builder()
                            .evaluacion(eval)
                            .criterio(criterio)
                            .puntaje(scores.get(key))
                            .comentario("Puntuación para " + name)
                            .build();
                    detalleEvaluacionRepository.save(detail);
                }
            }
        } catch (Exception e) {
            System.err.println("Error syncing DetalleEvaluacion: " + e.getMessage());
        }
    }

    // --- MÉTODOS DE CONSULTA ---

    public List<PropuestaEvalDTO> getPropuestasPendientes() {
        Usuario user = getCurrentUser();
        boolean isGlobal = user.isAdmin() || user.isAuditor() || user.isObservador() || user.isAutoridad();
        boolean isAreaSolicitante = user.isAreaSolicitante();
        
        List<Propuesta> propuestas;
        if (isAreaSolicitante) {
            propuestas = propuestaRepository.findAll().stream()
                .filter(p -> p.getLicitacion() != null && p.getLicitacion().getCreadoPor() != null && p.getLicitacion().getCreadoPor().getId().equals(user.getId()))
                .collect(java.util.stream.Collectors.toList());
        } else if (!isGlobal) {
            Long areaId = user.getArea() != null ? user.getArea().getId() : 0L;
            propuestas = evaluacionRepository.findBandejaByEvaluadorIdOrAreaId(user.getId(), areaId).stream()
                .map(Evaluacion::getPropuesta)
                .filter(java.util.Objects::nonNull)
                .collect(java.util.stream.Collectors.toMap(
                    Propuesta::getId,
                    p -> p,
                    (first, duplicate) -> first,
                    java.util.LinkedHashMap::new
                ))
                .values().stream().collect(java.util.stream.Collectors.toList());
        } else {
            // Global roles see ALL proposals regardless of state
            propuestas = propuestaRepository.findByEstadoIn(java.util.List.of(
                com.licitaciones.sistema.entity.EstadoPropuesta.ENVIADA,
                com.licitaciones.sistema.entity.EstadoPropuesta.PENDIENTE_EVALUACION,
                com.licitaciones.sistema.entity.EstadoPropuesta.EN_REVISION,
                com.licitaciones.sistema.entity.EstadoPropuesta.VALIDADA,
                com.licitaciones.sistema.entity.EstadoPropuesta.EN_EVALUACION,
                com.licitaciones.sistema.entity.EstadoPropuesta.INCOMPLETA,
                com.licitaciones.sistema.entity.EstadoPropuesta.PENDIENTE_ADJUDICACION,
                com.licitaciones.sistema.entity.EstadoPropuesta.ACEPTADA
            ));
        }

        return propuestas.stream().map(p -> {
            List<Evaluacion> allEvals = evaluacionRepository.findAllByPropuestaIdAndActiveTrue(p.getId());
            double progreso = 0;
            String estadoEval = "PENDIENTE";
            if (!allEvals.isEmpty()) {
                long finalizedCount = allEvals.stream()
                    .filter(e -> e.getEstadoTramite() == com.licitaciones.sistema.entity.EstadoTramite.FINALIZADO)
                    .count();
                progreso = (double) finalizedCount / allEvals.size() * 100.0;
                if (finalizedCount == allEvals.size()) {
                    estadoEval = "FINALIZADO";
                } else {
                    estadoEval = "PENDIENTE";
                }
            }

            // Filtrar evaluadores visibles para no-administradores por ID o Area ID
            List<Evaluacion> visibleEvals = allEvals;
            if (!isGlobal) {
                final Long currentUserId = user.getId();
                final Long userAreaId = user.getArea() != null ? user.getArea().getId() : null;
                visibleEvals = allEvals.stream()
                    .filter(ev -> ev.getEvaluador().getId().equals(currentUserId)
                            || (userAreaId != null && ev.getEvaluador().getArea() != null
                                && ev.getEvaluador().getArea().getId().equals(userAreaId)))
                    .collect(java.util.stream.Collectors.toList());
            }

            // Construir lista de evaluadores con su estado individual
            java.util.List<com.licitaciones.sistema.dto.EvaluadorResumenDTO> evalDTOs = visibleEvals.stream().map(ev ->
                com.licitaciones.sistema.dto.EvaluadorResumenDTO.builder()
                    .evaluadorId(ev.getEvaluador().getId())
                    .nombreCompleto(ev.getEvaluador().getNombreCompleto())
                    .estadoTramite(ev.getEstadoTramite() != null ? ev.getEstadoTramite().toString() : "BORRADOR")
                    .resultado(ev.getResultado() != null ? ev.getResultado().toString() : "PENDIENTE")
                    .puntajeTotal(ev.getPuntajeTotal())
                    .build()
            ).collect(java.util.stream.Collectors.toList());
            
            String proveedorNombre = (p.getUsuario().getNombre() != null && !p.getUsuario().getNombre().isBlank()) 
                ? (p.getUsuario().getNombre() + " " + p.getUsuario().getApellido())
                : p.getEmpresaNombre();

            return PropuestaEvalDTO.builder()
                .id(p.getId())
                .nombre(p.getNombre())
                .proveedor(proveedorNombre)
                .licitacionTitulo(p.getLicitacion().getTitulo())
                .area(p.getLicitacion().getArea() != null ? p.getLicitacion().getArea().getNombre() : "N/A")
                .monto(p.getMontoOfertado())
                .fechaEnvio(p.getFechaEnvio())
                .fechaLimite(p.getLicitacion().getFechaEvaluacion() != null ? p.getLicitacion().getFechaEvaluacion() : (p.getFechaEnvio() != null ? p.getFechaEnvio().plusDays(7) : LocalDateTime.now().plusDays(7)))
                .estadoPropuesta(p.getEstado().toString())
                .estadoEvaluacion(estadoEval)
                .progreso(progreso)
                .evaluadores(evalDTOs)
                .build();
        }).collect(java.util.stream.Collectors.toList());
    }

    public List<PropuestaEvalDTO> getPropuestasByLicitacion(Long licitacionId) {
        Usuario currentUser = getCurrentUser();
        List<Propuesta> propuestas = propuestaRepository.findByLicitacionId(licitacionId);
        
        return propuestas.stream().map(p -> {
            Optional<Evaluacion> eval = evaluacionRepository.findByPropuestaIdAndEvaluadorId(p.getId(), currentUser.getId());
            String estadoEval = "PENDIENTE";
            Integer puntaje = null;
            
            if (eval.isPresent()) {
                estadoEval = eval.get().getEstadoTramite().toString();
                puntaje = eval.get().getPuntajeTotal();
            }
            
            String proveedorNombre = (p.getUsuario().getNombre() != null && !p.getUsuario().getNombre().isBlank()) 
                ? (p.getUsuario().getNombre() + " " + p.getUsuario().getApellido())
                : p.getEmpresaNombre();

            return PropuestaEvalDTO.builder()
                .id(p.getId())
                .nombre(p.getNombre())
                .proveedor(proveedorNombre)
                .monto(p.getMontoOfertado())
                .fechaEnvio(p.getFechaEnvio())
                .fechaLimite(p.getLicitacion().getFechaEvaluacion() != null ? p.getLicitacion().getFechaEvaluacion() : (p.getFechaEnvio() != null ? p.getFechaEnvio().plusDays(7) : LocalDateTime.now().plusDays(7)))
                .estadoPropuesta(p.getEstado().toString())
                .estadoEvaluacion(estadoEval)
                .puntajeTotal(puntaje)
                .archivoUrl(p.getArchivoUrl())
                .build();
        }).collect(java.util.stream.Collectors.toList());
    }

    public List<Propuesta> getRanking(Long licitacionId) {
        return propuestaRepository.findByLicitacionIdOrderByPuntajeTotalDesc(licitacionId);
    }

    public List<Evaluacion> getEvaluacionesByLicitacion(Long licitacionId) {
        return evaluacionRepository.findByPropuestaLicitacionId(licitacionId);
    }

    public Optional<Evaluacion> getEvaluacionPorPropuestaYUsuario(Long propuestaId, Long usuarioId) {
        return evaluacionRepository.findByPropuestaIdAndEvaluadorId(propuestaId, usuarioId);
    }

    public List<Evaluacion> getEvaluacionesPorPropuesta(Long propuestaId) {
        return evaluacionRepository.findAllByPropuestaIdConEvaluador(propuestaId);
    }

    public List<Evaluacion> getEvaluacionesPorEvaluador(Long evaluadorId) {
        return evaluacionRepository.findBandejaByEvaluadorId(evaluadorId);
    }

    public List<Evaluacion> getTodasLasEvaluacionesActivas() {
        return evaluacionRepository.findAll().stream()
                .filter(Evaluacion::getActive)
                .collect(java.util.stream.Collectors.toList());
    }

    public List<com.licitaciones.sistema.dto.PropuestaEvalDTO> getMisAsignacionesDTO(Long evaluadorId) {
        List<Propuesta> propuestas = evaluacionRepository.findBandejaByEvaluadorId(evaluadorId).stream()
            .map(Evaluacion::getPropuesta)
            .filter(java.util.Objects::nonNull)
            .collect(java.util.stream.Collectors.toMap(
                Propuesta::getId,
                p -> p,
                (first, duplicate) -> first,
                java.util.LinkedHashMap::new
            ))
            .values().stream().collect(java.util.stream.Collectors.toList());

        return propuestas.stream().map(p -> {
            List<Evaluacion> allEvals = evaluacionRepository.findAllByPropuestaIdAndActiveTrue(p.getId());
            double progreso = 0;
            String estadoEval = "PENDIENTE";
            if (!allEvals.isEmpty()) {
                long finalizedCount = allEvals.stream()
                    .filter(e -> e.getEstadoTramite() == com.licitaciones.sistema.entity.EstadoTramite.FINALIZADO)
                    .count();
                progreso = (double) finalizedCount / allEvals.size() * 100.0;
                if (finalizedCount == allEvals.size()) {
                    estadoEval = "FINALIZADO";
                } else {
                    estadoEval = "PENDIENTE";
                }
            }

            // For strict evaluators, they only see their own evaluation
            List<Evaluacion> visibleEvals = allEvals.stream()
                .filter(ev -> ev.getEvaluador().getId().equals(evaluadorId))
                .collect(java.util.stream.Collectors.toList());

            java.util.List<com.licitaciones.sistema.dto.EvaluadorResumenDTO> evalDTOs = visibleEvals.stream().map(ev ->
                com.licitaciones.sistema.dto.EvaluadorResumenDTO.builder()
                    .evaluadorId(ev.getEvaluador().getId())
                    .nombreCompleto(ev.getEvaluador().getNombreCompleto())
                    .estadoTramite(ev.getEstadoTramite() != null ? ev.getEstadoTramite().toString() : "BORRADOR")
                    .resultado(ev.getResultado() != null ? ev.getResultado().toString() : "PENDIENTE")
                    .puntajeTotal(ev.getPuntajeTotal())
                    .build()
            ).collect(java.util.stream.Collectors.toList());
            
            String proveedorNombre = (p.getUsuario().getNombre() != null && !p.getUsuario().getNombre().isBlank()) 
                ? (p.getUsuario().getNombre() + " " + p.getUsuario().getApellido())
                : p.getEmpresaNombre();

            return com.licitaciones.sistema.dto.PropuestaEvalDTO.builder()
                .id(p.getId())
                .nombre(p.getNombre())
                .proveedor(proveedorNombre)
                .licitacionTitulo(p.getLicitacion().getTitulo())
                .area(p.getLicitacion().getArea() != null ? p.getLicitacion().getArea().getNombre() : "N/A")
                .monto(p.getMontoOfertado())
                .fechaEnvio(p.getFechaEnvio())
                .fechaLimite(p.getLicitacion().getFechaEvaluacion() != null ? p.getLicitacion().getFechaEvaluacion() : (p.getFechaEnvio() != null ? p.getFechaEnvio().plusDays(7) : java.time.LocalDateTime.now().plusDays(7)))
                .estadoPropuesta(p.getEstado().toString())
                .estadoEvaluacion(estadoEval)
                .progreso(progreso)
                .evaluadores(evalDTOs)
                .build();
        }).collect(java.util.stream.Collectors.toList());
    }

    public Optional<Licitacion> getLicitacionForEvaluation(Long id) {
        return licitacionRepository.findById(id);
    }

    public Optional<Evaluacion> getMiEvaluacionDeLicitacion(Long licitacionId, Long usuarioId) {
        return evaluacionRepository.findByLicitacionIdAndEvaluadorId(licitacionId, usuarioId);
    }

    private Usuario getCurrentUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String username = (principal instanceof UserDetails) ? ((UserDetails) principal).getUsername() : principal.toString();
        return usuarioRepository.findByUsername(username).orElseThrow();
    }

    public Propuesta getPropuestaParaEvaluar(Long propuestaId) {
        return propuestaRepository.findById(propuestaId)
                .orElseThrow(() -> new RuntimeException("Propuesta no encontrada"));
    }

    public byte[] downloadAllProposalsZip(Long licitacionId) throws IOException {
        List<Propuesta> propuestas = propuestaRepository.findByLicitacionId(licitacionId);
        Map<String, String> filesToZip = new HashMap<>();

        for (Propuesta p : propuestas) {
            String supplierName = (p.getEmpresaNombre() != null && !p.getEmpresaNombre().trim().isEmpty()) 
                    ? p.getEmpresaNombre() 
                    : (p.getUsuario().getNombre() != null ? p.getUsuario().getNombre() : "Empresa_" + p.getUsuario().getId());
            String sanitizedSupplier = supplierName.trim().replace(" ", "_").replaceAll("[^a-zA-Z0-9_-]", "");

            // 1. Main Proposal PDF
            if (p.getArchivoUrl() != null) {
                String fileUrl = p.getArchivoUrl();
                String relativePath = fileUrl;
                String matchStr = "/api/files/";
                int idx = fileUrl.indexOf(matchStr);
                if (idx != -1) {
                    relativePath = fileUrl.substring(idx + matchStr.length());
                }
                String absolutePath = java.nio.file.Paths.get(uploadDir).resolve(relativePath).toString();
                String zipEntryName = "LIC-" + licitacionId + "/Propuestas/" + sanitizedSupplier + "/" + sanitizedSupplier + "_propuesta.pdf";
                filesToZip.put(zipEntryName, absolutePath);
            }

            // 2. Additional Documentation uploaded by this bidder
            if (p.getDocumentos() != null) {
                for (com.licitaciones.sistema.entity.DocumentoPropuesta doc : p.getDocumentos()) {
                    if (doc.getRutaArchivo() != null) {
                        String fileUrl = doc.getRutaArchivo();
                        String relativePath = fileUrl;
                        String matchStr = "/api/files/";
                        int idx = fileUrl.indexOf(matchStr);
                        if (idx != -1) {
                            relativePath = fileUrl.substring(idx + matchStr.length());
                        }
                        String absolutePath = java.nio.file.Paths.get(uploadDir).resolve(relativePath).toString();
                        String zipEntryName = "LIC-" + licitacionId + "/Propuestas/" + sanitizedSupplier + "/Documentos/" + doc.getNombreArchivo();
                        filesToZip.put(zipEntryName, absolutePath);
                    }
                }
            }
        }
        return zipService.createZip(filesToZip);
    }

    @Transactional
    public Licitacion adjudicarLicitacion(Long licitacionId) {
        Licitacion licitacion = licitacionRepository.findById(licitacionId)
                .orElseThrow(() -> new RuntimeException("Licitación no encontrada"));
        
        licitacion.setEstado(EstadoLicitacion.ADJUDICADA);
        
        // Crear hito de adjudicación
        LicitacionHito hito = LicitacionHito.builder()
                .licitacion(licitacion)
                .titulo("ADJUDICACIÓN")
                .descripcion("La licitación ha sido adjudicada satisfactoriamente.")
                .fecha(LocalDateTime.now())
                .build();
        licitacionHitoRepository.save(hito);
        
        return licitacionRepository.save(licitacion);
    }

    private void saveHistorialSnapshot(Evaluacion e) {
        com.licitaciones.sistema.entity.EvaluacionHistorial snapshot = com.licitaciones.sistema.entity.EvaluacionHistorial.builder()
                .evaluacion(e)
                .version(e.getVersion())
                .puntajesJson(e.getPuntajesJson())
                .puntajeTotal(e.getPuntajeTotal())
                .comentarios(e.getComentarios())
                .fechaCambio(LocalDateTime.now())
                .modificadoPor(e.getEvaluador())
                .build();
        evaluacionHistorialRepository.save(snapshot);
    }

    public ByteArrayInputStream exportResumenPdf(Long propuestaId, Long evaluadorId) {
        Propuesta propuesta = propuestaRepository.findById(propuestaId)
                .orElseThrow(() -> new RuntimeException("Propuesta no encontrada"));
        
        Evaluacion eval = null;
        if (evaluadorId != null) {
            eval = evaluacionRepository.findByPropuestaIdAndEvaluadorId(propuestaId, evaluadorId).orElse(null);
        }
        if (eval == null) {
            List<Evaluacion> evaluaciones = evaluacionRepository.findAllByPropuestaIdAndActiveTrue(propuestaId);
            eval = evaluaciones.isEmpty() ? null : evaluaciones.get(0);
        }

        Document document = new Document(PageSize.A4);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            // Fonts
            Font fontTitle = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, new java.awt.Color(30, 58, 138));
            Font fontSection = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, new java.awt.Color(51, 65, 85));
            Font fontBold = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, java.awt.Color.DARK_GRAY);
            Font fontNormal = FontFactory.getFont(FontFactory.HELVETICA, 10, java.awt.Color.DARK_GRAY);

            // Title
            String evaluatorName = "";
            if (eval != null && eval.getEvaluador() != null) {
                evaluatorName = eval.getEvaluador().getNombre() + " " + eval.getEvaluador().getApellido();
            }
            String titleText = "RÚBRICA DE EVALUACIÓN TÉCNICA";
            if (!evaluatorName.isEmpty()) {
                titleText += "\nEVALUADOR: " + evaluatorName.toUpperCase();
            }
            Paragraph title = new Paragraph(titleText, fontTitle);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(20);
            document.add(title);

            // Subtitle
            Paragraph subtitle = new Paragraph("Expediente #" + propuestaId + " - Licitación: " + propuesta.getLicitacion().getTitulo(), fontBold);
            subtitle.setAlignment(Element.ALIGN_CENTER);
            subtitle.setSpacingAfter(20);
            document.add(subtitle);

            // 1. INFORMACIÓN GENERAL DE LA PROPUESTA
            Paragraph sec1 = new Paragraph("1. INFORMACIÓN GENERAL DE LA PROPUESTA", fontSection);
            sec1.setSpacingAfter(10);
            document.add(sec1);

            PdfPTable tableInfo = new PdfPTable(2);
            tableInfo.setWidthPercentage(100);
            tableInfo.setWidths(new float[]{1, 2});

            tableInfo.addCell(new Phrase("Nombre de la Propuesta:", fontBold));
            tableInfo.addCell(new Phrase(propuesta.getNombre(), fontNormal));

            tableInfo.addCell(new Phrase("Proveedor / Postulante:", fontBold));
            tableInfo.addCell(new Phrase(propuesta.getEmpresaNombre() + " (RUC: " + propuesta.getIdentificacionRuc() + ")", fontNormal));

            tableInfo.addCell(new Phrase("Monto Ofertado:", fontBold));
            tableInfo.addCell(new Phrase(propuesta.getMoneda() + " " + propuesta.getMontoOfertado(), fontNormal));

            tableInfo.addCell(new Phrase("Plazo de Entrega:", fontBold));
            tableInfo.addCell(new Phrase(propuesta.getTiempoEntregaDias() + " días", fontNormal));

            tableInfo.addCell(new Phrase("Fecha de Envío:", fontBold));
            tableInfo.addCell(new Phrase(propuesta.getFechaEnvio().toString(), fontNormal));

            tableInfo.addCell(new Phrase("Estado Actual:", fontBold));
            tableInfo.addCell(new Phrase(propuesta.getEstado().toString(), fontNormal));

            tableInfo.setSpacingAfter(20);
            document.add(tableInfo);

            // 2. CALIFICACIÓN TÉCNICA
            Paragraph sec2 = new Paragraph("2. CALIFICACIÓN TÉCNICA", fontSection);
            sec2.setSpacingAfter(10);
            document.add(sec2);

            PdfPTable tableScores = new PdfPTable(2);
            tableScores.setWidthPercentage(100);
            tableScores.setWidths(new float[]{3, 1});

            int scoreTotal = eval != null && eval.getPuntajeTotal() != null ? eval.getPuntajeTotal() : 0;

            tableScores.addCell(new Phrase("Criterios Técnicos Evaluados", fontBold));
            tableScores.addCell(new Phrase("Calificación", fontBold));

            // Obtener preguntas dinámicas por área
            String areaName = propuesta.getLicitacion().getArea() != null ? propuesta.getLicitacion().getArea().getNombre() : "General";
            List<String> preguntas = rubricaService.getPreguntasPorArea(areaName);

            // Obtener puntajes reales de la evaluación
            Map<String, Object> scoresMap = new java.util.HashMap<>();
            if (eval != null && eval.getPuntajesJson() != null && !eval.getPuntajesJson().isEmpty()) {
                try {
                    ObjectMapper mapper = new ObjectMapper();
                    scoresMap = mapper.readValue(eval.getPuntajesJson(), Map.class);
                } catch (Exception e) {
                    System.err.println("Error parsing puntajesJson in PDF export: " + e.getMessage());
                }
            }

            for (int i = 1; i <= 5; i++) {
                String question = (i - 1 < preguntas.size()) ? preguntas.get(i - 1) : "Criterio " + i;
                Object value = scoresMap.get("p" + i);
                String scoreStr = "0/10";
                if (eval != null && value != null) {
                    scoreStr = value.toString() + "/10";
                }
                tableScores.addCell(new Phrase(question, fontNormal));
                tableScores.addCell(new Phrase(scoreStr, fontNormal));
            }

            tableScores.addCell(new Phrase("PUNTAJE TÉCNICO TOTAL OBLIGATORIO:", fontBold));
            tableScores.addCell(new Phrase(scoreTotal + " / 50", fontBold));

            tableScores.setSpacingAfter(20);
            document.add(tableScores);

            // 3. DICTAMEN Y OBSERVACIONES CUALITATIVAS
            Paragraph sec3 = new Paragraph("3. DICTAMEN Y OBSERVACIONES CUALITATIVAS", fontSection);
            sec3.setSpacingAfter(10);
            document.add(sec3);

            // Parse qualitative responses from respuestasJson
            String r1 = "";
            String r2 = "";
            String r3 = "";
            if (eval != null && eval.getRespuestasJson() != null && !eval.getRespuestasJson().isEmpty()) {
                try {
                    ObjectMapper mapper = new ObjectMapper();
                    Map<String, String> respMap = mapper.readValue(eval.getRespuestasJson(), Map.class);
                    r1 = respMap.getOrDefault("r1", "");
                    r2 = respMap.getOrDefault("r2", "");
                    r3 = respMap.getOrDefault("r3", "");
                } catch (Exception e) {
                    System.err.println("Error parsing respuestasJson in PDF export: " + e.getMessage());
                }
            }

            // A. Cumplimiento
            Paragraph q1Title = new Paragraph("A. Cumplimiento de especificaciones y requisitos técnicos:", fontBold);
            q1Title.setSpacingAfter(2);
            document.add(q1Title);
            Paragraph q1Ans = new Paragraph(r1 == null || r1.isBlank() ? "No registrado" : r1, fontNormal);
            q1Ans.setSpacingAfter(10);
            document.add(q1Ans);

            // B. Fortalezas
            Paragraph q2Title = new Paragraph("B. Fortalezas de la propuesta:", fontBold);
            q2Title.setSpacingAfter(2);
            document.add(q2Title);
            Paragraph q2Ans = new Paragraph(r2 == null || r2.isBlank() ? "No registrado" : r2, fontNormal);
            q2Ans.setSpacingAfter(10);
            document.add(q2Ans);

            // C. Recomendaciones
            Paragraph q3Title = new Paragraph("C. Recomendación o sugerencia de adjudicación:", fontBold);
            q3Title.setSpacingAfter(2);
            document.add(q3Title);
            Paragraph q3Ans = new Paragraph(r3 == null || r3.isBlank() ? "No registrado" : r3, fontNormal);
            q3Ans.setSpacingAfter(10);
            document.add(q3Ans);

            // D. Observaciones/Comentarios
            Paragraph q4Title = new Paragraph("D. Observaciones o Dictamen Final:", fontBold);
            q4Title.setSpacingAfter(2);
            document.add(q4Title);
            String obs = eval != null && (eval.getObservaciones() != null || eval.getComentarios() != null) 
                    ? (eval.getObservaciones() != null ? eval.getObservaciones() : eval.getComentarios()) 
                    : "Sin observaciones cualitativas registradas.";
            Paragraph obsPara = new Paragraph(obs, fontNormal);
            obsPara.setSpacingAfter(30);
            document.add(obsPara);

            // Signatures
            String signatureLabel = "_____________________________________\nFirma del Evaluador Autorizado";
            if (!evaluatorName.isEmpty()) {
                signatureLabel = "_____________________________________\nFirma de: " + evaluatorName + "\nEvaluador Técnico Autorizado";
            }
            Paragraph signatureLine = new Paragraph(signatureLabel, fontBold);
            signatureLine.setAlignment(Element.ALIGN_CENTER);
            document.add(signatureLine);

            document.close();
        } catch (DocumentException e) {
            e.printStackTrace();
        }

        return new ByteArrayInputStream(out.toByteArray());
    }

    public ByteArrayInputStream exportConstanciaPdf(Long propuestaId) {
        Propuesta propuesta = propuestaRepository.findById(propuestaId)
                .orElseThrow(() -> new RuntimeException("Propuesta no encontrada"));
        List<Evaluacion> evaluaciones = evaluacionRepository.findAllByPropuestaIdAndActiveTrue(propuestaId);
        Evaluacion eval = evaluaciones.isEmpty() ? null : evaluaciones.get(0);

        Document document = new Document(PageSize.A4);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            // Fonts
            Font fontHeader = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20, new java.awt.Color(30, 58, 138));
            Font fontSub = FontFactory.getFont(FontFactory.HELVETICA, 10, java.awt.Color.GRAY);
            Font fontBody = FontFactory.getFont(FontFactory.HELVETICA, 11, java.awt.Color.DARK_GRAY);
            Font fontBold = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, java.awt.Color.DARK_GRAY);

            // Stamp/Frame border
            Paragraph header = new Paragraph("CONSTANCIA OFICIAL DE EVALUACIÓN TÉCNICA", fontHeader);
            header.setAlignment(Element.ALIGN_CENTER);
            header.setSpacingAfter(5);
            document.add(header);

            Paragraph sub = new Paragraph("SISTEMA GENERAL DE CONTRATACIONES DEL ESTADO", fontSub);
            sub.setAlignment(Element.ALIGN_CENTER);
            sub.setSpacingAfter(40);
            document.add(sub);

            // Certification Text
            Paragraph body = new Paragraph();
            body.add(new com.lowagie.text.Chunk("Por medio del presente documento oficial, la Comisión Evaluadora Técnica del Comité de Licitación hace constar que la propuesta del oferente ", fontBody));
            body.add(new com.lowagie.text.Chunk(propuesta.getEmpresaNombre(), fontBold));
            body.add(new com.lowagie.text.Chunk(", identificada con RUC número ", fontBody));
            body.add(new com.lowagie.text.Chunk(propuesta.getIdentificacionRuc(), fontBold));
            body.add(new com.lowagie.text.Chunk(", y presentada bajo el expediente N° ", fontBody));
            body.add(new com.lowagie.text.Chunk(String.valueOf(propuestaId), fontBold));
            body.add(new com.lowagie.text.Chunk(" para la licitación pública: ", fontBody));
            body.add(new com.lowagie.text.Chunk("\"" + propuesta.getLicitacion().getTitulo() + "\"", fontBold));
            body.add(new com.lowagie.text.Chunk(", ha sido satisfactoriamente evaluada y calificada según las bases oficiales y los criterios técnicos vigentes.\n\n", fontBody));
            body.add(new com.lowagie.text.Chunk("Que la calificación consolidada obtenida es de ", fontBody));
            body.add(new com.lowagie.text.Chunk((eval != null && eval.getPuntajeTotal() != null ? eval.getPuntajeTotal() : 0) + " / 50 puntos técnicos obligatorios", fontBold));
            body.add(new com.lowagie.text.Chunk(", determinando que el proveedor cumple cabalmente con todos los estándares y requerimientos técnicos solicitados.\n\n", fontBody));
            body.add(new com.lowagie.text.Chunk("Por lo tanto, la Comisión le otorga la calificación final de: ", fontBody));
            body.add(new com.lowagie.text.Chunk("PROVEEDOR APTO", fontBold));
            body.add(new com.lowagie.text.Chunk(" con una recomendación de viabilidad favorable para la adjudicación.\n\n\n\n", fontBody));
            
            body.setLeading(16);
            body.setSpacingAfter(50);
            document.add(body);

            // Validation code
            Paragraph code = new Paragraph("CÓDIGO DE VALIDACIÓN DIGITAL: CONST-EVAL-" + propuestaId + "-" + (System.currentTimeMillis() / 1000) + "\nFecha de Emisión: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss")), fontSub);
            code.setSpacingAfter(60);
            document.add(code);

            // Signatures
            PdfPTable signatureTable = new PdfPTable(2);
            signatureTable.setWidthPercentage(100);
            
            PdfPCell sig1 = new PdfPCell(new Paragraph("_____________________________________\nIng. Carlos Pérez Medina\nPresidente de la Comisión Técnica", fontBold));
            sig1.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
            sig1.setHorizontalAlignment(Element.ALIGN_CENTER);
            signatureTable.addCell(sig1);

            PdfPCell sig2 = new PdfPCell(new Paragraph("_____________________________________\n" + (eval != null && eval.getEvaluador() != null ? eval.getEvaluador().getNombre() : "Evaluador Autorizado") + "\nEvaluador Técnico Asignado", fontBold));
            sig2.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
            sig2.setHorizontalAlignment(Element.ALIGN_CENTER);
            signatureTable.addCell(sig2);

            document.add(signatureTable);

            document.close();
        } catch (DocumentException e) {
            e.printStackTrace();
        }

        return new ByteArrayInputStream(out.toByteArray());
    }

    @Transactional
    public Evaluacion asignarEvaluadorAPropuesta(Long propuestaId, Long evaluadorId) {
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
        evaluacion.setEstadoTramite(com.licitaciones.sistema.entity.EstadoTramite.BORRADOR);
        evaluacion.setPuntajeTotal(0);
        evaluacion.setEstrellas(0);
        evaluacion.setResultado(com.licitaciones.sistema.entity.EstadoEvaluacion.PENDIENTE);
        evaluacion.setSinConflictoInteres(true);
        
        // Dejar campos nulos para que el evaluador empiece limpio, sin heredar datos
        evaluacion.setPuntajesJson(null);
        evaluacion.setRespuestasJson(null);
        evaluacion.setObservaciones(null);
        evaluacion.setComentarios(null);
        evaluacion.setCumpleRequisitos(null);
        
        Evaluacion saved = evaluacionRepository.save(evaluacion);
        
        notificacionService.crear(
            evaluador,
            "Nueva Asignación de Evaluación",
            "Se le ha asignado la evaluación de la propuesta " + propuesta.getEmpresaNombre() + " para la licitación " + propuesta.getLicitacion().getTitulo(),
            "EVALUACION",
            "fa-users-gear",
            "blue",
            "/evaluaciones/evaluar/" + propuestaId
        );
        
        return saved;
    }

    @Transactional
    public void desasignarEvaluadorDePropuesta(Long propuestaId, Long evaluadorId) {
        Optional<Evaluacion> existente = evaluacionRepository.findByPropuestaIdAndEvaluadorId(propuestaId, evaluadorId);
        if (existente.isPresent()) {
            Evaluacion eval = existente.get();
            if (eval.getEstadoTramite() == com.licitaciones.sistema.entity.EstadoTramite.FINALIZADO) {
                throw new RuntimeException("No se puede desasignar un evaluador que ya ha finalizado su calificación.");
            }
            evaluacionRepository.delete(eval);
        }
    }
}
