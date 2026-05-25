package com.licitaciones.sistema.repository;

import com.licitaciones.sistema.entity.LicitacionHistorial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface LicitacionHistorialRepository extends JpaRepository<LicitacionHistorial, Long> {
    List<LicitacionHistorial> findByLicitacionId(Long licitacionId);
}
