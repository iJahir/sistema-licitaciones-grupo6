package com.licitaciones.sistema;

import com.licitaciones.sistema.entity.Contrato;
import com.licitaciones.sistema.entity.EstadoLicitacion;
import com.licitaciones.sistema.entity.Licitacion;
import com.licitaciones.sistema.entity.Usuario;
import com.licitaciones.sistema.repository.ContratoRepository;
import com.licitaciones.sistema.repository.LicitacionRepository;
import com.licitaciones.sistema.repository.UsuarioRepository;
import com.licitaciones.sistema.service.ContratoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class AdjudicationFixer implements CommandLineRunner {

    @Autowired
    private LicitacionRepository licitacionRepository;

    @Autowired
    private ContratoRepository contratoRepository;

    @Autowired
    private ContratoService contratoService;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Override
    public void run(String... args) throws Exception {
        System.out.println("--- INICIANDO REPARACIÓN DE CONTRATOS FALTANTES ---");
        
        List<Licitacion> adjudicadas = licitacionRepository.findAll();
        Usuario admin = usuarioRepository.findByUsername("admin").orElse(null);
        
        if (admin == null) {
            System.out.println("No se encontró usuario admin para la reparación.");
            return;
        }

        for (Licitacion l : adjudicadas) {
            if (l.getEstado() == EstadoLicitacion.ADJUDICADA) {
                boolean hasContrato = contratoRepository.findByLicitacionId(l.getId()).isPresent();
                if (!hasContrato && l.getPropuestaGanadora() != null) {
                    System.out.println("Generando contrato faltante para licitación: " + l.getTitulo());
                    try {
                        Contrato c = new Contrato();
                        contratoService.crearContrato(l.getId(), c, admin);
                        System.out.println("Contrato generado con éxito.");
                    } catch (Exception e) {
                        System.err.println("Error reparando contrato: " + e.getMessage());
                    }
                }
            }
        }
        
        System.out.println("--- FIN REPARACIÓN DE CONTRATOS ---");
    }
}
