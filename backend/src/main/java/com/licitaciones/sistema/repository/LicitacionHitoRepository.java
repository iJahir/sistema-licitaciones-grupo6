package com.licitaciones.sistema.repository;

import com.licitaciones.sistema.entity.LicitacionHito;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface LicitacionHitoRepository extends JpaRepository<LicitacionHito, Long> {
    List<LicitacionHito> findByLicitacionId(Long licitacionId);
}
