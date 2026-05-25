package com.licitaciones.sistema.service;

import com.licitaciones.sistema.entity.Historial;
import com.licitaciones.sistema.repository.HistorialRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class HistorialService {

    @Autowired
    private HistorialRepository historialRepository;

    public List<Historial> obtenerHistorial() {
        return historialRepository.findByOrderByFechaDesc();
    }

    public void registrarAccion(Historial historial) {
        historialRepository.save(historial);
    }
}
