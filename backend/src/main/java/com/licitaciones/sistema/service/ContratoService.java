package com.licitaciones.sistema.service;

import com.licitaciones.sistema.entity.Contrato;
import com.licitaciones.sistema.entity.EstadoLicitacion;
import com.licitaciones.sistema.entity.Licitacion;
import com.licitaciones.sistema.entity.LicitacionHito;
import com.licitaciones.sistema.entity.Usuario;
import com.licitaciones.sistema.repository.ContratoRepository;
import com.licitaciones.sistema.repository.LicitacionRepository;
import com.licitaciones.sistema.repository.LicitacionHitoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class ContratoService {

    @Autowired
    private ContratoRepository contratoRepository;

    @Autowired
    private LicitacionRepository licitacionRepository;

    @Autowired
    private LicitacionHitoRepository hitoRepository;

    @Autowired
    private NotificacionService notificacionService;

    @Autowired
    private com.licitaciones.sistema.repository.UsuarioRepository usuarioRepository;

    public List<Contrato> findAll() {
        return contratoRepository.findAll();
    }

    public Optional<Contrato> findById(Long id) {
        return contratoRepository.findById(id);
    }

    public Optional<Contrato> findByLicitacionId(Long licitacionId) {
        return contratoRepository.findByLicitacionId(licitacionId);
    }

    @Transactional
    public Contrato crearContrato(Long licitacionId, Contrato contrato, Usuario usuario) {
        Licitacion licitacion = licitacionRepository.findById(licitacionId)
                .orElseThrow(() -> new RuntimeException("Licitación no encontrada"));

        if (licitacion.getEstado() != EstadoLicitacion.ADJUDICADA) {
            throw new RuntimeException("Solo se pueden crear contratos para licitaciones adjudicadas.");
        }

        if (licitacion.getPropuestaGanadora() == null) {
            throw new RuntimeException("La licitación no tiene una propuesta ganadora asignada.");
        }

        contrato.setLicitacion(licitacion);
        contrato.setPropuesta(licitacion.getPropuestaGanadora());
        contrato.setCodigo("CONT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        contrato.setEstado(Contrato.EstadoContrato.PENDIENTE);
        
        if (contrato.getMonto() == null) {
            contrato.setMonto(licitacion.getPropuestaGanadora().getMontoOfertado());
        }

        Contrato saved = contratoRepository.save(contrato);

        // Actualizar estado de la licitación
        licitacion.setEstado(EstadoLicitacion.CONTRATADA);
        licitacionRepository.save(licitacion);

        registrarHito(licitacion, "Contrato Generado", 
                "Se ha generado el contrato " + saved.getCodigo() + " para el ganador.", "fa-file-contract", usuario);

        // Notificación directa al proveedor ganador
        notificacionService.crear(licitacion.getPropuestaGanadora().getUsuario(), 
                "¡Felicidades! Has ganado la licitación", 
                "Tu propuesta para '" + licitacion.getTitulo() + "' ha sido seleccionada. Revisa y firma tu contrato digital.", 
                "CONTRATO", "fa-trophy", "#f59e0b", "/contratos/" + saved.getId());

        // Notificación global para anunciar la adjudicación
        notificacionService.crearGlobal("Licitación Adjudicada", 
                "Se ha seleccionado un ganador para: " + licitacion.getTitulo(), 
                "LICITACION", "fa-bullhorn", "#10b981", "/contratos/" + saved.getId());

        return saved;
    }

    @Transactional
    public Contrato firmarProveedor(Long id, Usuario usuario) {
        Contrato contrato = contratoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Contrato no encontrado"));

        if (!contrato.getPropuesta().getUsuario().getId().equals(usuario.getId())) {
            throw new RuntimeException("Solo el proveedor adjudicado puede firmar este contrato.");
        }

        contrato.setFirmadoProveedor(true);
        contrato.setFechaFirmaProveedor(LocalDateTime.now());
        
        checkFinalizarFirma(contrato, usuario);
        Contrato saved = contratoRepository.save(contrato);

        // Notificar al Área Solicitante creadora del proceso, a Gestores y a Admins
        String providerName = usuario.getNombreCompleto();
        String message = "El proveedor " + providerName + " firmó el contrato " + saved.getCodigo() + ".";

        if (saved.getLicitacion() != null && saved.getLicitacion().getCreadoPor() != null) {
            notificacionService.crear(saved.getLicitacion().getCreadoPor(), 
                    "Aceptación Contractual Firmada", 
                    message + " Proceda con la validación de conformidad operativa.", 
                    "CONTRATO", "fa-file-signature", "#3b82f6", "/contratos/" + saved.getId());
        }

        notifyGestores("Aceptación Contractual Firmada", message, saved.getId());
        notifyAdmins("Aceptación Contractual Firmada", message, saved.getId());

        return saved;
    }

    @Transactional
    public Contrato firmarAutoridad(Long id, Usuario usuario) {
        Contrato contrato = contratoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Contrato no encontrado"));

        if (!Boolean.TRUE.equals(contrato.getFirmadoProveedor())) {
            throw new RuntimeException("No se puede firmar por la autoridad hasta que el proveedor haya firmado.");
        }
        if (!Boolean.TRUE.equals(contrato.getValidadoArea())) {
            throw new RuntimeException("No se puede firmar por la autoridad hasta que el Área Solicitante haya validado la conformidad técnica.");
        }

        contrato.setFirmadoAutoridad(true);
        contrato.setFechaFirmaAutoridad(LocalDateTime.now());
        
        checkFinalizarFirma(contrato, usuario);
        Contrato saved = contratoRepository.save(contrato);

        // Notificaciones al completarse la firma de Autoridad: proveedor, área solicitante, gestores
        if (saved.getPropuesta() != null && saved.getPropuesta().getUsuario() != null) {
            notificacionService.crear(saved.getPropuesta().getUsuario(), 
                    "Contrato Totalmente Firmado", 
                    "El contrato " + saved.getCodigo() + " ha sido firmado por la Autoridad institucional. El proceso se encuentra activo y en ejecución.", 
                    "CONTRATO", "fa-check-double", "#10b981", "/contratos/" + saved.getId());
        }
        if (saved.getLicitacion() != null && saved.getLicitacion().getCreadoPor() != null) {
            notificacionService.crear(saved.getLicitacion().getCreadoPor(), 
                    "Contrato Totalmente Firmado", 
                    "El contrato " + saved.getCodigo() + " para '" + saved.getLicitacion().getTitulo() + "' ha sido formalizado y se encuentra activo.", 
                    "CONTRATO", "fa-check-double", "#10b981", "/contratos/" + saved.getId());
        }
        notifyGestores("Contrato Totalmente Firmado", 
                "El contrato " + saved.getCodigo() + " ha finalizado su flujo de formalización y firmas con éxito.", 
                saved.getId());

        return saved;
    }

    @Transactional
    public Contrato validarArea(Long id, Usuario usuario) {
        Contrato contrato = contratoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Contrato no encontrado"));

        if (contrato.getLicitacion() == null || contrato.getLicitacion().getCreadoPor() == null ||
            !contrato.getLicitacion().getCreadoPor().getId().equals(usuario.getId())) {
            throw new RuntimeException("Solo el área solicitante creadora del proceso puede validar este contrato.");
        }

        if (!Boolean.TRUE.equals(contrato.getFirmadoProveedor())) {
            throw new RuntimeException("No se puede validar la conformidad técnica hasta que el proveedor haya firmado el contrato.");
        }

        contrato.setValidadoArea(true);
        contrato.setFechaValidacionArea(LocalDateTime.now());
        
        checkFinalizarFirma(contrato, usuario);
        Contrato saved = contratoRepository.save(contrato);

        // Notificar a Autoridad/Admin
        notifyAdminsAndAutoridades("Aprobación Contractual Pendiente", 
                "El contrato " + saved.getCodigo() + " está listo para aprobación de autoridad.", 
                saved.getId());

        return saved;
    }

    private void notifyAdminsAndAutoridades(String titulo, String mensaje, Long contratoId) {
        java.util.List<Usuario> dests = usuarioRepository.findByRoleNameIn(java.util.List.of(
                com.licitaciones.sistema.entity.RoleName.ROLE_ADMINISTRADOR,
                com.licitaciones.sistema.entity.RoleName.ROLE_SUPER_ADMIN,
                com.licitaciones.sistema.entity.RoleName.ROLE_AUTORIDAD
        ));
        for (Usuario dest : dests) {
            notificacionService.crear(dest, titulo, mensaje, "CONTRATO", "fa-user-check", "#f59e0b", "/contratos/" + contratoId);
        }
    }

    private void notifyGestores(String titulo, String mensaje, Long contratoId) {
        java.util.List<Usuario> dests = usuarioRepository.findByRoleName(com.licitaciones.sistema.entity.RoleName.ROLE_GESTOR_LICITACIONES);
        for (Usuario dest : dests) {
            notificacionService.crear(dest, titulo, mensaje, "CONTRATO", "fa-file-signature", "#10b981", "/contratos/" + contratoId);
        }
    }

    private void notifyAdmins(String titulo, String mensaje, Long contratoId) {
        java.util.List<Usuario> dests = usuarioRepository.findByRoleNameIn(java.util.List.of(
                com.licitaciones.sistema.entity.RoleName.ROLE_ADMINISTRADOR,
                com.licitaciones.sistema.entity.RoleName.ROLE_SUPER_ADMIN
        ));
        for (Usuario dest : dests) {
            notificacionService.crear(dest, titulo, mensaje, "CONTRATO", "fa-user-check", "#f59e0b", "/contratos/" + contratoId);
        }
    }

    private void checkFinalizarFirma(Contrato contrato, Usuario usuario) {
        if (Boolean.TRUE.equals(contrato.getFirmadoProveedor()) && 
            Boolean.TRUE.equals(contrato.getValidadoArea()) && 
            Boolean.TRUE.equals(contrato.getFirmadoAutoridad())) {
            contrato.setEstado(Contrato.EstadoContrato.FIRMADO);
            contrato.setFechaFirma(LocalDateTime.now());
            
            registrarHito(contrato.getLicitacion(), "Contrato Formalizado", 
                    "El contrato " + contrato.getCodigo() + " ha sido firmado por todas las partes intervinientes y validado por el Área Solicitante.", "fa-signature", usuario);
        } else {
            java.util.List<String> firmantes = new java.util.ArrayList<>();
            if (Boolean.TRUE.equals(contrato.getFirmadoProveedor())) firmantes.add("Proveedor");
            if (Boolean.TRUE.equals(contrato.getValidadoArea())) firmantes.add("Área Solicitante");
            if (Boolean.TRUE.equals(contrato.getFirmadoAutoridad())) firmantes.add("Autoridad");
            
            registrarHito(contrato.getLicitacion(), "Firma Parcial", 
                    "Progreso del contrato: firmado por: " + String.join(", ", firmantes), "fa-file-signature", usuario);
        }
    }

    @Transactional
    public Contrato update(Long id, Contrato details) {
        Contrato c = contratoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Contrato no encontrado"));
        
        if (details.getObservaciones() != null) c.setObservaciones(details.getObservaciones());
        if (details.getMonto() != null) c.setMonto(details.getMonto());
        if (details.getFechaInicio() != null) c.setFechaInicio(details.getFechaInicio());
        if (details.getFechaFin() != null) c.setFechaFin(details.getFechaFin());
        if (details.getEstado() != null) c.setEstado(details.getEstado());
        
        return contratoRepository.save(c);
    }

    @Transactional
    public void deleteById(Long id) {
        contratoRepository.deleteById(id);
    }

    private void registrarHito(Licitacion l, String titulo, String desc, String icono, Usuario u) {
        hitoRepository.save(LicitacionHito.builder()
                .licitacion(l)
                .titulo(titulo)
                .descripcion(desc)
                .fecha(LocalDateTime.now())
                .icono(icono)
                .realizadoPor(u)
                .build());
    }
}
