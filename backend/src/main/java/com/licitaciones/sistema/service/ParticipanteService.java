package com.licitaciones.sistema.service;

import com.licitaciones.sistema.entity.*;
import com.licitaciones.sistema.repository.LicitacionRepository;
import com.licitaciones.sistema.repository.ParticipanteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class ParticipanteService {

    @Autowired
    private ParticipanteRepository participanteRepository;

    @Autowired
    private LicitacionRepository licitacionRepository;

    @Autowired
    private LicitacionService licitacionService;

    @Autowired
    private NotificacionService notificacionService;

    public List<Participante> findByLicitacion(Long licitacionId) {
        return participanteRepository.findByLicitacionId(licitacionId);
    }

    public java.util.Optional<Participante> findById(Long id) {
        return participanteRepository.findById(id);
    }

    public java.util.Optional<Participante> findByLicitacionAndUsuario(Long licitacionId, Long usuarioId) {
        return participanteRepository.findByLicitacionIdAndUsuarioId(licitacionId, usuarioId);
    }

    @Transactional
    public Participante inscribir(Long licitacionId, Usuario usuario) {
        Licitacion l = licitacionRepository.findById(licitacionId)
                .orElseThrow(() -> new RuntimeException("Licitación no encontrada"));

        if (l.getEstado() != EstadoLicitacion.PUBLICADA) {
            throw new RuntimeException("Solo puede inscribirse en licitaciones en estado PUBLICADA.");
        }

        if (participanteRepository.findByLicitacionIdAndUsuarioId(licitacionId, usuario.getId()).isPresent()) {
            throw new RuntimeException("Ya se encuentra inscrito en esta licitación.");
        }

        boolean isAdmin = usuario.getRoles().stream()
                .anyMatch(r -> r.getName() == RoleName.ROLE_ADMINISTRADOR || r.getName() == RoleName.ROLE_ADMIN);

        Participante p = Participante.builder()
                .licitacion(l)
                .usuario(usuario)
                .estado(isAdmin ? EstadoParticipante.VALIDADO : EstadoParticipante.INSCRITO)
                .fechaInscripcion(LocalDateTime.now())
                .build();

        Participante saved = participanteRepository.save(p);
        
        licitacionService.registrarHito(l, "Nueva Inscripción", 
                "El proveedor " + usuario.getUsername() + " se ha inscrito.", "fa-user-plus", usuario);

        return saved;
    }

    @Transactional
    public Participante validar(Long id, boolean validado, String observaciones, Usuario admin) {
        Participante p = participanteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Participante no encontrado"));

        p.setEstado(validado ? EstadoParticipante.VALIDADO : EstadoParticipante.RECHAZADO);
        p.setObservaciones(observaciones);
        
        Participante saved = participanteRepository.save(p);

        String msg = validado ? "Su inscripción ha sido VALIDADA para la licitación: " + p.getLicitacion().getTitulo() 
                             : "Su inscripción ha sido RECHAZADA. Motivo: " + observaciones;
        
        notificacionService.crear(p.getUsuario(), "Resultado de Inscripción", msg, 
                "PARTICIPANTE", validado ? "fa-check-circle" : "fa-times-circle", 
                validado ? "#1cc88a" : "#e74a3b", "/licitaciones/" + p.getLicitacion().getId());

        licitacionService.registrarHito(p.getLicitacion(), "Validación de Participante", 
                "Participante " + p.getUsuario().getUsername() + " marcado como " + p.getEstado(), 
                validado ? "fa-check" : "fa-user-slash", admin);

        return saved;
    }

    public boolean esParticipanteValidado(Long licitacionId, Long usuarioId) {
        return participanteRepository.findByLicitacionIdAndUsuarioId(licitacionId, usuarioId)
                .map(p -> p.getEstado() == EstadoParticipante.VALIDADO)
                .orElse(false);
    }
}
