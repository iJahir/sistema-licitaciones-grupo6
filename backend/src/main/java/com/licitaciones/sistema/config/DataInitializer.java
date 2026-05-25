package com.licitaciones.sistema.config;

import com.licitaciones.sistema.entity.*;
import com.licitaciones.sistema.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.List;
import java.util.Optional;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    RolRepository roleRepository;

    @Autowired
    UsuarioRepository userRepository;

    @Autowired
    AreaRepository areaRepository;

    @Autowired
    LicitacionRepository licitacionRepository;

    @Autowired
    CalendarioEventoRepository calendarioRepository;

    @Autowired
    NoticiaRepository noticiaRepository;

    @Autowired
    PasswordEncoder encoder;

    @Autowired
    PropuestaRepository propuestaRepository;

    @Autowired
    ContratoRepository contratoRepository;

    @Autowired
    ParticipanteRepository participanteRepository;

    @Autowired
    EvaluacionRepository evaluacionRepository;

    @Autowired
    LicitacionHitoRepository hitoRepository;

    @Autowired
    LicitacionHistorialRepository historialRepository;

    @Autowired
    DocumentoLicitacionRepository documentoLicitacionRepository;

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

    private void cleanupDuplicates() {
        System.out.println("--- INICIANDO LIMPIEZA DE LICITACIONES DUPLICADAS ---");
        List<Licitacion> all = licitacionRepository.findAll();
        List<List<Licitacion>> clusters = new java.util.ArrayList<>();
        
        for (Licitacion l : all) {
            if (l.getTitulo() == null) continue;
            boolean placed = false;
            for (List<Licitacion> cluster : clusters) {
                Licitacion representative = cluster.get(0);
                double p1 = l.getPresupuesto() != null ? l.getPresupuesto() : 0.0;
                double p2 = representative.getPresupuesto() != null ? representative.getPresupuesto() : 0.0;
                if (Math.abs(p1 - p2) < 0.01 && isSimilarTitle(l.getTitulo(), representative.getTitulo())) {
                    cluster.add(l);
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                List<Licitacion> newCluster = new java.util.ArrayList<>();
                newCluster.add(l);
                clusters.add(newCluster);
            }
        }
        
        for (List<Licitacion> group : clusters) {
            if (group.size() > 1) {
                // Ordenar por ID ascendente para mantener la más antigua como primaria
                group.sort(java.util.Comparator.comparing(Licitacion::getId));
                Licitacion primary = group.get(0);
                System.out.println("Licitación primaria detectada: ID " + primary.getId() + " - " + primary.getTitulo());
                
                for (int i = 1; i < group.size(); i++) {
                    Licitacion duplicate = group.get(i);
                    System.out.println("Eliminando/fusionando duplicado: ID " + duplicate.getId() + " - " + duplicate.getTitulo());
                    
                    // 1. Reasignar propuestas
                    List<Propuesta> props = propuestaRepository.findByLicitacionId(duplicate.getId());
                    for (Propuesta p : props) {
                        p.setLicitacion(primary);
                        propuestaRepository.save(p);
                        System.out.println("  Reasignada propuesta ID " + p.getId() + " a primaria ID " + primary.getId());
                    }
                    
                    // 2. Reasignar participantes
                    List<Participante> parts = participanteRepository.findByLicitacionId(duplicate.getId());
                    for (Participante p : parts) {
                        p.setLicitacion(primary);
                        participanteRepository.save(p);
                        System.out.println("  Reasignado participante ID " + p.getId() + " a primaria ID " + primary.getId());
                    }
                    
                    // 3. Reasignar contratos
                    Optional<Contrato> contratoOpt = contratoRepository.findByLicitacionId(duplicate.getId());
                    if (contratoOpt.isPresent()) {
                        Contrato c = contratoOpt.get();
                        c.setLicitacion(primary);
                        contratoRepository.save(c);
                        System.out.println("  Reasignado contrato ID " + c.getId() + " a primaria ID " + primary.getId());
                    }

                    // 4. Reasignar evaluaciones
                    evaluacionRepository.findByLicitacionId(duplicate.getId()).ifPresent(ev -> {
                        ev.setLicitacion(primary);
                        evaluacionRepository.save(ev);
                        System.out.println("  Reasignada evaluación ID " + ev.getId() + " a primaria ID " + primary.getId());
                    });
                    
                    List<Evaluacion> evalsByProp = evaluacionRepository.findByPropuestaLicitacionId(duplicate.getId());
                    for (Evaluacion ev : evalsByProp) {
                        ev.setLicitacion(primary);
                        evaluacionRepository.save(ev);
                        System.out.println("  Reasignada evaluación de propuesta ID " + ev.getId() + " a primaria ID " + primary.getId());
                    }
                    
                    // 5. Si la duplicada tenía propuesta ganadora y la primaria no, reasignar
                    if (primary.getPropuestaGanadora() == null && duplicate.getPropuestaGanadora() != null) {
                        primary.setPropuestaGanadora(duplicate.getPropuestaGanadora());
                        licitacionRepository.save(primary);
                    }
                    
                    // 6. Eliminar explícitamente hitos, historiales y documentos asociados a la duplicada
                    hitoRepository.findByLicitacionId(duplicate.getId()).forEach(h -> hitoRepository.delete(h));
                    historialRepository.findByLicitacionId(duplicate.getId()).forEach(h -> historialRepository.delete(h));
                    documentoLicitacionRepository.findByLicitacionId(duplicate.getId()).forEach(d -> documentoLicitacionRepository.delete(d));
                    
                    // 7. Eliminar la licitación duplicada
                    try {
                        licitacionRepository.delete(duplicate);
                        System.out.println("  Licitación duplicada ID " + duplicate.getId() + " eliminada.");
                    } catch (Exception e) {
                        System.err.println("  Error al eliminar licitación duplicada ID " + duplicate.getId() + ": " + e.getMessage());
                    }
                }
            }
        }
        System.out.println("--- FIN LIMPIEZA DE LICITACIONES DUPLICADAS ---");
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        // Ejecutar limpieza de licitaciones duplicadas e inconsistentes primero
        cleanupDuplicates();

        // 0. Inicializar Áreas si no existen
        String[] areas = {"TI", "Finanzas", "Operaciones", "Recursos Humanos", "Logística", "Jurídico", "Comercial"};
        for (String areaNombre : areas) {
            if (areaRepository.findByNombre(areaNombre).isEmpty()) {
                areaRepository.save(Area.builder().nombre(areaNombre).build());
                System.out.println("Área inicializada: " + areaNombre);
            }
        }

        // 1. Inicializar Roles individualmente si no existen
        for (RoleName name : RoleName.values()) {
            if (roleRepository.findByName(name).isEmpty()) {
                try {
                    roleRepository.save(new Rol(null, name));
                    System.out.println("Rol inicializado: " + name);
                } catch (Exception e) {
                    System.err.println("No se pudo inicializar el rol " + name + ". Verifique las restricciones de la tabla 'roles'.");
                }
            }
        }

        // 2. Inicializar Usuario Admin
        Usuario admin = userRepository.findByUsername("admin").orElse(null);
        Rol adminRole = roleRepository.findByName(RoleName.ROLE_ADMINISTRADOR)
                .orElseThrow(() -> new RuntimeException("Error: Rol ADMINISTRADOR no encontrado."));
        Rol gestorRole = roleRepository.findByName(RoleName.ROLE_GESTOR_LICITACIONES)
                .orElseThrow(() -> new RuntimeException("Error: Rol ROLE_GESTOR_LICITACIONES no encontrado."));

        if (admin == null) {
            Set<Rol> roles = new HashSet<>();
            roles.add(adminRole);
            roles.add(gestorRole);

            admin = Usuario.builder()
                    .username("admin")
                    .email("admin@licitaciones.com")
                    .password(encoder.encode("admin123"))
                    .roles(roles)
                    .enabled(true)
                    .build();

            userRepository.save(admin);
            System.out.println("Usuario básico ADMIN creado exitosamente.");
        } else {
            // Asegurar que el admin existente tenga ROLE_GESTOR_LICITACIONES
            boolean hasGestor = admin.getRoles().stream()
                    .anyMatch(r -> r.getName() == RoleName.ROLE_GESTOR_LICITACIONES);
            if (!hasGestor) {
                admin.getRoles().add(gestorRole);
                userRepository.save(admin);
                System.out.println("Rol ROLE_GESTOR_LICITACIONES asignado al usuario ADMIN existente.");
            }
        }

        // 2.3 Inicializar Usuario Gestor (para pruebas de Gestión Licitaciones)
        if (userRepository.findByUsername("gestor").isEmpty()) {
            Set<Rol> roles = new HashSet<>();
            roles.add(gestorRole);

            Usuario gestor = Usuario.builder()
                    .username("gestor")
                    .email("gestor@licitaciones.com")
                    .password(encoder.encode("admin123"))
                    .roles(roles)
                    .enabled(true)
                    .nombre("Gestor")
                    .apellido("Licitaciones")
                    .build();

            userRepository.save(gestor);
            System.out.println("Usuario GESTOR de licitaciones creado exitosamente.");
        }

        // 2.5 Inicializar Usuario Autoridad
        if (userRepository.findByUsername("autoridad").isEmpty()) {
            roleRepository.findByName(RoleName.ROLE_AUTORIDAD).ifPresent(role -> {
                Set<Rol> roles = new HashSet<>();
                roles.add(role);
                Usuario autoridad = Usuario.builder()
                        .username("autoridad")
                        .email("autoridad@licitaciones.com")
                        .password(encoder.encode("admin123"))
                        .roles(roles)
                        .enabled(true)
                        .nombre("Autoridad")
                        .apellido("Superior")
                        .build();
                userRepository.save(autoridad);
                System.out.println("Usuario AUTORIDAD creado exitosamente.");
            });
        }

        // 2.6 Inicializar Usuario Observador
        if (userRepository.findByUsername("observador").isEmpty()) {
            roleRepository.findByName(RoleName.ROLE_OBSERVADOR).ifPresent(role -> {
                Set<Rol> roles = new HashSet<>();
                roles.add(role);
                Usuario obs = Usuario.builder()
                        .username("observador")
                        .email("observador@licitaciones.com")
                        .password(encoder.encode("admin123"))
                        .roles(roles)
                        .enabled(true)
                        .nombre("Observador")
                        .apellido("Público")
                        .build();
                userRepository.save(obs);
                System.out.println("Usuario OBSERVADOR creado exitosamente.");
            });
        }

        // 3. Inicializar Licitación de ejemplo
        if (licitacionRepository.count() == 0) {
            Area itArea = areaRepository.findByNombre("TI").orElse(null);
            
            Licitacion sample = Licitacion.builder()
                    .titulo("Suministro de Equipo de Computo 2024")
                    .descripcion("Adquisición de 50 laptops de alto rendimiento para el área de desarrollo.")
                    .area(itArea)
                    .tipo("ADQUISICION")
                    .presupuesto(1500000.0)
                    .fechaPublicacion(LocalDateTime.now())
                    .fechaCierre(LocalDateTime.now().plusDays(15))
                    .estado(EstadoLicitacion.PUBLICADA)
                    .build();
            
            licitacionRepository.save(sample);
            System.out.println("Licitación de ejemplo creada.");

            // 4. Inicializar Eventos de Calendario
            if (calendarioRepository.count() == 0) {
                calendarioRepository.save(CalendarioEvento.builder()
                        .titulo("Mantenimiento de Servidores")
                        .descripcion("Mantenimiento programado para el fin de semana.")
                        .tipoEvento(TipoEvento.EVENTO_GENERAL)
                        .fechaEvento(LocalDateTime.now().plusDays(2))
                        .prioridad(3)
                        .build());
                
                calendarioRepository.save(CalendarioEvento.builder()
                        .titulo("Cierre de Auditoría Q1")
                        .descripcion("Revisión final de documentos de auditoría.")
                        .tipoEvento(TipoEvento.NOTA)
                        .fechaEvento(LocalDateTime.now().plusDays(5))
                        .prioridad(2)
                        .build());
                System.out.println("Eventos de calendario inicializados.");
            }

            // 5. Inicializar Noticias
            if (noticiaRepository.count() == 0) {
                noticiaRepository.save(Noticia.builder()
                        .titulo("Nuevo Módulo de Calendario")
                        .contenido("Ya está disponible el nuevo módulo de calendario para gestionar sus actividades.")
                        .tipo(TipoNoticia.SISTEMA)
                        .fecha(LocalDateTime.now())
                        .build());
                
                noticiaRepository.save(Noticia.builder()
                        .titulo("Actualización de Políticas")
                        .contenido("Se han actualizado las políticas de licitación para el año 2024. Por favor revisar los documentos adjuntos.")
                        .tipo(TipoNoticia.PROCESO)
                        .fecha(LocalDateTime.now().minusDays(1))
                        .build());
                System.out.println("Noticias inicializadas.");
            }
        }
    }
}
