package com.licitaciones.sistema.controller;

import com.licitaciones.sistema.entity.Area;
import com.licitaciones.sistema.repository.AreaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/areas")
public class AreaController {

    @Autowired
    private AreaRepository areaRepository;

    @GetMapping
    public ResponseEntity<List<Area>> getAll() {
        return ResponseEntity.ok(areaRepository.findAll());
    }
}
