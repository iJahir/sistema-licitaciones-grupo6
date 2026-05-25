package com.licitaciones.sistema.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PasswordResetRequest {
    @NotBlank
    private String newPassword;
    
    @NotBlank
    private String adminPassword;
}
