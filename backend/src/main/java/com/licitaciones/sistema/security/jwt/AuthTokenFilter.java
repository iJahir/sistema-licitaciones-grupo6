package com.licitaciones.sistema.security.jwt;

import com.licitaciones.sistema.repository.UsuarioRepository;
import com.licitaciones.sistema.entity.Usuario;
import com.licitaciones.sistema.security.services.UserDetailsServiceImpl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.concurrent.ConcurrentHashMap;

public class AuthTokenFilter extends OncePerRequestFilter {
  @Autowired
  private JwtUtils jwtUtils;

  @Autowired
  private UserDetailsServiceImpl userDetailsService;

  @Autowired
  private UsuarioRepository usuarioRepository;

  private static final Logger logger = LoggerFactory.getLogger(AuthTokenFilter.class);

  // Throttle: track last activity update per user to avoid DB spam (max 1 update/minute)
  private final ConcurrentHashMap<String, LocalDateTime> lastActivityUpdate = new ConcurrentHashMap<>();

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    try {
      String jwt = parseJwt(request);
      if (jwt != null && jwtUtils.validateJwtToken(jwt)) {
        String username = jwtUtils.getUserNameFromJwtToken(jwt);

        UserDetails userDetails = userDetailsService.loadUserByUsername(username);
        UsernamePasswordAuthenticationToken authentication =
            new UsernamePasswordAuthenticationToken(
                userDetails,
                null,
                userDetails.getAuthorities());
        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

        SecurityContextHolder.getContext().setAuthentication(authentication);

        // Update ultimaActividad (throttled to once per minute)
        updateUltimaActividad(username);
      }
    } catch (Exception e) {
      logger.error("Cannot set user authentication: {}", e);
    }

    filterChain.doFilter(request, response);
  }

  private void updateUltimaActividad(String username) {
    try {
      LocalDateTime now = LocalDateTime.now();
      LocalDateTime lastUpdate = lastActivityUpdate.get(username);
      
      // Only update if more than 1 minute has passed since last update
      if (lastUpdate == null || lastUpdate.plusMinutes(1).isBefore(now)) {
        lastActivityUpdate.put(username, now);
        usuarioRepository.findByUsername(username).ifPresent(user -> {
          logger.debug("Actualizando última actividad para usuario: {}", username);
          user.setUltimaActividad(now);
          usuarioRepository.save(user);
        });
      }
    } catch (Exception e) {
      logger.error("Error al actualizar ultimaActividad para {}: {}", username, e.getMessage());
    }
  }

  private String parseJwt(HttpServletRequest request) {
    String headerAuth = request.getHeader("Authorization");

    if (StringUtils.hasText(headerAuth) && headerAuth.startsWith("Bearer ")) {
      return headerAuth.substring(7);
    }

    return null;
  }
}
