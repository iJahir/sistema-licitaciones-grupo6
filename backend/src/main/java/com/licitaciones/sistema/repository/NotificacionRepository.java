package com.licitaciones.sistema.repository;

import com.licitaciones.sistema.entity.Notificacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificacionRepository extends JpaRepository<Notificacion, Long> {
    
    // Obtener notificaciones para un usuario específico o globales, ordenadas por fecha descendente
    List<Notificacion> findByUsuarioIdIsNullOrderByFechaDesc();
    
    List<Notificacion> findByUsuarioIdOrderByFechaDesc(Long usuarioId);
    
    List<Notificacion> findTop10ByUsuarioIdIsNullOrderByFechaDesc();
    
    long countByLeidaFalse();
    
    long countByUsuarioIdAndLeidaFalse(Long usuarioId);
}
