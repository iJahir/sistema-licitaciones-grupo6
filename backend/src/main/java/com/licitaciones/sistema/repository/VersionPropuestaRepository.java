package com.licitaciones.sistema.repository;

import com.licitaciones.sistema.entity.VersionPropuesta;
import com.licitaciones.sistema.entity.Propuesta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VersionPropuestaRepository extends JpaRepository<VersionPropuesta, Long> {
    List<VersionPropuesta> findByPropuestaOrderByNumeroVersionDesc(Propuesta propuesta);
}
