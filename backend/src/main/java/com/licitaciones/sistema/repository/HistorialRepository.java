package com.licitaciones.sistema.repository;

import com.licitaciones.sistema.entity.Historial;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface HistorialRepository extends JpaRepository<Historial, Long> {
    List<Historial> findByOrderByFechaDesc();
    Page<Historial> findByOrderByFechaDesc(Pageable pageable);
}
