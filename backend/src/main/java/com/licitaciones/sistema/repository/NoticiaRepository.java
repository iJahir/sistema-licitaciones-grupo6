package com.licitaciones.sistema.repository;

import com.licitaciones.sistema.entity.Noticia;
import com.licitaciones.sistema.entity.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NoticiaRepository extends JpaRepository<Noticia, Long> {

    List<Noticia> findAllByOrderByFechaDesc();

    @Query("SELECT n FROM Noticia n WHERE :usuario NOT MEMBER OF n.leidoPor ORDER BY n.fecha DESC")
    List<Noticia> findUnreadByUser(@Param("usuario") Usuario usuario);
}
