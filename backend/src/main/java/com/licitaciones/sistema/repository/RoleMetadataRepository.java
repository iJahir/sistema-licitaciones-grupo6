package com.licitaciones.sistema.repository;

import com.licitaciones.sistema.entity.RoleMetadata;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface RoleMetadataRepository extends JpaRepository<RoleMetadata, Long> {
    Optional<RoleMetadata> findByRoleKey(String roleKey);
    boolean existsByRoleKey(String roleKey);
}
