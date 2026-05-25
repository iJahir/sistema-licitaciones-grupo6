package com.licitaciones.sistema.repository;

import com.licitaciones.sistema.entity.DocumentoPropuesta;
import com.licitaciones.sistema.entity.Propuesta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentoPropuestaRepository extends JpaRepository<DocumentoPropuesta, Long> {
    List<DocumentoPropuesta> findByPropuesta(Propuesta propuesta);
}
