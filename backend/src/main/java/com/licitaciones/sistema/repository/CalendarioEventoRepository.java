package com.licitaciones.sistema.repository;

import com.licitaciones.sistema.entity.CalendarioEvento;
import com.licitaciones.sistema.entity.Usuario;
import com.licitaciones.sistema.entity.Area;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface CalendarioEventoRepository extends JpaRepository<CalendarioEvento, Long> {

    List<CalendarioEvento> findByFechaEventoBetween(LocalDateTime start, LocalDateTime end);

    @Query("SELECT e FROM CalendarioEvento e WHERE (e.usuario = :usuario OR e.area = :area OR (e.usuario IS NULL AND e.area IS NULL)) " +
           "AND e.fechaEvento BETWEEN :start AND :end")
    List<CalendarioEvento> findFilteredEvents(
            @Param("usuario") Usuario usuario,
            @Param("area") Area area,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    List<CalendarioEvento> findByFechaEvento(LocalDateTime fecha);

    java.util.Optional<CalendarioEvento> findByReferenciaIdAndReferenciaTipo(Long refId, String refTipo);
}
