package com.licitaciones.sistema.repository;

import com.licitaciones.sistema.entity.Rubrica;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RubricaRepository extends JpaRepository<Rubrica, Long> {
    Optional<Rubrica> findByLicitacionId(Long licitacionId);
}
