package com.licitaciones.sistema.service;

import com.licitaciones.sistema.dto.*;
import com.licitaciones.sistema.entity.*;
import com.licitaciones.sistema.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ReporteService {

    @Autowired
    private LicitacionRepository licitacionRepository;

    @Autowired
    private PropuestaRepository propuestaRepository;

    @Autowired
    private EvaluacionRepository evaluacionRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private AuditoriaRepository auditoriaRepository;

    @Autowired
    private ContratoRepository contratoRepository;

    @Autowired
    private CalendarioEventoRepository calendarioEventoRepository;

    public ReporteLicitacionesDTO getReporteLicitaciones(Long areaId, EstadoLicitacion estado, String fechaInicio, String fechaFin) {
        List<Licitacion> all = licitacionRepository.findAll();

        List<Licitacion> filtradas = all.stream()
                .filter(l -> areaId == null || (l.getArea() != null && l.getArea().getId().equals(areaId)))
                .filter(l -> estado == null || l.getEstado() == estado)
                .collect(Collectors.toList());

        Map<String, Long> porEstado = filtradas.stream()
                .collect(Collectors.groupingBy(l -> l.getEstado().name(), Collectors.counting()));

        Map<String, Long> porArea = filtradas.stream()
                .filter(l -> l.getArea() != null)
                .collect(Collectors.groupingBy(l -> l.getArea().getNombre(), Collectors.counting()));

        BigDecimal presupuestoTotal = filtradas.stream()
                .map(l -> BigDecimal.valueOf(l.getPresupuesto()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<ReporteLicitacionesDTO.LicitacionReportItem> items = filtradas.stream()
                .map(l -> ReporteLicitacionesDTO.LicitacionReportItem.builder()
                        .id(l.getId())
                        .titulo(l.getTitulo())
                        .area(l.getArea() != null ? l.getArea().getNombre() : "N/A")
                        .estado(l.getEstado().name())
                        .presupuesto(BigDecimal.valueOf(l.getPresupuesto()))
                        .fechaInicio(l.getFechaPublicacion() != null ? l.getFechaPublicacion().toString() : "")
                        .fechaFin(l.getFechaCierre() != null ? l.getFechaCierre().toString() : "")
                        .build())
                .collect(Collectors.toList());

        return ReporteLicitacionesDTO.builder()
                .totalLicitaciones(filtradas.size())
                .cantidadPorEstado(porEstado)
                .cantidadPorArea(porArea)
                .presupuestoTotal(presupuestoTotal)
                .items(items)
                .build();
    }

    public ReportePropuestasDTO getReportePropuestas(Long licitacionId, String estado) {
        List<Propuesta> all = propuestaRepository.findAll();

        List<Propuesta> filtradas = all.stream()
                .filter(p -> licitacionId == null || (p.getLicitacion() != null && p.getLicitacion().getId().equals(licitacionId)))
                .filter(p -> estado == null || estado.isEmpty() || p.getEstado().name().equals(estado))
                .collect(Collectors.toList());

        Map<String, Long> porEstado = filtradas.stream()
                .collect(Collectors.groupingBy(p -> p.getEstado().name(), Collectors.counting()));

        double promedioPuntaje = filtradas.stream()
                .filter(p -> p.getPuntajeTotal() != null)
                .mapToInt(p -> p.getPuntajeTotal())
                .average()
                .orElse(0.0);

        BigDecimal montoTotal = filtradas.stream()
                .filter(p -> p.getMontoOfertado() != null)
                .map(p -> BigDecimal.valueOf(p.getMontoOfertado()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<ReportePropuestasDTO.PropuestaReportItem> items = filtradas.stream()
                .map(p -> ReportePropuestasDTO.PropuestaReportItem.builder()
                        .id(p.getId())
                        .licitacionId(p.getLicitacion() != null ? p.getLicitacion().getId() : null)
                        .licitacionTitulo(p.getLicitacion() != null ? p.getLicitacion().getTitulo() : "N/A")
                        .empresa(p.getEmpresaNombre() != null ? p.getEmpresaNombre() : "S/N")
                        .estado(p.getEstado().name())
                        .monto(p.getMontoOfertado())
                        .puntaje(p.getPuntajeTotal())
                        .estrellas(p.getEstrellas())
                        .fechaEnvio(p.getFechaEnvio() != null ? p.getFechaEnvio().toString() : "")
                        .build())
                .sorted((a, b) -> (b.getPuntaje() != null ? b.getPuntaje() : 0) - (a.getPuntaje() != null ? a.getPuntaje() : 0))
                .collect(Collectors.toList());

        return ReportePropuestasDTO.builder()
                .totalPropuestas(filtradas.size())
                .promedioPuntaje(promedioPuntaje)
                .montoTotalOfertado(montoTotal)
                .cantidadPorEstado(porEstado)
                .items(items)
                .build();
    }

    public ReporteEvaluacionesDTO getReporteEvaluaciones(Long evaluadorId) {
        List<Evaluacion> all = evaluacionRepository.findAll();

        List<Evaluacion> filtradas = all.stream()
                .filter(e -> evaluadorId == null || (e.getEvaluador() != null && e.getEvaluador().getId().equals(evaluadorId)))
                .collect(Collectors.toList());

        Map<String, Long> porResultado = filtradas.stream()
                .collect(Collectors.groupingBy(e -> e.getResultado().name(), Collectors.counting()));

        double promedioEstrellas = filtradas.stream()
                .filter(e -> e.getEstrellas() != null)
                .mapToInt(e -> e.getEstrellas())
                .average()
                .orElse(0.0);

        List<ReporteEvaluacionesDTO.EvaluacionReportItem> items = filtradas.stream()
                .map(e -> ReporteEvaluacionesDTO.EvaluacionReportItem.builder()
                        .id(e.getId())
                        .propuesta(e.getPropuesta() != null ? e.getPropuesta().getNombre() : "N/A")
                        .empresa(e.getPropuesta() != null ? e.getPropuesta().getEmpresaNombre() : "S/N")
                        .evaluador(e.getEvaluador() != null ? e.getEvaluador().getNombre() : "S/N")
                        .puntajeTotal(e.getPuntajeTotal())
                        .puntajePonderado(e.getPuntajeTotalPonderado())
                        .estrellas(e.getEstrellas())
                        .resultado(e.getResultado().name())
                        .fecha(e.getFecha() != null ? e.getFecha().toString() : "")
                        .build())
                .collect(Collectors.toList());

        return ReporteEvaluacionesDTO.builder()
                .totalEvaluaciones(filtradas.size())
                .promedioEstrellas(promedioEstrellas)
                .cantidadPorResultado(porResultado)
                .items(items)
                .build();
    }

    public ReporteEvaluadoresDTO getReporteEvaluadores() {
        List<Usuario> evaluadores = usuarioRepository.findAll().stream()
                .filter(u -> u.getRoles().stream().anyMatch(r -> r.getName().name().equals("ROLE_EVALUADOR") || r.getName().name().equals("ROLE_ADMINISTRADOR") || r.getName().name().equals("ROLE_ADMIN")))
                .collect(Collectors.toList());

        List<Evaluacion> todas = evaluacionRepository.findAll();

        List<ReporteEvaluadoresDTO.EvaluadorStatsItem> items = evaluadores.stream()
                .map(u -> {
                    List<Evaluacion> evs = todas.stream()
                            .filter(e -> e.getEvaluador() != null && e.getEvaluador().getId().equals(u.getId()))
                            .collect(Collectors.toList());

                    long aprobadas = evs.stream().filter(e -> e.getResultado() != null && e.getResultado().name().equals("APROBADO")).count();
                    double avgStars = evs.stream().filter(e -> e.getEstrellas() != null).mapToInt(e -> e.getEstrellas()).average().orElse(0.0);
                    double avgScore = evs.stream().filter(e -> e.getPuntajeTotal() != null).mapToInt(e -> e.getPuntajeTotal()).average().orElse(0.0);

                    return ReporteEvaluadoresDTO.EvaluadorStatsItem.builder()
                            .id(u.getId())
                            .nombre(u.getNombre())
                            .username(u.getUsername())
                            .evaluacionesRealizadas(evs.size())
                            .promedioEstrellas(avgStars)
                            .promedioPuntaje(avgScore)
                            .propuestasAprobadas(aprobadas)
                            .build();
                })
                .sorted((a, b) -> Long.compare(b.getEvaluacionesRealizadas(), a.getEvaluacionesRealizadas()))
                .collect(Collectors.toList());

        double avgGral = items.stream().mapToDouble(i -> i.getPromedioEstrellas()).average().orElse(0.0);

        return ReporteEvaluadoresDTO.builder()
                .totalEvaluadores(evaluadores.size())
                .totalEvaluaciones(todas.size())
                .promedioEstrellasGeneral(avgGral)
                .items(items)
                .build();
    }

    public ReporteAuditoriaDTO getReporteAuditoria(String modulo, String username, int page, int size) {
        // Para estadísticas generales seguimos necesitando el conteo total filtrado
        // Pero para el contenido de la tabla usamos paginación real
        
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size, org.springframework.data.domain.Sort.by("fecha").descending());
        
        org.springframework.data.domain.Page<Auditoria> auditPage;
        
        if ((modulo == null || modulo.isEmpty()) && (username == null || username.isEmpty())) {
            auditPage = auditoriaRepository.findAll(pageable);
        } else {
            // Si hay filtros, por ahora usamos el findAll y paginamos el resultado filtrado 
            // para no complicar la configuración de Specifications en este paso, 
            // pero asegurando que el DTO devuelva lo solicitado.
            List<Auditoria> all = auditoriaRepository.findAll();
            List<Auditoria> filtradas = all.stream()
                .filter(a -> modulo == null || modulo.isEmpty() || a.getModulo().equals(modulo))
                .filter(a -> username == null || username.isEmpty() || a.getUsername().equals(username))
                .sorted((a, b) -> b.getFecha().compareTo(a.getFecha()))
                .collect(Collectors.toList());

            int totalElements = filtradas.size();
            int totalPages = (int) Math.ceil((double) totalElements / size);
            int start = Math.min(page * size, totalElements);
            int end = Math.min(start + size, totalElements);
            
            List<ReporteAuditoriaDTO.AuditoriaReportItem> items = filtradas.subList(start, end).stream()
                .map(this::mapToAuditItem)
                .collect(Collectors.toList());

            return ReporteAuditoriaDTO.builder()
                .totalAcciones(totalElements)
                .totalElements(totalElements)
                .totalPages(totalPages)
                .currentPage(page)
                .pageSize(size)
                .accionesPorModulo(countByModulo(filtradas))
                .accionesPorUsuario(countByUsuario(filtradas))
                .contenido(items)
                .build();
        }

        List<ReporteAuditoriaDTO.AuditoriaReportItem> items = auditPage.getContent().stream()
                .map(this::mapToAuditItem)
                .collect(Collectors.toList());

        return ReporteAuditoriaDTO.builder()
                .totalAcciones(auditPage.getTotalElements())
                .totalElements(auditPage.getTotalElements())
                .totalPages(auditPage.getTotalPages())
                .currentPage(page)
                .pageSize(size)
                .accionesPorModulo(countByModulo(auditoriaRepository.findAll())) // Simplificado para las cards
                .accionesPorUsuario(countByUsuario(auditoriaRepository.findAll()))
                .contenido(items)
                .build();
    }

    private ReporteAuditoriaDTO.AuditoriaReportItem mapToAuditItem(Auditoria a) {
        return ReporteAuditoriaDTO.AuditoriaReportItem.builder()
                .id(a.getId())
                .username(a.getUsername())
                .rol(a.getRolUsuario())
                .accion(a.getAccion())
                .modulo(a.getModulo())
                .descripcion(a.getDescripcion())
                .fecha(a.getFecha() != null ? a.getFecha().toString() : "")
                .ip(a.getIp())
                .build();
    }

    private Map<String, Long> countByModulo(List<Auditoria> list) {
        return list.stream().collect(Collectors.groupingBy(a -> a.getModulo(), Collectors.counting()));
    }

    private Map<String, Long> countByUsuario(List<Auditoria> list) {
        return list.stream().collect(Collectors.groupingBy(a -> a.getUsername(), Collectors.counting()));
    }

    public ReporteContratosDTO getReporteContratos(String estado, String fechaInicio, String fechaFin) {
        List<Contrato> all = contratoRepository.findAll();

        List<Contrato> filtradas = all.stream()
                .filter(c -> estado == null || estado.isEmpty() || c.getEstado().name().equalsIgnoreCase(estado))
                .filter(c -> {
                    if (fechaInicio == null || fechaInicio.isEmpty()) return true;
                    try {
                        java.time.LocalDate start = java.time.LocalDate.parse(fechaInicio);
                        return c.getCreatedAt() != null && !c.getCreatedAt().toLocalDate().isBefore(start);
                    } catch (Exception e) {
                        return true;
                    }
                })
                .filter(c -> {
                    if (fechaFin == null || fechaFin.isEmpty()) return true;
                    try {
                        java.time.LocalDate end = java.time.LocalDate.parse(fechaFin);
                        return c.getCreatedAt() != null && !c.getCreatedAt().toLocalDate().isAfter(end);
                    } catch (Exception e) {
                        return true;
                    }
                })
                .collect(Collectors.toList());

        long total = filtradas.size();
        long firmados = filtradas.stream().filter(c -> c.getEstado() == Contrato.EstadoContrato.FIRMADO).count();
        long pendientes = total - firmados;

        BigDecimal montoTotal = filtradas.stream()
                .filter(c -> c.getMonto() != null)
                .map(c -> BigDecimal.valueOf(c.getMonto()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Long> porEstado = filtradas.stream()
                .collect(Collectors.groupingBy(c -> c.getEstado().name(), Collectors.counting()));

        List<ReporteContratosDTO.ContratoReportItem> items = filtradas.stream()
                .map(c -> ReporteContratosDTO.ContratoReportItem.builder()
                        .id(c.getId())
                        .codigo(c.getCodigo())
                        .licitacionTitulo(c.getLicitacion() != null ? c.getLicitacion().getTitulo() : "N/A")
                        .proveedorNombre(c.getPropuesta() != null && c.getPropuesta().getUsuario() != null ? 
                                         c.getPropuesta().getUsuario().getNombreCompleto() : "N/A")
                        .monto(c.getMonto())
                        .fechaFirma(c.getFechaFirma() != null ? c.getFechaFirma().toString() : "Pendiente")
                        .estado(c.getEstado().name())
                        .firmadoProveedor(c.getFirmadoProveedor())
                        .fechaFirmaProveedor(c.getFechaFirmaProveedor() != null ? c.getFechaFirmaProveedor().toString() : null)
                        .validadoArea(c.getValidadoArea())
                        .fechaValidacionArea(c.getFechaValidacionArea() != null ? c.getFechaValidacionArea().toString() : null)
                        .firmadoAutoridad(c.getFirmadoAutoridad())
                        .fechaFirmaAutoridad(c.getFechaFirmaAutoridad() != null ? c.getFechaFirmaAutoridad().toString() : null)
                        .firmanteArea(c.getLicitacion() != null && c.getLicitacion().getCreadoPor() != null ?
                                      c.getLicitacion().getCreadoPor().getNombreCompleto() : "N/A")
                        .build())
                .collect(Collectors.toList());

        return ReporteContratosDTO.builder()
                .totalContratos(total)
                .contratosFirmados(firmados)
                .contratosPendientes(pendientes)
                .montoTotalContratos(montoTotal)
                .cantidadPorEstado(porEstado)
                .items(items)
                .build();
    }

    public ReporteAdjudicacionesDTO getReporteAdjudicaciones(Long areaId, String fechaInicio, String fechaFin) {
        List<Licitacion> adjudicadas = licitacionRepository.findAll().stream()
                .filter(l -> l.getEstado() == EstadoLicitacion.ADJUDICADA || l.getEstado() == EstadoLicitacion.CONTRATADA)
                .filter(l -> l.getPropuestaGanadora() != null)
                .filter(l -> areaId == null || (l.getArea() != null && l.getArea().getId().equals(areaId)))
                .filter(l -> {
                    if (fechaInicio == null || fechaInicio.isEmpty()) return true;
                    try {
                        java.time.LocalDate start = java.time.LocalDate.parse(fechaInicio);
                        return l.getFechaAdjudicacion() != null && !l.getFechaAdjudicacion().toLocalDate().isBefore(start);
                    } catch (Exception e) {
                        return true;
                    }
                })
                .filter(l -> {
                    if (fechaFin == null || fechaFin.isEmpty()) return true;
                    try {
                        java.time.LocalDate end = java.time.LocalDate.parse(fechaFin);
                        return l.getFechaAdjudicacion() != null && !l.getFechaAdjudicacion().toLocalDate().isAfter(end);
                    } catch (Exception e) {
                        return true;
                    }
                })
                .collect(Collectors.toList());

        BigDecimal montoTotal = adjudicadas.stream()
                .map(l -> BigDecimal.valueOf(l.getPropuestaGanadora().getMontoOfertado() != null ? l.getPropuestaGanadora().getMontoOfertado() : 0.0))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        double promedio = adjudicadas.isEmpty() ? 0.0 : montoTotal.doubleValue() / adjudicadas.size();

        List<ReporteAdjudicacionesDTO.AdjudicionReportItem> items = adjudicadas.stream()
                .map(l -> ReporteAdjudicacionesDTO.AdjudicionReportItem.builder()
                        .licitacionId(l.getId())
                        .licitacionTitulo(l.getTitulo())
                        .areaNombre(l.getArea() != null ? l.getArea().getNombre() : "N/A")
                        .proveedorNombre(l.getPropuestaGanadora().getEmpresaNombre() != null ? l.getPropuestaGanadora().getEmpresaNombre() : "S/N")
                        .montoAdjudicado(BigDecimal.valueOf(l.getPropuestaGanadora().getMontoOfertado() != null ? l.getPropuestaGanadora().getMontoOfertado() : 0.0))
                        .fechaAdjudicacion(l.getFechaAdjudicacion() != null ? l.getFechaAdjudicacion().toString() : "")
                        .estado(l.getEstado().name())
                        .build())
                .collect(Collectors.toList());

        Map<String, Long> porMes = adjudicadas.stream()
                .filter(l -> l.getFechaAdjudicacion() != null)
                .collect(Collectors.groupingBy(l -> {
                    java.time.format.DateTimeFormatter dtf = java.time.format.DateTimeFormatter.ofPattern("MMM yyyy", new java.util.Locale("es", "ES"));
                    return l.getFechaAdjudicacion().format(dtf);
                }, Collectors.counting()));

        return ReporteAdjudicacionesDTO.builder()
                .totalAdjudicaciones(adjudicadas.size())
                .montoTotalAdjudicado(montoTotal)
                .promedioMontoAdjudicado(promedio)
                .items(items)
                .adjudicacionesPorMes(porMes)
                .build();
    }

    public ReporteFinancieroDTO getReporteFinanciero() {
        List<Licitacion> allLicitaciones = licitacionRepository.findAll();
        List<Contrato> allContratos = contratoRepository.findAll();

        BigDecimal presupuestoTotal = allLicitaciones.stream()
                .filter(l -> l.getEstado() != EstadoLicitacion.BORRADOR && l.getEstado() != EstadoLicitacion.CANCELADA)
                .map(l -> BigDecimal.valueOf(l.getPresupuesto()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal presupuestoEjecutado = allContratos.stream()
                .filter(c -> c.getEstado() == Contrato.EstadoContrato.FIRMADO || c.getEstado() == Contrato.EstadoContrato.FINALIZADO)
                .filter(c -> c.getMonto() != null)
                .map(c -> BigDecimal.valueOf(c.getMonto()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal montoAdjudicado = allLicitaciones.stream()
                .filter(l -> l.getEstado() == EstadoLicitacion.ADJUDICADA || l.getEstado() == EstadoLicitacion.CONTRATADA)
                .filter(l -> l.getPropuestaGanadora() != null && l.getPropuestaGanadora().getMontoOfertado() != null)
                .map(l -> BigDecimal.valueOf(l.getPropuestaGanadora().getMontoOfertado()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long activos = allContratos.stream().filter(c -> c.getEstado() == Contrato.EstadoContrato.FIRMADO).count();
        long finalizados = allContratos.stream().filter(c -> c.getEstado() == Contrato.EstadoContrato.FINALIZADO).count();

        Map<String, BigDecimal> ejecucionPorArea = allContratos.stream()
                .filter(c -> c.getEstado() == Contrato.EstadoContrato.FIRMADO || c.getEstado() == Contrato.EstadoContrato.FINALIZADO)
                .filter(c -> c.getLicitacion() != null && c.getLicitacion().getArea() != null && c.getMonto() != null)
                .collect(Collectors.groupingBy(
                        c -> c.getLicitacion().getArea().getNombre(),
                        Collectors.reducing(BigDecimal.ZERO, c -> BigDecimal.valueOf(c.getMonto()), BigDecimal::add)
                ));

        List<ReporteFinancieroDTO.TopContratoItem> topContratos = allContratos.stream()
                .filter(c -> c.getMonto() != null)
                .sorted((a, b) -> Double.compare(b.getMonto(), a.getMonto()))
                .limit(5)
                .map(c -> ReporteFinancieroDTO.TopContratoItem.builder()
                        .codigo(c.getCodigo())
                        .licitacionTitulo(c.getLicitacion() != null ? c.getLicitacion().getTitulo() : "N/A")
                        .proveedorNombre(c.getPropuesta() != null && c.getPropuesta().getUsuario() != null ? 
                                         c.getPropuesta().getUsuario().getNombreCompleto() : "N/A")
                        .monto(BigDecimal.valueOf(c.getMonto()))
                        .estado(c.getEstado().name())
                        .build())
                .collect(Collectors.toList());

        Map<String, List<Contrato>> contratosPorProveedor = allContratos.stream()
                .filter(c -> c.getPropuesta() != null && c.getPropuesta().getUsuario() != null)
                .collect(Collectors.groupingBy(c -> c.getPropuesta().getUsuario().getNombreCompleto()));

        List<ReporteFinancieroDTO.TopProveedorItem> topProveedores = contratosPorProveedor.entrySet().stream()
                .map(entry -> {
                    long count = entry.getValue().size();
                    BigDecimal total = entry.getValue().stream()
                            .filter(c -> c.getMonto() != null)
                            .map(c -> BigDecimal.valueOf(c.getMonto()))
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    return ReporteFinancieroDTO.TopProveedorItem.builder()
                            .proveedorNombre(entry.getKey())
                            .contratosAdjudicados(count)
                            .montoTotal(total)
                            .build();
                })
                .sorted((a, b) -> b.getMontoTotal().compareTo(a.getMontoTotal()))
                .limit(5)
                .collect(Collectors.toList());

        Map<String, BigDecimal> gastoMensual = allContratos.stream()
                .filter(c -> c.getFechaFirma() != null && c.getMonto() != null)
                .collect(Collectors.groupingBy(
                        c -> {
                            java.time.format.DateTimeFormatter dtf = java.time.format.DateTimeFormatter.ofPattern("MMM yyyy", new java.util.Locale("es", "ES"));
                            return c.getFechaFirma().format(dtf);
                        },
                        Collectors.reducing(BigDecimal.ZERO, c -> BigDecimal.valueOf(c.getMonto()), BigDecimal::add)
                ));

        return ReporteFinancieroDTO.builder()
                .presupuestoTotal(presupuestoTotal)
                .presupuestoEjecutado(presupuestoEjecutado)
                .montoAdjudicado(montoAdjudicado)
                .contratosActivos(activos)
                .contratosFinalizados(finalizados)
                .ejecucionPorArea(ejecucionPorArea)
                .topContratos(topContratos)
                .topProveedores(topProveedores)
                .gastoMensual(gastoMensual)
                .build();
    }

    public ReporteCronogramaDTO getReporteCronograma() {
        List<CalendarioEvento> all = calendarioEventoRepository.findAll();
        
        long totalEventos = all.size();
        long totalLicitaciones = all.stream().filter(e -> "licitacion".equalsIgnoreCase(e.getReferenciaTipo())).count();
        long totalPropuestas = all.stream().filter(e -> "propuesta".equalsIgnoreCase(e.getReferenciaTipo())).count();
        
        java.time.format.DateTimeFormatter dtf = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
        
        List<ReporteCronogramaDTO.CronogramaReportItem> items = all.stream()
                .sorted((a, b) -> b.getFechaEvento().compareTo(a.getFechaEvento()))
                .map(e -> ReporteCronogramaDTO.CronogramaReportItem.builder()
                        .id(e.getId())
                        .titulo(e.getTitulo())
                        .descripcion(e.getDescripcion() != null ? e.getDescripcion() : "")
                        .tipoEvento(e.getTipoEvento() != null ? e.getTipoEvento().name() : "GENERAL")
                        .fechaEvento(e.getFechaEvento() != null ? e.getFechaEvento().format(dtf) : "")
                        .referenciaTipo(e.getReferenciaTipo() != null ? e.getReferenciaTipo() : "N/A")
                        .prioridad(e.getPrioridad() == null ? "Media" : e.getPrioridad() == 1 ? "Alta" : e.getPrioridad() == 3 ? "Baja" : "Media")
                        .area(e.getArea() != null ? e.getArea().getNombre() : "N/A")
                        .usuario(e.getUsuario() != null ? e.getUsuario().getNombreCompleto() : "N/A")
                        .build())
                .collect(Collectors.toList());
                
        return ReporteCronogramaDTO.builder()
                .totalEventos(totalEventos)
                .totalLicitacionesAsociadas(totalLicitaciones)
                .totalPropuestasAsociadas(totalPropuestas)
                .items(items)
                .build();
    }
}
