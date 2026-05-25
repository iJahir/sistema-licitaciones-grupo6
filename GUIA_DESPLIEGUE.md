# Guía de Handover y Despliegue del Proyecto
## Sistema de Licitaciones Corporativas

Esta guía contiene los pasos exactos y configuraciones que debe realizar cualquier persona que reciba este proyecto para levantarlo por primera vez en su dispositivo.

---

## 📋 1. Requisitos Previos

Asegúrate de tener instalado en tu sistema:
1. **Java JDK 17** (o superior).
2. **Node.js** v18 o superior y **Angular CLI** v17 o superior.
3. **Microsoft SQL Server** (LocalDB o instancia completa).
4. **SQL Server Management Studio (SSMS)** (recomendado para importar el backup).

---

## 🗄️ 2. Configuración de la Base de Datos

El backend está configurado para conectarse a **SQL Server**. Si tienes un backup físico o script SQL de tu base de datos:

1. **Restaurar Base de Datos**:
   * Abre SQL Server Management Studio (SSMS).
   * Haz clic derecho sobre *Databases* -> *Restore Database...*
   * Selecciona el archivo `.bak` que te entregaron y restáuralo con el nombre **`SistemaDeLicitaciones`**.

2. **Crear Usuario de Conexión (Recomendado)**:
   Si deseas utilizar las credenciales por defecto del proyecto sin cambiar el código, ejecuta el siguiente script en SSMS (con permisos de `sa`):
   ```sql
   -- Crear inicio de sesión en el servidor
   CREATE LOGIN [Lici_user] WITH PASSWORD=N'123456789', DEFAULT_DATABASE=[SistemaDeLicitaciones], CHECK_EXPIRATION=OFF, CHECK_POLICY=OFF;
   GO
   
   -- Crear usuario en la base de datos y otorgar permisos
   USE [SistemaDeLicitaciones];
   CREATE USER [Lici_user] FOR LOGIN [Lici_user];
   ALTER ROLE [db_owner] ADD MEMBER [Lici_user];
   GO
   ```

3. **Verificar Configuración en Backend**:
   Abre el archivo `backend/src/main/resources/application.properties` y ajusta las credenciales según tu dispositivo si es necesario:
   * **URL de conexión**: `spring.datasource.url=jdbc:sqlserver://localhost:1433;databaseName=SistemaDeLicitaciones;encrypt=true;trustServerCertificate=true`
   * **Usuario**: `spring.datasource.username=Lici_user`
   * **Contraseña**: `spring.datasource.password=123456789`

> [!TIP]
> Si experimentas problemas de conexión con SQL Server, asegúrate de activar el protocolo **TCP/IP** en el **SQL Server Configuration Manager** y habilitar el puerto `1433`.

---

## 📁 3. Configuración de Archivos y Adjuntos (Licitaciones)

El sistema almacena físicamente documentos de licitaciones, propuestas y fotos de perfil en el disco duro.

1. **Carpeta de Licitaciones**:
   El proyecto busca por defecto la ruta: **`C:/Users/aldo1/Documents/LICITACIONES`**
2. **Cómo recrearla o ajustarla**:
   * **Opción A (Recomendada)**: Crea una carpeta llamada `LICITACIONES` dentro de tus Documentos, y asegúrate de descomprimir allí todos los archivos del zip de licitaciones que te pasaron.
   * **Opción B (Ajuste Personalizado)**: Si tu usuario de Windows es diferente o quieres ponerlos en otra ruta (ej: `D:/LICITACIONES`), abre el archivo `backend/src/main/resources/application.properties` y modifica el parámetro `app.upload.dir`:
     ```properties
     app.upload.dir=C:/Ruta/A/Tu/Nueva/Carpeta/LICITACIONES
     ```
     *(Usa barras diagonales `/` para separar las carpetas, incluso en Windows)*.

---

## 🚀 4. Arrancar la Aplicación

### ☕ Paso A: Levantar el Backend (Spring Boot)
1. Abre tu terminal de preferencia o IDE en la carpeta del `backend`.
2. Ejecuta el comando de Maven para levantar el servidor de desarrollo:
   * **En Windows (PowerShell/CMD)**:
     ```powershell
     ./mvnw spring-boot:run
     ```
   * **En Linux/macOS**:
     ```bash
     chmod +x mvnw
     ./mvnw spring-boot:run
     ```
3. El servidor iniciará en el puerto **`8080`**. Puedes abrir `http://localhost:8080/swagger-ui/index.html` para ver la documentación de APIs.

### 🅰️ Paso B: Levantar el Frontend (Angular)
1. Abre otra terminal en la carpeta del `frontend`.
2. Instala todas las dependencias del proyecto:
   ```bash
   npm install
   ```
3. Inicia el servidor de desarrollo de Angular:
   ```bash
   ng serve --port 4200
   ```
4. Abre tu navegador en **`http://localhost:4200`** para interactuar con la aplicación.

---

## 🔐 5. Credenciales de Prueba por Defecto

Una vez que la aplicación esté corriendo, puedes iniciar sesión con las siguientes cuentas de prueba de la base de datos:

* **Administrador Principal**:
  * **Usuario**: `admin`
  * **Contraseña**: *(La contraseña configurada en la BD)*
* **Rol Autoridad (Montenegro Montenegro)**:
  * **Usuario**: *(El usuario con rol ROLE_AUTORIDAD)*
  * **Contraseña**: *(Su contraseña asignada)*

---

## 🛠️ 6. Solución de Problemas Frecuentes

* **Error: "TCP/IP connection to host localhost, port 1433 failed"**
  * Abre *SQL Server Configuration Manager*.
  * Ve a *SQL Server Network Configuration* -> *Protocols for MSSQLSERVER*.
  * Haz doble clic en **TCP/IP** y cámbialo a **Enabled**.
  * Ve a la pestaña *IP Addresses*, desplázate hasta abajo a *IPAll* y pon `1433` en *TCP Port*.
  * Reinicia el servicio de SQL Server.
  
* **Error de permisos al subir archivos**:
  * Asegúrate de que la carpeta de almacenamiento configurada en `app.upload.dir` tenga permisos de lectura y escritura para el usuario que está corriendo el backend.
