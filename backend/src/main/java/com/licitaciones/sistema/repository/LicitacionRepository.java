package com.licitaciones.sistema.repository;

import com.licitaciones.sistema.entity.Licitacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface LicitacionRepository extends JpaRepository<Licitacion, Long>, JpaSpecificationExecutor<Licitacion> {
    
    long countByEstado(com.licitaciones.sistema.entity.EstadoLicitacion estado);
    
    long countByEstadoIn(java.util.Collection<com.licitaciones.sistema.entity.EstadoLicitacion> estados);
    
    @org.springframework.data.jpa.repository.Query("SELECT l FROM Licitacion l WHERE l.estado != 'BORRADOR' AND l.estado != 'CANCELADA' ORDER BY l.createdAt DESC")
    java.util.List<Licitacion> findTop10ByRecent();

    @org.springframework.data.jpa.repository.Query("SELECT l FROM Licitacion l WHERE l.estado = 'PUBLICADA' AND l.fechaCierre <= :deadline")
    java.util.List<Licitacion> findClosingSoon(@org.springframework.data.repository.query.Param("deadline") java.time.LocalDateTime deadline);
}
