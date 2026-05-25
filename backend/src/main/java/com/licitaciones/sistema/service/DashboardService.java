package com.licitaciones.sistema.service;

import com.licitaciones.sistema.dto.DashboardSummaryDTO;
import com.licitaciones.sistema.entity.EstadoLicitacion;
import com.licitaciones.sistema.entity.RoleName;
import com.licitaciones.sistema.entity.Usuario;
import com.licitaciones.sistema.repository.LicitacionRepository;
import com.licitaciones.sistema.repository.PropuestaRepository;
import com.licitaciones.sistema.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    @Autowired
    private LicitacionRepository licitacionRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PropuestaRepository propuestaRepository;

    @Autowired
    private com.licitaciones.sistema.repository.ContratoRepository contratoRepository;

    @Autowired
    private com.licitaciones.sistema.repository.AuditoriaRepository auditoriaRepository;

    @Autowired
    private com.licitaciones.sistema.service.NotificacionService notificacionService;

    private List<DashboardSummaryDTO.AlertDTO> getRealAlertsForUser(Usuario user) {
        List<com.licitaciones.sistema.entity.Notificacion> notifs = notificacionService.obtenerNotificacionesParaUsuario(user);
        return notifs.stream().map(n -> DashboardSummaryDTO.AlertDTO.builder()
                .type(n.getTipo() != null ? n.getTipo().toLowerCase() : "info")
                .message(n.getTitulo() + ": " + n.getMensaje())
                .referenceId(n.getId())
                .build()).collect(Collectors.toList());
    }

    private List<DashboardSummaryDTO.AlertDTO> getGlobalAlerts() {
        List<com.licitaciones.sistema.entity.Notificacion> notifs = notificacionService.obtenerRecientes();
        return notifs.stream().map(n -> DashboardSummaryDTO.AlertDTO.builder()
                .type(n.getTipo() != null ? n.getTipo().toLowerCase() : "info")
                .message(n.getTitulo() + ": " + n.getMensaje())
                .referenceId(n.getId())
                .build()).collect(Collectors.toList());
    }

    private String formatMonth(LocalDateTime date) {
        if (date == null) return "Ene";
        String m = date.format(java.time.format.DateTimeFormatter.ofPattern("MMM", new java.util.Locale("es", "ES")));
        if (m.endsWith(".")) {
            m = m.substring(0, m.length() - 1);
        }
        if (m.length() > 0) {
            m = m.substring(0, 1).toUpperCase() + m.substring(1).toLowerCase();
        }
        return m;
    }

    private void populateMetrics(DashboardSummaryDTO.DashboardSummaryDTOBuilder builder, List<com.licitaciones.sistema.entity.Licitacion> allLics) {
        List<com.licitaciones.sistema.entity.Propuesta> allProps = propuestaRepository.findAll();

        java.util.Map<String, Long> licitacionesPorEstado = allLics.stream()
                .collect(Collectors.groupingBy(l -> l.getEstado().name(), Collectors.counting()));

        java.util.Map<String, Long> propuestasPorEstado = allProps.stream()
                .collect(Collectors.groupingBy(p -> p.getEstado().name(), Collectors.counting()));

        java.util.Map<String, Long> creadasPorMes = allLics.stream()
                .filter(l -> l.getCreatedAt() != null || l.getFechaCreacion() != null)
                .collect(Collectors.groupingBy(l -> formatMonth(l.getCreatedAt() != null ? l.getCreatedAt() : l.getFechaCreacion()), Collectors.counting()));

        java.util.Map<String, Long> adjudicadasPorMes = allLics.stream()
                .filter(l -> l.getEstado() == EstadoLicitacion.ADJUDICADA || l.getEstado() == EstadoLicitacion.CONTRATADA)
                .collect(Collectors.groupingBy(l -> formatMonth(l.getFechaAdjudicacion() != null ? l.getFechaAdjudicacion() : l.getUpdatedAt() != null ? l.getUpdatedAt() : l.getCreatedAt()), Collectors.counting()));

        java.util.Map<String, Long> cerradasPorMes = allLics.stream()
                .filter(l -> l.getEstado() == EstadoLicitacion.CERRADA)
                .collect(Collectors.groupingBy(l -> formatMonth(l.getFechaCierre() != null ? l.getFechaCierre() : l.getUpdatedAt() != null ? l.getUpdatedAt() : l.getCreatedAt()), Collectors.counting()));

        builder.licitacionesPorEstado(licitacionesPorEstado)
               .propuestasPorEstado(propuestasPorEstado)
               .creadasPorMes(creadasPorMes)
               .adjudicadasPorMes(adjudicadasPorMes)
               .cerradasPorMes(cerradasPorMes);
    }

    public DashboardSummaryDTO getSummary() {
        List<com.licitaciones.sistema.entity.Licitacion> allLics = licitacionRepository.findAll();
        DashboardSummaryDTO.DashboardSummaryDTOBuilder builder = DashboardSummaryDTO.builder()
                .stats(calculateStats())
                .recentLicitaciones(fetchRecentLicitaciones())
                .alerts(getGlobalAlerts());
        populateMetrics(builder, allLics);
        return builder.build();
    }

    public DashboardSummaryDTO getSummary(org.springframework.security.core.Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal().equals("anonymousUser")) {
            return getSummary();
        }
        Usuario user = usuarioRepository.findByUsername(auth.getName()).orElse(null);
        if (user == null) {
            return getSummary();
        }
        
        boolean isGlobalView = user.isAdmin() || user.isAuditor() || user.isObservador() || user.isAutoridad();

        if (isGlobalView) {
            List<com.licitaciones.sistema.entity.Licitacion> allLics = licitacionRepository.findAll();
            DashboardSummaryDTO.DashboardSummaryDTOBuilder builder = DashboardSummaryDTO.builder()
                    .stats(calculateStats())
                    .recentLicitaciones(fetchRecentLicitaciones())
                    .alerts(getRealAlertsForUser(user));
            populateMetrics(builder, allLics);
            return builder.build();
        }

        if (user.isAreaSolicitante()) {
            return getAreaSolicitanteSummary(user);
        }

        if (user.isProveedor()) {
            return getProveedorSummary(user);
        }

        return getSummary();
    }

    private DashboardSummaryDTO getAreaSolicitanteSummary(Usuario user) {
        List<com.licitaciones.sistema.entity.Licitacion> allLics = licitacionRepository.findAll();
        List<com.licitaciones.sistema.entity.Licitacion> myLics = allLics.stream()
                .filter(l -> l.getCreadoPor() != null && l.getCreadoPor().getId().equals(user.getId()))
                .collect(Collectors.toList());

        long total = myLics.size();
        long enProceso = myLics.stream().filter(l -> l.getEstado() == EstadoLicitacion.PUBLICADA).count();
        long evaluadas = myLics.stream().filter(l -> l.getEstado() == EstadoLicitacion.EN_EVALUACION || l.getEstado() == EstadoLicitacion.EVALUADA).count();
        long participantes = myLics.stream().mapToLong(l -> propuestaRepository.findByLicitacionId(l.getId()).size()).sum();
        long totalContratos = myLics.stream().filter(l -> contratoRepository.findByLicitacionId(l.getId()).isPresent()).count();

        double valorEstimadoTotal = 0.0;
        double valorAdjudicadoTotal = 0.0;
        for (com.licitaciones.sistema.entity.Licitacion l : myLics) {
            if (l.getEstado() == EstadoLicitacion.ADJUDICADA || l.getEstado() == EstadoLicitacion.CONTRATADA) {
                double pres = l.getPresupuesto() != null ? l.getPresupuesto() : 0.0;
                double adj = 0.0;
                if (l.getPropuestaGanadora() != null && l.getPropuestaGanadora().getMontoOfertado() != null) {
                    adj = l.getPropuestaGanadora().getMontoOfertado();
                } else {
                    java.util.Optional<com.licitaciones.sistema.entity.Contrato> contratoOpt = contratoRepository.findByLicitacionId(l.getId());
                    if (contratoOpt.isPresent() && contratoOpt.get().getMonto() != null) {
                        adj = contratoOpt.get().getMonto();
                    }
                }
                if (pres <= 0.0) {
                    pres = adj;
                }
                valorEstimadoTotal += pres;
                valorAdjudicadoTotal += adj;
            }
        }
        double ahorroEstimado = valorEstimadoTotal - valorAdjudicadoTotal;
        double porcentajeAhorroPromedio = valorEstimadoTotal > 0.0 ? (ahorroEstimado / valorEstimadoTotal) * 100.0 : 0.0;

        DashboardSummaryDTO.Stats statsObj = DashboardSummaryDTO.Stats.builder()
                .totalLicitaciones(total)
                .enProceso(enProceso)
                .evaluadas(evaluadas)
                .participantes(participantes)
                .totalContratos(totalContratos)
                .totalTrend("↑ Propias")
                .enProcesoTrend("Activas ahora")
                .evaluadasTrend("En evaluación")
                .participantesTrend("Recibidas")
                .valorEstimadoTotal(valorEstimadoTotal)
                .valorAdjudicadoTotal(valorAdjudicadoTotal)
                .ahorroEstimado(ahorroEstimado)
                .porcentajeAhorroPromedio(porcentajeAhorroPromedio)
                .accionesHoy(getRealAccionesHoy())
                .usuariosEnLinea(getRealUsuariosEnLinea())
                .build();

        List<DashboardSummaryDTO.LicitacionRecentDTO> recent = myLics.stream()
                .sorted((a, b) -> (b.getId() != null && a.getId() != null) ? b.getId().compareTo(a.getId()) : 0)
                .limit(10)
                .map(l -> DashboardSummaryDTO.LicitacionRecentDTO.builder()
                        .id(l.getId())
                        .titulo(l.getTitulo())
                        .creadorNombre(user.getNombreCompleto())
                        .area(l.getArea() != null ? l.getArea().getNombre() : l.getTipo())
                        .estado(l.getEstado().name())
                        .fechaCierre(l.getFechaCierre() != null ? l.getFechaCierre().toString() : null)
                        .createdAt(l.getCreatedAt() != null ? l.getCreatedAt().toString() : l.getFechaCreacion() != null ? l.getFechaCreacion().toString() : null)
                        .build())
                .collect(Collectors.toList());

        DashboardSummaryDTO.DashboardSummaryDTOBuilder builder = DashboardSummaryDTO.builder()
                .stats(statsObj)
                .recentLicitaciones(recent)
                .alerts(getRealAlertsForUser(user));
        populateMetrics(builder, allLics);
        return builder.build();
    }

    private DashboardSummaryDTO getProveedorSummary(Usuario user) {
        List<com.licitaciones.sistema.entity.Licitacion> allLics = licitacionRepository.findAll();
        List<com.licitaciones.sistema.entity.Propuesta> myProposals = propuestaRepository.findByUsuario(user);

        long total = allLics.stream().filter(l -> l.getEstado() == EstadoLicitacion.PUBLICADA).count();
        long enProceso = myProposals.size();
        long evaluadas = myProposals.stream().filter(p -> p.getEstado() == com.licitaciones.sistema.entity.EstadoPropuesta.GANADORA || p.getEstado() == com.licitaciones.sistema.entity.EstadoPropuesta.RECHAZADA).count();
        long participantes = myProposals.stream().filter(p -> p.getEstado() == com.licitaciones.sistema.entity.EstadoPropuesta.GANADORA).count();
        long totalContratos = myProposals.stream()
                .filter(p -> p.getLicitacion() != null && contratoRepository.findByLicitacionId(p.getLicitacion().getId()).isPresent())
                .count();

        DashboardSummaryDTO.Stats statsObj = DashboardSummaryDTO.Stats.builder()
                .totalLicitaciones(total)
                .enProceso(enProceso)
                .evaluadas(evaluadas)
                .participantes(participantes)
                .totalContratos(totalContratos)
                .totalTrend("Disponibles")
                .enProcesoTrend("Enviadas")
                .evaluadasTrend("Evaluadas")
                .participantesTrend("Adjudicadas")
                .valorEstimadoTotal(0.0)
                .valorAdjudicadoTotal(0.0)
                .ahorroEstimado(0.0)
                .porcentajeAhorroPromedio(0.0)
                .accionesHoy(getRealAccionesHoy())
                .usuariosEnLinea(getRealUsuariosEnLinea())
                .build();

        List<DashboardSummaryDTO.LicitacionRecentDTO> recent = allLics.stream()
                .filter(l -> l.getEstado() == EstadoLicitacion.PUBLICADA)
                .sorted((a, b) -> (b.getId() != null && a.getId() != null) ? b.getId().compareTo(a.getId()) : 0)
                .limit(10)
                .map(l -> DashboardSummaryDTO.LicitacionRecentDTO.builder()
                        .id(l.getId())
                        .titulo(l.getTitulo())
                        .creadorNombre(l.getCreadoPor() != null ? l.getCreadoPor().getNombreCompleto() : "Admin")
                        .area(l.getArea() != null ? l.getArea().getNombre() : l.getTipo())
                        .estado(l.getEstado().name())
                        .fechaCierre(l.getFechaCierre() != null ? l.getFechaCierre().toString() : null)
                        .createdAt(l.getCreatedAt() != null ? l.getCreatedAt().toString() : l.getFechaCreacion() != null ? l.getFechaCreacion().toString() : null)
                        .build())
                .collect(Collectors.toList());

        DashboardSummaryDTO.DashboardSummaryDTOBuilder builder = DashboardSummaryDTO.builder()
                .stats(statsObj)
                .recentLicitaciones(recent)
                .alerts(getRealAlertsForUser(user));
        populateMetrics(builder, allLics);
        return builder.build();
    }

    private DashboardSummaryDTO.Stats calculateStats() {
        LocalDateTime monthStart = LocalDateTime.now().withDayOfMonth(1).with(LocalTime.MIDNIGHT);
        
        List<com.licitaciones.sistema.entity.Licitacion> allLics = licitacionRepository.findAll();
        double valorEstimadoTotal = 0.0;
        double valorAdjudicadoTotal = 0.0;
        
        for (com.licitaciones.sistema.entity.Licitacion l : allLics) {
            if (l.getEstado() == EstadoLicitacion.ADJUDICADA || l.getEstado() == EstadoLicitacion.CONTRATADA) {
                double pres = l.getPresupuesto() != null ? l.getPresupuesto() : 0.0;
                double adj = 0.0;
                if (l.getPropuestaGanadora() != null && l.getPropuestaGanadora().getMontoOfertado() != null) {
                    adj = l.getPropuestaGanadora().getMontoOfertado();
                } else {
                    java.util.Optional<com.licitaciones.sistema.entity.Contrato> contratoOpt = contratoRepository.findByLicitacionId(l.getId());
                    if (contratoOpt.isPresent() && contratoOpt.get().getMonto() != null) {
                        adj = contratoOpt.get().getMonto();
                    }
                }
                if (pres <= 0.0) {
                    pres = adj;
                }
                valorEstimadoTotal += pres;
                valorAdjudicadoTotal += adj;
            }
        }
        
        double ahorroEstimado = valorEstimadoTotal - valorAdjudicadoTotal;
        double porcentajeAhorroPromedio = valorEstimadoTotal > 0.0 ? (ahorroEstimado / valorEstimadoTotal) * 100.0 : 0.0;

        long total = licitacionRepository.count();
        long enProceso = licitacionRepository.countByEstado(EstadoLicitacion.PUBLICADA);
        long evaluadas = licitacionRepository.countByEstadoIn(Arrays.asList(EstadoLicitacion.EN_EVALUACION, EstadoLicitacion.ADJUDICADA, EstadoLicitacion.EVALUADA));
        long participantes = usuarioRepository.countByRoleName(RoleName.ROLE_PROVEEDOR);
        long totalContratos = contratoRepository.count();

        // System indicators
        long accionesHoy = getRealAccionesHoy();
        long usuariosEnLinea = getRealUsuariosEnLinea();

        return DashboardSummaryDTO.Stats.builder()
                .totalLicitaciones(total)
                .enProceso(enProceso)
                .evaluadas(evaluadas)
                .participantes(participantes)
                .totalContratos(totalContratos)
                .totalTrend("↑ Actualizado")
                .enProcesoTrend("Activas ahora")
                .evaluadasTrend("Liderando proceso")
                .participantesTrend("↑ Nuevos registros")
                .valorEstimadoTotal(valorEstimadoTotal)
                .valorAdjudicadoTotal(valorAdjudicadoTotal)
                .ahorroEstimado(ahorroEstimado)
                .porcentajeAhorroPromedio(porcentajeAhorroPromedio)
                .accionesHoy(accionesHoy)
                .usuariosEnLinea(usuariosEnLinea)
                .build();
    }

    private long getRealAccionesHoy() {
        try {
            java.time.LocalDateTime todayStart = java.time.LocalDateTime.now().with(java.time.LocalTime.MIDNIGHT);
            return auditoriaRepository.countByFechaGreaterThanEqual(todayStart);
        } catch (Exception e) {
            return 0L;
        }
    }

    private long getRealUsuariosEnLinea() {
        try {
            java.time.LocalDateTime activeSince = java.time.LocalDateTime.now().minusMinutes(5);
            long count = usuarioRepository.countActiveUsersSince(activeSince);
            return count > 0 ? count : 1L;
        } catch (Exception e) {
            return 1L;
        }
    }

    private List<DashboardSummaryDTO.LicitacionRecentDTO> fetchRecentLicitaciones() {
        return licitacionRepository.findTop10ByRecent().stream()
                .map(l -> DashboardSummaryDTO.LicitacionRecentDTO.builder()
                        .id(l.getId())
                        .titulo(l.getTitulo())
                        .creadorNombre(l.getCreadoPor() != null ? l.getCreadoPor().getNombreCompleto() : "Admin")
                        .area(l.getArea() != null ? l.getArea().getNombre() : l.getTipo())
                        .estado(l.getEstado().name())
                        .fechaCierre(l.getFechaCierre() != null ? l.getFechaCierre().toString() : null)
                        .createdAt(l.getCreatedAt() != null ? l.getCreatedAt().toString() : l.getFechaCreacion() != null ? l.getFechaCreacion().toString() : null)
                        .build())
                .collect(Collectors.toList());
    }

    private List<DashboardSummaryDTO.AlertDTO> generateAlerts() {
        List<DashboardSummaryDTO.AlertDTO> alerts = new ArrayList<>();
        
        // 1. Closing soon (next 24h)
        LocalDateTime deadline = LocalDateTime.now().plusHours(24);
        licitacionRepository.findClosingSoon(deadline).forEach(l -> {
            alerts.add(DashboardSummaryDTO.AlertDTO.builder()
                    .type("urgent")
                    .message("Licitación #" + l.getId() + " cierra en menos de 24 horas.")
                    .referenceId(l.getId())
                    .build());
        });

        // 2. Today's proposals
        LocalDateTime todayStart = LocalDateTime.now().with(LocalTime.MIDNIGHT);
        long todayCount = propuestaRepository.countTodayProposals(todayStart);
        if (todayCount > 0) {
            alerts.add(DashboardSummaryDTO.AlertDTO.builder()
                    .type("info")
                    .message(todayCount + " nuevas propuestas recibidas hoy.")
                    .build());
        }

        return alerts;
    }
}
