package com.licitaciones.sistema.security.services;

import com.licitaciones.sistema.entity.Usuario;
import com.licitaciones.sistema.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {
  @Autowired
  UsuarioRepository userRepository;

  @Override
  @Transactional
  public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
    Usuario user = userRepository.findByUsername(username)
        .orElseThrow(() -> new UsernameNotFoundException("No se encontró el usuario con el nombre: " + username));

    return UserDetailsImpl.build(user);
  }
}
