package com.licitaciones.sistema.controller;

import com.licitaciones.sistema.entity.Historial;
import com.licitaciones.sistema.service.HistorialService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/historial")
@CrossOrigin(origins = "*", maxAge = 3600)
public class HistorialController {

    @Autowired
    private HistorialService historialService;

    @GetMapping
    public ResponseEntity<List<Historial>> getHistorial() {
        return ResponseEntity.ok(historialService.obtenerHistorial());
    }
}
