package com.licitaciones.sistema.config;

import com.licitaciones.sistema.entity.Noticia;
import com.licitaciones.sistema.entity.CalendarioEvento;
import com.licitaciones.sistema.entity.TipoEvento;
import com.licitaciones.sistema.entity.TipoNoticia;
import com.licitaciones.sistema.repository.NoticiaRepository;
import com.licitaciones.sistema.repository.CalendarioEventoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Arrays;

@Component
public class DashboardDataInitializer implements CommandLineRunner {

    @Autowired
    private NoticiaRepository noticiaRepository;

    @Autowired
    private CalendarioEventoRepository calendarioRepository;

    @Override
    public void run(String... args) throws Exception {
        if (noticiaRepository.count() == 0) {
            noticiaRepository.saveAll(Arrays.asList(
                Noticia.builder()
                    .titulo("Nueva Plataforma de Licitaciones")
                    .contenido("Bienvenidos a la versión 2.0 de nuestro sistema dinámico de gestión de adquisiciones.")
                    .tipo(TipoNoticia.PROCESO)
                    .fecha(LocalDateTime.now().minusDays(2))
                    .build(),
                Noticia.builder()
                    .titulo("Mantenimiento Programado")
                    .contenido("El sistema entrará en mantenimiento el próximo domingo por la noche.")
                    .tipo(TipoNoticia.URGENTE)
                    .fecha(LocalDateTime.now().minusHours(5))
                    .build(),
                Noticia.builder()
                    .titulo("Resultados de Licitación #01")
                    .contenido("Se ha publicado el acta de adjudicación para la compra de suministros médicos.")
                    .tipo(TipoNoticia.RESULTADO)
                    .fecha(LocalDateTime.now().minusDays(1))
                    .build()
            ));
        }

        if (calendarioRepository.count() == 0) {
            calendarioRepository.saveAll(Arrays.asList(
                CalendarioEvento.builder()
                    .titulo("Revision de Presupuestos")
                    .descripcion("Reunion con finanzas para revisar licitaciones activas.")
                    .tipoEvento(TipoEvento.EVENTO_GENERAL)
                    .fechaEvento(LocalDateTime.now().plusDays(1).withHour(10).withMinute(0))
                    .prioridad(2)
                    .build(),
                CalendarioEvento.builder()
                    .titulo("Demo del Sistema")
                    .descripcion("Sesion de capacitacion para nuevos proveedores.")
                    .tipoEvento(TipoEvento.EVENTO_GENERAL)
                    .fechaEvento(LocalDateTime.now().plusDays(3).withHour(14).withMinute(30))
                    .prioridad(2)
                    .build()
            ));
        }
    }
}
