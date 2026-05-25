package com.licitaciones.sistema.repository;

import com.licitaciones.sistema.entity.DetalleEvaluacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DetalleEvaluacionRepository extends JpaRepository<DetalleEvaluacion, Long> {
    List<DetalleEvaluacion> findByEvaluacionId(Long evaluacionId);
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Modifying
    void deleteByEvaluacionId(Long evaluacionId);
}
