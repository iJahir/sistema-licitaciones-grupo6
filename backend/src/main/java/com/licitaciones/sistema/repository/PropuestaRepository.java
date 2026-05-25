package com.licitaciones.sistema.repository;

import com.licitaciones.sistema.entity.Propuesta;
import com.licitaciones.sistema.entity.Licitacion;
import com.licitaciones.sistema.entity.Usuario;
import com.licitaciones.sistema.entity.EstadoPropuesta;
import com.licitaciones.sistema.entity.Area;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PropuestaRepository extends JpaRepository<Propuesta, Long> {
    List<Propuesta> findByLicitacionId(Long licitacionId);
    Optional<Propuesta> findTopByLicitacionAndUsuarioOrderByFechaEnvioDesc(Licitacion licitacion, Usuario usuario);
    List<Propuesta> findByUsuario(Usuario usuario);

    @org.springframework.data.jpa.repository.Query("""
        SELECT p
        FROM Propuesta p
        JOIN FETCH p.licitacion l
        LEFT JOIN FETCH l.area
        JOIN FETCH p.usuario u
        LEFT JOIN FETCH p.participante
        ORDER BY p.fechaEnvio DESC, p.id DESC
    """)
    List<Propuesta> findAllForPayload();
    
    // Módulo de Evaluación
    List<Propuesta> findByEstado(EstadoPropuesta estado);
    List<Propuesta> findByEstadoIn(java.util.Collection<EstadoPropuesta> estados);
    List<Propuesta> findByEstadoAndLicitacionArea(EstadoPropuesta estado, Area area);
    List<Propuesta> findByLicitacionIdOrderByPuntajeTotalDesc(Long licitacionId);

    @org.springframework.data.jpa.repository.Query("SELECT p FROM Propuesta p WHERE p.id IN (SELECT DISTINCT e.propuesta.id FROM Evaluacion e WHERE e.evaluador.id = :evaluadorId AND e.propuesta IS NOT NULL)")
    List<Propuesta> findAsignadasByEvaluadorId(@org.springframework.data.repository.query.Param("evaluadorId") Long evaluadorId);

    @org.springframework.data.jpa.repository.Query("SELECT p FROM Propuesta p WHERE p.id IN (SELECT DISTINCT p2.id FROM Propuesta p2 JOIN p2.licitacion l JOIN l.evaluadores ev WHERE ev.id = :evaluadorId AND p2.estado IN :estados)")
    List<Propuesta> findByLicitacionEvaluadorIdAndEstadoIn(
            @org.springframework.data.repository.query.Param("evaluadorId") Long evaluadorId,
            @org.springframework.data.repository.query.Param("estados") java.util.Collection<EstadoPropuesta> estados);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(p) FROM Propuesta p WHERE p.fechaEnvio >= :since")
    long countTodayProposals(@org.springframework.data.repository.query.Param("since") java.time.LocalDateTime since);
}
