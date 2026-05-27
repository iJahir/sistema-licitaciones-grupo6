package com.licitaciones.sistema.service;

import com.licitaciones.sistema.entity.CalendarioEvento;
import com.licitaciones.sistema.entity.TipoEvento;
import com.licitaciones.sistema.entity.Usuario;
import com.licitaciones.sistema.repository.CalendarioEventoRepository;
import com.licitaciones.sistema.repository.LicitacionRepository;
import com.licitaciones.sistema.repository.PropuestaRepository;
import com.licitaciones.sistema.repository.EvaluacionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class CalendarioEventoService {

    @Autowired
    private CalendarioEventoRepository repository;

    @Autowired
    private NotificacionService notificacionService;

    @Autowired
    private LicitacionRepository licitacionRepository;

    @Autowired
    private PropuestaRepository propuestaRepository;

    @Autowired
    private EvaluacionRepository evaluacionRepository;

    @Autowired
    private com.licitaciones.sistema.service.ContratoService contratoService;

    public List<CalendarioEvento> findAll() {
        return repository.findAll();
    }

    public List<CalendarioEvento> findByRole(Usuario user) {
        if (user.isAdmin() || user.isAuditor() || user.isObservador() || user.isAutoridad()) {
            return repository.findAll();
        } else if (user.isEvaluador()) {
            // Evaluador must only see events related to their assigned evaluations
            List<com.licitaciones.sistema.entity.Evaluacion> evs = evaluacionRepository.findByEvaluadorId(user.getId());
            java.util.Set<Long> licitacionIds = evs.stream()
                .map(e -> e.getLicitacion() != null ? e.getLicitacion().getId() : (e.getPropuesta() != null && e.getPropuesta().getLicitacion() != null ? e.getPropuesta().getLicitacion().getId() : null))
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());
            java.util.Set<Long> propuestaIds = evs.stream()
                .map(e -> e.getPropuesta() != null ? e.getPropuesta().getId() : null)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());

            return repository.findAll().stream()
                .filter(e -> {
                    // Created by this user
                    if (e.getUsuario() != null && e.getUsuario().getId().equals(user.getId())) {
                        return true;
                    }
                    // Related to their assigned licitaciones
                    if ("licitacion".equalsIgnoreCase(e.getReferenciaTipo()) || "LICITACION_CIERRE".equalsIgnoreCase(e.getReferenciaTipo())) {
                        return e.getReferenciaId() != null && licitacionIds.contains(e.getReferenciaId());
                    }
                    // Related to their assigned proposals
                    if ("propuesta".equalsIgnoreCase(e.getReferenciaTipo())) {
                        return e.getReferenciaId() != null && propuestaIds.contains(e.getReferenciaId());
                    }
                    // Global events
                    return e.getTipoEvento() == TipoEvento.EVENTO_GENERAL || e.getTipoEvento() == TipoEvento.MANTENIMIENTO_SISTEMA;
                })
                .collect(Collectors.toList());
        } else if (user.isAreaSolicitante()) {
            // Area Solicitante: only events related to their own tenders (creation, publication, proposal reception, evaluations, award, contract)
            List<com.licitaciones.sistema.entity.Licitacion> licitaciones = licitacionRepository.findAll().stream()
                .filter(l -> (l.getArea() != null && user.getArea() != null && l.getArea().getId().equals(user.getArea().getId()))
                          || (l.getCreadoPor() != null && l.getCreadoPor().getId().equals(user.getId())))
                .collect(Collectors.toList());
            java.util.Set<Long> licitacionIds = licitaciones.stream()
                .map(com.licitaciones.sistema.entity.Licitacion::getId)
                .collect(Collectors.toSet());
            
            java.util.Set<Long> propuestaIds = propuestaRepository.findAll().stream()
                .filter(p -> p.getLicitacion() != null && licitacionIds.contains(p.getLicitacion().getId()))
                .map(com.licitaciones.sistema.entity.Propuesta::getId)
                .collect(Collectors.toSet());

            List<com.licitaciones.sistema.entity.Contrato> areaContracts = contratoService.findAll().stream()
                .filter(c -> c.getLicitacion() != null && 
                    ((c.getLicitacion().getArea() != null && user.getArea() != null && c.getLicitacion().getArea().getId().equals(user.getArea().getId()))
                  || (c.getLicitacion().getCreadoPor() != null && c.getLicitacion().getCreadoPor().getId().equals(user.getId()))))
                .collect(Collectors.toList());
            java.util.Set<Long> areaContractIds = areaContracts.stream()
                .map(com.licitaciones.sistema.entity.Contrato::getId)
                .collect(Collectors.toSet());

            return repository.findAll().stream()
                .filter(e -> {
                    // Created by this area user
                    if (e.getUsuario() != null && e.getUsuario().getId().equals(user.getId())) {
                        return true;
                    }
                    // Matches their area directly
                    if (e.getArea() != null && e.getArea().equals(user.getArea())) {
                        return true;
                    }
                    // Related to their licitaciones
                    if ("licitacion".equalsIgnoreCase(e.getReferenciaTipo()) || "LICITACION_CIERRE".equalsIgnoreCase(e.getReferenciaTipo())) {
                        return e.getReferenciaId() != null && licitacionIds.contains(e.getReferenciaId());
                    }
                    // Related to their proposals
                    if ("propuesta".equalsIgnoreCase(e.getReferenciaTipo())) {
                        return e.getReferenciaId() != null && propuestaIds.contains(e.getReferenciaId());
                    }
                    // Related to their contracts
                    if ("contrato".equalsIgnoreCase(e.getReferenciaTipo())) {
                        return e.getReferenciaId() != null && areaContractIds.contains(e.getReferenciaId());
                    }
                    // Related to adjudications (where e.getReferenciaId() is licitacionId)
                    if ("adjudicacion".equalsIgnoreCase(e.getReferenciaTipo())) {
                        return e.getReferenciaId() != null && licitacionIds.contains(e.getReferenciaId());
                    }
                    // Global events
                    return e.getTipoEvento() == TipoEvento.EVENTO_GENERAL || e.getTipoEvento() == TipoEvento.MANTENIMIENTO_SISTEMA;
                })
                .collect(Collectors.toList());
        } else {
            // ROLE_PROVEEDOR: ve sus propias propuestas o licitaciones públicas
            List<com.licitaciones.sistema.entity.Propuesta> props = propuestaRepository.findByUsuario(user);
            java.util.Set<Long> ownProposalIds = props.stream()
                .map(com.licitaciones.sistema.entity.Propuesta::getId)
                .collect(Collectors.toSet());
            java.util.Set<Long> ownLicitacionIds = props.stream()
                .map(p -> p.getLicitacion() != null ? p.getLicitacion().getId() : null)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());

            List<com.licitaciones.sistema.entity.Contrato> contracts = contratoService.findAll().stream()
                .filter(c -> c.getPropuesta() != null && c.getPropuesta().getUsuario() != null 
                    && c.getPropuesta().getUsuario().getId().equals(user.getId()))
                .collect(Collectors.toList());
            java.util.Set<Long> ownContractIds = contracts.stream()
                .map(com.licitaciones.sistema.entity.Contrato::getId)
                .collect(Collectors.toSet());

            return repository.findAll().stream()
                .filter(e -> {
                    // Created by this user
                    if (e.getUsuario() != null && e.getUsuario().getId().equals(user.getId())) {
                        return true;
                    }
                    // Related to their own proposals
                    if ("propuesta".equalsIgnoreCase(e.getReferenciaTipo())) {
                        return e.getReferenciaId() != null && ownProposalIds.contains(e.getReferenciaId());
                    }
                    // Related to licitaciones they participated in
                    if ("licitacion".equalsIgnoreCase(e.getReferenciaTipo()) || "LICITACION_CIERRE".equalsIgnoreCase(e.getReferenciaTipo())) {
                        if (e.getReferenciaId() != null && ownLicitacionIds.contains(e.getReferenciaId())) {
                            return true;
                        }
                    }
                    // Related to their contracts
                    if ("contrato".equalsIgnoreCase(e.getReferenciaTipo())) {
                        return e.getReferenciaId() != null && ownContractIds.contains(e.getReferenciaId());
                    }
                    // Related to adjudications (where e.getReferenciaId() is licitacionId)
                    if ("adjudicacion".equalsIgnoreCase(e.getReferenciaTipo())) {
                        return e.getReferenciaId() != null && ownLicitacionIds.contains(e.getReferenciaId());
                    }
                    // Public/general events
                    return e.getTipoEvento() == TipoEvento.LICITACION_PUBLICADA 
                        || e.getTipoEvento() == TipoEvento.EVENTO_GENERAL
                        || e.getTipoEvento() == TipoEvento.MANTENIMIENTO_SISTEMA;
                })
                .collect(Collectors.toList());
        }
    }

    public List<CalendarioEvento> findByDateAndRole(LocalDateTime start, LocalDateTime end, Usuario user) {
        // Implementación simplificada for now, relying on in-memory filtering for role
        // In production this should be a custom query in repository
        return findByRole(user).stream()
            .filter(e -> !e.getFechaEvento().isBefore(start) && !e.getFechaEvento().isAfter(end))
            .collect(Collectors.toList());
    }

    public CalendarioEvento save(CalendarioEvento evento) {
        CalendarioEvento saved = repository.save(evento);
        
        // Notificaciones globales automáticas para eventos guardados manualmente por el usuario
        TipoEvento tipo = saved.getTipoEvento();
        if (tipo == TipoEvento.NOTA || tipo == TipoEvento.EVENTO_GENERAL || tipo == TipoEvento.REUNION_EVALUACION || tipo == TipoEvento.MANTENIMIENTO_SISTEMA) {
            String icono = getIconForTipo(tipo);
            String color = "#64748b"; // Default
            if (tipo == TipoEvento.NOTA) color = "#8b5cf6";
            if (tipo == TipoEvento.MANTENIMIENTO_SISTEMA) color = "#ef4444";
            if (tipo == TipoEvento.REUNION_EVALUACION) color = "#6366f1";
            
            notificacionService.crearGlobal(saved.getTitulo(), saved.getDescripcion(), tipo.name(), icono, color, null);
        }
        
        return saved;
    }

    public void syncLicitacionEvents(com.licitaciones.sistema.entity.Licitacion licitacion) {
        // Remove existing events for this licitacion closure to avoid duplicates
        repository.findByReferenciaIdAndReferenciaTipo(licitacion.getId(), "LICITACION_CIERRE")
            .ifPresent(e -> repository.delete(e));

        if (licitacion.getEstado() == com.licitaciones.sistema.entity.EstadoLicitacion.PUBLICADA && licitacion.getFechaCierre() != null) {
            registrarEvento(
                "Cierre: " + licitacion.getTitulo(),
                "Fecha límite para recibir propuestas de la licitación #" + licitacion.getId(),
                TipoEvento.CIERRE_LICITACION,
                licitacion.getFechaCierre(),
                licitacion.getId(),
                "LICITACION_CIERRE",
                1,
                licitacion.getCreadoPor()
            );
        }
    }

    private String getIconForTipo(TipoEvento tipo) {
        if (tipo == TipoEvento.NOTA) {
            return "fa-file-lines";
        } else if (tipo == TipoEvento.MANTENIMIENTO_SISTEMA) {
            return "fa-wrench";
        } else if (tipo == TipoEvento.REUNION_EVALUACION) {
            return "fa-users";
        } else if (tipo == TipoEvento.EVENTO_GENERAL) {
            return "fa-bell";
        }
        return "fa-info-circle";
    }

    public void registrarEvento(String titulo, String desc, TipoEvento tipo, LocalDateTime fecha, Long refId, String refTipo, Integer prioridad, Usuario user) {
        CalendarioEvento evento = CalendarioEvento.builder()
                .titulo(titulo)
                .descripcion(desc)
                .tipoEvento(tipo)
                .fechaEvento(fecha)
                .referenciaId(refId)
                .referenciaTipo(refTipo)
                .prioridad(prioridad)
                .usuario(user)
                .area(user != null ? user.getArea() : null)
                .build();
        repository.save(evento);

        // Notificaciones globales automáticas para eventos creados manualmente
        if (tipo == TipoEvento.NOTA || tipo == TipoEvento.EVENTO_GENERAL || tipo == TipoEvento.REUNION_EVALUACION || tipo == TipoEvento.MANTENIMIENTO_SISTEMA) {
            String icono = getIconForTipo(tipo);
            String color = "#64748b"; // Default
            if (tipo == TipoEvento.NOTA) color = "#8b5cf6";
            if (tipo == TipoEvento.MANTENIMIENTO_SISTEMA) color = "#ef4444";
            if (tipo == TipoEvento.REUNION_EVALUACION) color = "#6366f1";
            
            notificacionService.crearGlobal(titulo, desc, tipo.name(), icono, color, null);
        }
    }

    public void deleteById(Long id) {
        repository.deleteById(id);
    }
}
