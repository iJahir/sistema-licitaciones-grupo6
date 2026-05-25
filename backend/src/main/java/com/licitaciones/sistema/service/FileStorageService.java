package com.licitaciones.sistema.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class FileStorageService {

    @Value("${app.upload.dir}")
    private String uploadDir;

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(Paths.get(uploadDir));
        } catch (IOException e) {
            throw new RuntimeException("No se pudo inicializar la carpeta de subidas en: " + uploadDir, e);
        }
    }

    public String saveFile(MultipartFile file, String subPath) throws IOException {
        String originalFilename = file.getOriginalFilename();
        String extension = "";
        
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        
        // Nombre único para evitar colisiones
        String fileName = UUID.randomUUID().toString() + extension;
        
        // Determinar ruta final
        Path finalDir = Paths.get(uploadDir);
        if (subPath != null && !subPath.isEmpty()) {
            finalDir = finalDir.resolve(subPath);
            Files.createDirectories(finalDir);
        }
        
        Path targetPath = finalDir.resolve(fileName);
        Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
        
        // Retornar la URL para acceder al archivo
        // El prefijo /api/files/ se configuró en WebConfig
        String urlPath = (subPath != null && !subPath.isEmpty()) ? subPath + "/" + fileName : fileName;
        return "/api/files/" + urlPath;
    }
}
