package com.licitaciones.sistema.repository;

import com.licitaciones.sistema.entity.Participante;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ParticipanteRepository extends JpaRepository<Participante, Long> {
    List<Participante> findByLicitacionId(Long licitacionId);
    Optional<Participante> findByLicitacionIdAndUsuarioId(Long licitacionId, Long usuarioId);
}
