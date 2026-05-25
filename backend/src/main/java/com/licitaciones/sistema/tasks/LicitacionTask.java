package com.licitaciones.sistema.tasks;

import com.licitaciones.sistema.entity.EstadoLicitacion;
import com.licitaciones.sistema.entity.Licitacion;
import com.licitaciones.sistema.repository.LicitacionRepository;
import com.licitaciones.sistema.service.LicitacionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class LicitacionTask {

    @Autowired
    private LicitacionRepository licitacionRepository;

    @Autowired
    private LicitacionService licitacionService;

    /**
     * Revisa licitaciones PUBLICADAS cuya fecha de cierre ya pasó
     * Se ejecuta cada 15 minutos
     */
    @Scheduled(fixedRate = 60000) // 1 min (más frecuente para UI reactiva)
    public void autoCloseExpiredBiddings() {
        LocalDateTime now = LocalDateTime.now();
        List<Licitacion> biddingsToClose = licitacionRepository.findAll().stream()
                .filter(l -> l.getEstado() == EstadoLicitacion.PUBLICADA && 
                            l.getFechaCierre() != null && 
                            l.getFechaCierre().isBefore(now))
                .toList();

        for (Licitacion l : biddingsToClose) {
            l.setEstado(EstadoLicitacion.CERRADA);
            licitacionRepository.save(l);
            
            licitacionService.registrarHito(l, 
                "Cierre Automático", 
                "La licitación ha cerrado por cumplirse la fecha límite de recepción.", 
                "fa-clock", 
                null);
            
            System.out.println("Licitación cerrada automáticamente: ID " + l.getId());
        }
    }
}
