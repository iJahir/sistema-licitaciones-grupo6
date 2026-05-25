package com.licitaciones.sistema.repository;

import com.licitaciones.sistema.entity.Criterio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CriterioRepository extends JpaRepository<Criterio, Long> {
    java.util.Optional<Criterio> findByNombre(String nombre);
    java.util.Optional<Criterio> findByNombreAndRubricaId(String nombre, Long rubricaId);
}
