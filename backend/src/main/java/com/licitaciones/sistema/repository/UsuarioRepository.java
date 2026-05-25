package com.licitaciones.sistema.repository;

import com.licitaciones.sistema.entity.Usuario;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Optional<Usuario> findByUsername(String username);
    Boolean existsByUsername(String username);
    Boolean existsByEmail(String email);

    Page<Usuario> findAllByEliminadoFalse(Pageable pageable);

    @Query("SELECT u FROM Usuario u WHERE u.eliminado = false AND NOT EXISTS (SELECT r FROM u.roles r WHERE r.name = com.licitaciones.sistema.entity.RoleName.ROLE_PROVEEDOR)")
    Page<Usuario> findAllInternos(Pageable pageable);

    @Query("SELECT u FROM Usuario u WHERE u.eliminado = false AND NOT EXISTS (SELECT r FROM u.roles r WHERE r.name = com.licitaciones.sistema.entity.RoleName.ROLE_PROVEEDOR) AND (" +
           "LOWER(u.username) LIKE LOWER(CONCAT('%', :term, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :term, '%')) OR " +
           "LOWER(u.nombre) LIKE LOWER(CONCAT('%', :term, '%')) OR " +
           "LOWER(u.apellido) LIKE LOWER(CONCAT('%', :term, '%')))")
    Page<Usuario> searchInternos(@Param("term") String term, Pageable pageable);

    @Query("SELECT u FROM Usuario u JOIN u.roles r WHERE u.eliminado = false AND r.name = com.licitaciones.sistema.entity.RoleName.ROLE_PROVEEDOR AND " +
           "(:term IS NULL OR :term = '' OR LOWER(u.username) LIKE LOWER(CONCAT('%', :term, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :term, '%')) OR " +
           "LOWER(u.nombre) LIKE LOWER(CONCAT('%', :term, '%')) OR " +
           "LOWER(u.apellido) LIKE LOWER(CONCAT('%', :term, '%')) OR " +
           "LOWER(u.empresaNombre) LIKE LOWER(CONCAT('%', :term, '%')) OR " +
           "LOWER(u.ruc) LIKE LOWER(CONCAT('%', :term, '%'))) AND " +
           "(:estado IS NULL OR :estado = '' OR :estado = 'Todos' OR (:estado = 'Activo' AND u.enabled = true) OR (:estado = 'Inactivo' AND u.enabled = false)) AND " +
           "(:categoria IS NULL OR :categoria = '' OR :categoria = 'Todas' OR LOWER(u.categoria) = LOWER(:categoria))")
    Page<Usuario> searchProveedores(@Param("term") String term, @Param("estado") String estado, @Param("categoria") String categoria, Pageable pageable);

    @Query("SELECT COUNT(u) FROM Usuario u JOIN u.roles r WHERE u.eliminado = false AND r.name = com.licitaciones.sistema.entity.RoleName.ROLE_PROVEEDOR AND u.enabled = :enabled")
    long countProveedoresByEnabled(@Param("enabled") boolean enabled);

    @Query("SELECT u FROM Usuario u JOIN u.roles r WHERE u.eliminado = false AND r.name = :roleName")
    java.util.List<Usuario> findByRoleName(@Param("roleName") com.licitaciones.sistema.entity.RoleName roleName);

    @Query("SELECT DISTINCT u FROM Usuario u LEFT JOIN FETCH u.area JOIN u.roles r WHERE u.eliminado = false AND r.name IN :roleNames")
    java.util.List<Usuario> findByRoleNameIn(@Param("roleNames") java.util.Collection<com.licitaciones.sistema.entity.RoleName> roleNames);

    @Query("SELECT COUNT(u) FROM Usuario u JOIN u.roles r WHERE u.eliminado = false AND r.name = :roleName")
    long countByRoleName(@Param("roleName") com.licitaciones.sistema.entity.RoleName roleName);

    @Query("SELECT COUNT(u) FROM Usuario u WHERE u.eliminado = false AND u.fechaCreacion >= :since")
    long countNewUsers(@Param("since") java.time.LocalDateTime since);

    @Query("SELECT COUNT(u) FROM Usuario u WHERE u.eliminado = false AND u.ultimaActividad >= :since")
    long countActiveUsersSince(@Param("since") java.time.LocalDateTime since);

    @Query("SELECT u.categoria, COUNT(u) FROM Usuario u JOIN u.roles r WHERE u.eliminado = false AND r.name = com.licitaciones.sistema.entity.RoleName.ROLE_PROVEEDOR AND u.categoria IS NOT NULL AND u.categoria <> '' GROUP BY u.categoria")
    java.util.List<Object[]> countProveedoresByCategoria();
}
