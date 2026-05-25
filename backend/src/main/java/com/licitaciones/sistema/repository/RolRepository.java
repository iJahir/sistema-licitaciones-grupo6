package com.licitaciones.sistema.repository;

import com.licitaciones.sistema.entity.Rol;
import com.licitaciones.sistema.entity.RoleName;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RolRepository extends JpaRepository<Rol, Long> {
    Optional<Rol> findByName(RoleName name);
}
