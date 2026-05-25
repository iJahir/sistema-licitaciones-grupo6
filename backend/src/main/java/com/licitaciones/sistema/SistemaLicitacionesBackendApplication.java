package com.licitaciones.sistema;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import org.springframework.scheduling.annotation.EnableScheduling;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootApplication
@EnableScheduling
public class SistemaLicitacionesBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(SistemaLicitacionesBackendApplication.class, args);
	}

    @Bean
    public CommandLineRunner schemaFix(JdbcTemplate jdbcTemplate) {
        return args -> {
            try {
                System.out.println("--- INICIANDO CORRECCIÓN DE ESQUEMA ---");
                // Intentar dropear la restricción que bloquea el estado CANCELADA
                // SQL Server: DROP CONSTRAINT necesita el nombre exacto
                jdbcTemplate.execute("ALTER TABLE licitaciones DROP CONSTRAINT IF EXISTS CK__licitacio__estad__46E78A0C");
                System.out.println("Constraint CK__licitacio__estad__46E78A0C removida o no existía.");
                
                // Corrección para calendario_eventos tipo_evento
                try {
                    jdbcTemplate.execute("ALTER TABLE calendario_eventos DROP CONSTRAINT IF EXISTS CK__calendari__tipo___14270015");
                    System.out.println("Constraint CK__calendari__tipo___14270015 removida de calendario_eventos.");
                } catch (Exception e) {
                    System.out.println("No se pudo remover CK__calendari__tipo___14270015 (posiblemente ya no existe).");
                }

                // Corrección para remover restricciones/índices únicos en evaluaciones(propuesta_id)
                try {
                    String query = "SELECT i.name " +
                                   "FROM sys.indexes i " +
                                   "JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id " +
                                   "JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id " +
                                   "WHERE i.is_unique = 1 " +
                                   "  AND OBJECT_NAME(i.object_id) = 'evaluaciones' " +
                                   "  AND c.name = 'propuesta_id'";
                    
                    java.util.List<java.util.Map<String, Object>> rows = jdbcTemplate.queryForList(query);
                    for (java.util.Map<String, Object> row : rows) {
                        String indexName = (String) row.get("name");
                        if (indexName != null) {
                            System.out.println("Encontrado índice/restricción único en evaluaciones(propuesta_id): " + indexName);
                            try {
                                jdbcTemplate.execute("ALTER TABLE evaluaciones DROP CONSTRAINT " + indexName);
                                System.out.println("Restricción única " + indexName + " removida exitosamente de evaluaciones.");
                            } catch (Exception ex) {
                                try {
                                    jdbcTemplate.execute("DROP INDEX " + indexName + " ON evaluaciones");
                                    System.out.println("Índice único " + indexName + " removido exitosamente de evaluaciones.");
                                } catch (Exception ex2) {
                                    System.err.println("No se pudo remover " + indexName + ": " + ex2.getMessage());
                                }
                            }
                        }
                    }
                } catch (Exception e) {
                    System.out.println("Error al buscar/remover índices únicos en evaluaciones: " + e.getMessage());
                }

                System.out.println("--- FIN CORRECCIÓN DE ESQUEMA ---");
            } catch (Exception e) {
                System.err.println("Error al corregir esquema: " + e.getMessage());
            }
        };
    }
}
