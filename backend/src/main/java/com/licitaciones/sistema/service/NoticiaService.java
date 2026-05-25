package com.licitaciones.sistema.service;

import com.licitaciones.sistema.entity.Noticia;
import com.licitaciones.sistema.entity.Usuario;
import com.licitaciones.sistema.repository.NoticiaRepository;
import com.licitaciones.sistema.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class NoticiaService {

    @Autowired
    private NoticiaRepository repository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    public List<Noticia> findAll() {
        return repository.findAllByOrderByFechaDesc();
    }

    public List<Noticia> findRecent(int limit) {
        return repository.findAllByOrderByFechaDesc().stream()
                .limit(limit)
                .collect(Collectors.toList());
    }

    @Transactional
    public void marcarComoLeida(Long noticiaId, Long usuarioId) {
        Noticia noticia = repository.findById(noticiaId)
                .orElseThrow(() -> new RuntimeException("Noticia no encontrada"));
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        
        noticia.getLeidoPor().add(usuario);
        repository.save(noticia);
    }

    public Noticia save(Noticia noticia) {
        return repository.save(noticia);
    }

    public void deleteById(Long id) {
        repository.deleteById(id);
    }
}
