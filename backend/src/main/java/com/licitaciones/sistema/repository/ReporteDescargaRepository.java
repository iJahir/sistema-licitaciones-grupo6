package com.licitaciones.sistema.repository;

import com.licitaciones.sistema.entity.ReporteDescarga;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReporteDescargaRepository extends JpaRepository<ReporteDescarga, Long> {

    @Query("SELECT r FROM ReporteDescarga r ORDER BY r.fecha DESC")
    List<ReporteDescarga> findRecentDescargas();
}
