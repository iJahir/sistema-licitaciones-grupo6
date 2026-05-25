package com.licitaciones.sistema.repository;

import com.licitaciones.sistema.entity.DocumentoLicitacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentoLicitacionRepository extends JpaRepository<DocumentoLicitacion, Long> {
    List<DocumentoLicitacion> findByLicitacionId(Long licitacionId);
}
