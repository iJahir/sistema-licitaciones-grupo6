package com.licitaciones.sistema.repository;

import com.licitaciones.sistema.entity.Evaluacion;
import com.licitaciones.sistema.entity.EstadoEvaluacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface EvaluacionRepository extends JpaRepository<Evaluacion, Long> {
    
    // Métodos para Evaluación Técnica de Licitación
    Optional<Evaluacion> findByLicitacionId(Long licitacionId);
    Optional<Evaluacion> findByLicitacionIdAndEvaluadorId(Long licitacionId, Long evaluadorId);
    long countByLicitacionIdAndEvaluadorIdAndResultado(Long licitacionId, Long evaluadorId, EstadoEvaluacion resultado);
    
    // Métodos para Evaluación de Propuestas
    Optional<Evaluacion> findByPropuestaId(Long propuestaId);
    List<Evaluacion> findAllByPropuestaId(Long propuestaId);
    List<Evaluacion> findAllByPropuestaIdAndActiveTrue(Long propuestaId);
    Optional<Evaluacion> findByPropuestaIdAndEvaluadorId(Long propuestaId, Long evaluadorId);
    Optional<Evaluacion> findByPropuestaIdAndEvaluadorIdAndActiveTrue(Long propuestaId, Long evaluadorId);
    List<Evaluacion> findByEvaluadorId(Long evaluadorId);
    List<Evaluacion> findByPropuestaLicitacionId(Long licitacionId);

    @Query("""
        SELECT e
        FROM Evaluacion e
        JOIN FETCH e.evaluador ev
        LEFT JOIN FETCH ev.roles
        WHERE e.propuesta.id = :propuestaId
          AND e.active = true
        ORDER BY e.especialidadEvaluador ASC, e.fecha ASC
    """)
    List<Evaluacion> findAllByPropuestaIdConEvaluador(@Param("propuestaId") Long propuestaId);

    @Query("""
        SELECT e
        FROM Evaluacion e
        JOIN FETCH e.propuesta p
        JOIN FETCH p.licitacion l
        LEFT JOIN FETCH l.area
        JOIN FETCH p.usuario
        JOIN FETCH e.evaluador ev
        LEFT JOIN FETCH ev.roles
        WHERE e.evaluador.id = :evaluadorId
          AND e.active = true
          AND e.propuesta IS NOT NULL
        ORDER BY e.fecha DESC
    """)
    List<Evaluacion> findBandejaByEvaluadorId(@Param("evaluadorId") Long evaluadorId);

    @Query("""
        SELECT e
        FROM Evaluacion e
        JOIN FETCH e.propuesta p
        JOIN FETCH p.licitacion l
        LEFT JOIN FETCH l.area
        JOIN FETCH p.usuario
        JOIN FETCH e.evaluador ev
        LEFT JOIN FETCH ev.roles
        WHERE (e.evaluador.id = :evaluadorId OR (ev.area.id = :areaId AND ev.area IS NOT NULL))
          AND e.active = true
          AND e.propuesta IS NOT NULL
        ORDER BY e.fecha DESC
    """)
    List<Evaluacion> findBandejaByEvaluadorIdOrAreaId(@Param("evaluadorId") Long evaluadorId, @Param("areaId") Long areaId);
    
    long countByPropuestaLicitacionIdAndEvaluadorIdAndResultado(Long licitacionId, Long evaluadorId, EstadoEvaluacion resultado);
    
    default long countEvaluadasPorLicitacionYEvaluador(Long licitacionId, Long evaluadorId) {
        return countByPropuestaLicitacionIdAndEvaluadorIdAndResultado(licitacionId, evaluadorId, EstadoEvaluacion.APROBADO) +
               countByPropuestaLicitacionIdAndEvaluadorIdAndResultado(licitacionId, evaluadorId, EstadoEvaluacion.RECHAZADO);
    }
}
