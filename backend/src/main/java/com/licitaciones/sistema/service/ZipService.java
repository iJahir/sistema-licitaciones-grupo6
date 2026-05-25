package com.licitaciones.sistema.service;

import org.springframework.stereotype.Service;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
public class ZipService {

    /**
     * Crea un archivo ZIP en memoria a partir de un mapa de nombres de archivo y sus rutas locales.
     * @param files Map<NombreEnZip, RutaLocal>
     * @return byte[] El contenido del ZIP
     * @throws IOException
     */
    public byte[] createZip(Map<String, String> files) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            for (Map.Entry<String, String> entry : files.entrySet()) {
                String fileNameInZip = entry.getKey();
                String localPathStr = entry.getValue();
                
                // Convertir URL/Ruta a Path absoluto si es necesario
                // Asumimos que localPathStr es la ruta absoluta en el sistema de archivos
                Path path = Paths.get(localPathStr);
                
                if (Files.exists(path)) {
                    ZipEntry zipEntry = new ZipEntry(fileNameInZip);
                    zos.putNextEntry(zipEntry);
                    Files.copy(path, zos);
                    zos.closeEntry();
                }
            }
        }
        return baos.toByteArray();
    }
}
