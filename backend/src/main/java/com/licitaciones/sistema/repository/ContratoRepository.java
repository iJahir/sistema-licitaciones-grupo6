package com.licitaciones.sistema.repository;

import com.licitaciones.sistema.entity.Contrato;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ContratoRepository extends JpaRepository<Contrato, Long> {
    Optional<Contrato> findByLicitacionId(Long licitacionId);
    Optional<Contrato> findByCodigo(String codigo);
}
