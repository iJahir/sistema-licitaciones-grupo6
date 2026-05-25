package com.licitaciones.sistema;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DBInspector implements CommandLineRunner {
    private final JdbcTemplate jdbcTemplate;

    public DBInspector(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) throws Exception {
        System.out.println("=== INSPECTING TRIGGERS ===");
        try {
            jdbcTemplate.query("SELECT name, OBJECT_DEFINITION(object_id) as definition FROM sys.triggers", (rs, rowNum) -> {
                System.out.println("Trigger Name: " + rs.getString("name"));
                System.out.println("Definition:\n" + rs.getString("definition"));
                return null;
            });
        } catch (Exception e) {
            System.out.println("Error querying triggers: " + e.getMessage());
        }

        System.out.println("=== INSPECTING VIEWS ===");
        try {
            jdbcTemplate.query("SELECT name, OBJECT_DEFINITION(object_id) as definition FROM sys.views", (rs, rowNum) -> {
                System.out.println("View Name: " + rs.getString("name"));
                System.out.println("Definition:\n" + rs.getString("definition"));
                return null;
            });
        } catch (Exception e) {
            System.out.println("Error querying views: " + e.getMessage());
        }
        
        System.out.println("=== INSPECTING TABLE proveedores ===");
        try {
            jdbcTemplate.query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'proveedores'", (rs, rowNum) -> {
                System.out.println("Column: " + rs.getString("COLUMN_NAME") + " | Type: " + rs.getString("DATA_TYPE"));
                return null;
            });
        } catch (Exception e) {
            System.out.println("Error querying proveedores table: " + e.getMessage());
        }

        System.out.println("--- INICIANDO CORRECCIÓN DE ESQUEMA ---");
        try {
            // Eliminar restricciones CHECK restrictivas en estado (SQL Server)
            try {
                jdbcTemplate.execute("DECLARE @ConstraintName nvarchar(200)\n" +
                        "SELECT @ConstraintName = Name FROM SYS.CHECK_CONSTRAINTS \n" +
                        "WHERE PARENT_OBJECT_ID = OBJECT_ID('propuestas') \n" +
                        "AND PARENT_COLUMN_ID = COLUMNPROPERTY(OBJECT_ID('propuestas'), 'estado', 'ColumnId')\n" +
                        "IF @ConstraintName IS NOT NULL EXEC('ALTER TABLE propuestas DROP CONSTRAINT ' + @ConstraintName)");
                
                jdbcTemplate.execute("DECLARE @ConstraintName nvarchar(200)\n" +
                        "SELECT @ConstraintName = Name FROM SYS.CHECK_CONSTRAINTS \n" +
                        "WHERE PARENT_OBJECT_ID = OBJECT_ID('licitaciones') \n" +
                        "AND PARENT_COLUMN_ID = COLUMNPROPERTY(OBJECT_ID('licitaciones'), 'estado', 'ColumnId')\n" +
                        "IF @ConstraintName IS NOT NULL EXEC('ALTER TABLE licitaciones DROP CONSTRAINT ' + @ConstraintName)");

                // Eliminar restricción de ROLES
                jdbcTemplate.execute("DECLARE @ConstraintName nvarchar(200)\n" +
                        "SELECT @ConstraintName = Name FROM SYS.CHECK_CONSTRAINTS \n" +
                        "WHERE PARENT_OBJECT_ID = OBJECT_ID('roles') \n" +
                        "AND PARENT_COLUMN_ID = COLUMNPROPERTY(OBJECT_ID('roles'), 'name', 'ColumnId')\n" +
                        "IF @ConstraintName IS NOT NULL EXEC('ALTER TABLE roles DROP CONSTRAINT ' + @ConstraintName)");

                // Eliminar restricción de EVALUACIONES.resultado
                jdbcTemplate.execute("DECLARE @ConstraintName nvarchar(200)\n" +
                        "SELECT @ConstraintName = Name FROM SYS.CHECK_CONSTRAINTS \n" +
                        "WHERE PARENT_OBJECT_ID = OBJECT_ID('evaluaciones') \n" +
                        "AND PARENT_COLUMN_ID = COLUMNPROPERTY(OBJECT_ID('evaluaciones'), 'resultado', 'ColumnId')\n" +
                        "IF @ConstraintName IS NOT NULL EXEC('ALTER TABLE evaluaciones DROP CONSTRAINT ' + @ConstraintName)");
                
                System.out.println("✅ Restricciones CHECK en tablas eliminadas.");
            } catch (Exception e) {
                System.out.println("ℹ️ No se pudo eliminar restricciones: " + e.getMessage());
            }

            // Agregar columnas necesarias a evaluaciones
            try {
                jdbcTemplate.execute("ALTER TABLE evaluaciones ADD puntajes_json NVARCHAR(MAX) NULL");
            } catch (Exception e) {}
            try {
                jdbcTemplate.execute("ALTER TABLE evaluaciones ADD respuestas_json NVARCHAR(MAX) NULL");
            } catch (Exception e) {}
            try {
                jdbcTemplate.execute("ALTER TABLE evaluaciones ADD estado_tramite NVARCHAR(50) DEFAULT 'BORRADOR'");
            } catch (Exception e) {}
            try {
                jdbcTemplate.execute("ALTER TABLE evaluaciones ADD estrellas INT DEFAULT 0");
            } catch (Exception e) {}
            try {
                jdbcTemplate.execute("ALTER TABLE evaluaciones ADD especialidad_evaluador NVARCHAR(30) NOT NULL DEFAULT 'GENERAL'");
            } catch (Exception e) {}
            try {
                jdbcTemplate.execute("ALTER TABLE evaluaciones ADD active BIT NOT NULL DEFAULT 1");
            } catch (Exception e) {}
            try {
                jdbcTemplate.execute("ALTER TABLE evaluaciones ADD tipo_evaluador NVARCHAR(30) NOT NULL DEFAULT 'OBLIGATORIO'");
            } catch (Exception e) {}
            try {
                jdbcTemplate.execute("ALTER TABLE evaluaciones ADD ip_address NVARCHAR(100) NULL");
            } catch (Exception e) {}
            try {
                jdbcTemplate.execute("ALTER TABLE evaluaciones ADD user_agent NVARCHAR(255) NULL");
            } catch (Exception e) {}
            try {
                jdbcTemplate.execute("ALTER TABLE evaluaciones ADD device NVARCHAR(100) NULL");
            } catch (Exception e) {}
            try {
                jdbcTemplate.execute("ALTER TABLE evaluaciones ADD session_id NVARCHAR(100) NULL");
            } catch (Exception e) {}
            try {
                jdbcTemplate.execute("ALTER TABLE evaluaciones ADD document_hash NVARCHAR(255) NULL");
            } catch (Exception e) {}
            try {
                jdbcTemplate.execute("ALTER TABLE evaluaciones ADD firma_digital NVARCHAR(MAX) NULL");
            } catch (Exception e) {}

            // Agregar columnas necesarias a contratos
            try {
                jdbcTemplate.execute("ALTER TABLE contratos ADD ip_address NVARCHAR(100) NULL");
            } catch (Exception e) {}
            try {
                jdbcTemplate.execute("ALTER TABLE contratos ADD user_agent NVARCHAR(255) NULL");
            } catch (Exception e) {}
            try {
                jdbcTemplate.execute("ALTER TABLE contratos ADD device NVARCHAR(100) NULL");
            } catch (Exception e) {}
            try {
                jdbcTemplate.execute("ALTER TABLE contratos ADD session_id NVARCHAR(100) NULL");
            } catch (Exception e) {}
            try {
                jdbcTemplate.execute("ALTER TABLE contratos ADD document_hash NVARCHAR(255) NULL");
            } catch (Exception e) {}
            try {
                jdbcTemplate.execute("ALTER TABLE contratos ADD firma_digital NVARCHAR(MAX) NULL");
            } catch (Exception e) {}

            try {
                jdbcTemplate.execute("ALTER TABLE propuestas ADD puntaje_total INT NULL");
                jdbcTemplate.execute("ALTER TABLE propuestas ADD estrellas INT NULL");
                System.out.println("✅ Columnas de resumen agregadas a evaluaciones y propuestas.");
            } catch (Exception e) {}

            // Corregir discrepancia de columna area_solicitante
            try {
                jdbcTemplate.execute("ALTER TABLE licitaciones ALTER COLUMN area_solicitante NVARCHAR(255) NULL");
                System.out.println("✅ Columna area_solicitante ajustada a NULLABLE.");
            } catch (Exception e) {}

            // Módulo de Participantes
            try {
                jdbcTemplate.execute("IF OBJECT_ID('participantes', 'U') IS NULL " +
                        "CREATE TABLE participantes (" +
                        "id BIGINT IDENTITY(1,1) PRIMARY KEY, " +
                        "licitacion_id BIGINT NOT NULL, " +
                        "usuario_id BIGINT NOT NULL, " +
                        "estado NVARCHAR(50) DEFAULT 'INSCRITO', " +
                        "fecha_inscripcion DATETIME2, " +
                        "observaciones NVARCHAR(MAX))");
                System.out.println("✅ Tabla participantes creada.");
            } catch (Exception e) {}

            try {
                jdbcTemplate.execute("ALTER TABLE propuestas ADD participante_id BIGINT NULL");
            } catch (Exception e) {}

            try {
                jdbcTemplate.execute("ALTER TABLE evaluaciones ADD version INT DEFAULT 1");
            } catch (Exception e) {}

            // Agregar area_id a usuarios si no existe
            try {
                jdbcTemplate.execute("ALTER TABLE usuarios ADD area_id BIGINT NULL");
                System.out.println("✅ Columna area_id agregada a usuarios.");
            } catch (Exception e) {}

            try {
                jdbcTemplate.execute("IF OBJECT_ID('notificaciones', 'U') IS NULL " +
                        "CREATE TABLE notificaciones (" +
                        "id BIGINT IDENTITY(1,1) PRIMARY KEY, " +
                        "usuario_id BIGINT NULL, " +
                        "titulo NVARCHAR(255) NOT NULL, " +
                        "mensaje NVARCHAR(500) NOT NULL, " +
                        "icono NVARCHAR(50), " +
                        "color NVARCHAR(20), " +
                        "fecha DATETIME2 NOT NULL, " +
                        "leida BIT DEFAULT 0, " +
                        "tipo NVARCHAR(50), " +
                        "link NVARCHAR(255))");
                System.out.println("✅ Tabla notificaciones creada.");
            } catch (Exception e) {}

            try {
                jdbcTemplate.execute("IF OBJECT_ID('contratos', 'U') IS NULL " +
                        "CREATE TABLE contratos (" +
                        "id BIGINT IDENTITY(1,1) PRIMARY KEY, " +
                        "licitacion_id BIGINT NOT NULL, " +
                        "propuesta_id BIGINT NOT NULL, " +
                        "codigo NVARCHAR(50) UNIQUE NOT NULL, " +
                        "monto DECIMAL(18,2), " +
                        "fecha_firma DATETIME2, " +
                        "fecha_inicio DATETIME2, " +
                        "fecha_fin DATETIME2, " +
                        "estado NVARCHAR(50) DEFAULT 'PENDIENTE', " +
                        "archivo_url NVARCHAR(255), " +
                        "observaciones NVARCHAR(MAX), " +
                        "created_at DATETIME2, " +
                        "updated_at DATETIME2)");
                System.out.println("✅ Tabla contratos creada.");
            } catch (Exception e) {}

            // Seed de Áreas
            String[] areas = {"FINANZAS", "TI", "LOGISTICA", "RRHH", "OPERACIONES", "COMERCIAL", "JURIDICO"};
            for (String area : areas) {
                try {
                    int count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM areas WHERE nombre = ?", Integer.class, area);
                    if (count == 0) {
                        jdbcTemplate.update("INSERT INTO areas (nombre, descripcion) VALUES (?, ?)", area, "Departamento de " + area);
                    }
                } catch (Exception e) {}
            }
            System.out.println("✅ Áreas sincronizadas.");

        } catch (Exception e) {
            System.err.println("⚠️ Error al actualizar esquema: " + e.getMessage());
        }
        System.out.println("--- FIN CORRECCIÓN DE ESQUEMA ---");
    }
}
