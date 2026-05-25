package com.licitaciones.sistema.repository;

import com.licitaciones.sistema.entity.EvaluacionHistorial;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface EvaluacionHistorialRepository extends JpaRepository<EvaluacionHistorial, Long> {
    List<EvaluacionHistorial> findByEvaluacionIdOrderByVersionDesc(Long evaluacionId);
}
