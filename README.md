# Portal Universitario - Universidad SA
> **Maestría en Seguridad de la Información (MASI 2026)**  
> **Proyecto:** Tarea Integradora Semanas 4 y 5 - Seguridad en Aplicaciones

---

## Guía Rápida de Instalación y Ejecución

Para levantar el proyecto localmente y evaluar todas las implementaciones de seguridad, sigue estos pasos:

### 1. Clonar el repositorio y ubicarse en la rama de seguridad
```bash
git clone https://github.com/Wa09Plus/universidad-sa.git
cd universidad-sa

### 1.1 Si desea ver la versión inical del proyecto utilizar la rama "main" en caso desee verla con implementaciones ejecutar  lo siguiente:

git checkout implementaciones_seguras

```
*(la rama `implementaciones_seguras` es donde se encuentran todos los controles y parches de seguridad implementados).*

### 2. Instalar dependencias
Requiere **Node.js v18** o superior (recomendado Node v20 o v24):
```bash
npm install
```

### 3. Configurar variables de entorno
Copia la plantilla de variables de entorno `.env.example` a un archivo `.env`:
* **Linux / macOS:**
  ```bash
  cp .env.example .env
  ```
* **Windows (PowerShell / CMD):**
  ```powershell
  copy .env.example .env
  ```
Se agregaron los archivos `servercrt.example` y `serverkey.example` para habilitar TLS locales. Se deben copiar a `server.crt` y `server.key` respectivamente.

*(El archivo `.env` ya cuenta con claves criptográficas predeterminadas de 256 bits para pruebas locales de AES-256-GCM y firma de tokens).*

### 4. Inicializar la Base de Datos segura
Ejecuta el script que crea el esquema de 8 tablas relacionales con contraseñas en **scrypt** y DPIs cifrados en **AES-256-GCM**:
```bash
npm run init-db
```

### 5. Iniciar la aplicación
Ejecuta el comando principal para iniciar simultáneamente el Backend (Express) y el Frontend (Vite/React):

```bash
npm run dev o npm start
```
## URLs de Acceso

Una vez levantado el entorno:
* **Portal Web (Frontend de Usuario / Estudiantes / Docentes):**  
  **`http://localhost:5173`**
* **API Backend (Servicios REST Express):**  
  `http://localhost:3000/api`

---

## Credenciales de Acceso para Evaluación

| Rol               | Usuario | Contraseña      | Descripción / Permisos |
| **Administrador** | `admin` | `admin123`      | Control total: Consulta y modificación de notas, búsqueda maestra de estudiantes, reportes y compresión de archivos. |

| **Estudiante**    | `cmendoza` | `carlos2026` | Acceso a expediente propio (Carnet `0904-26-001`), asignación de cursos y foro de consultas. |
| **Estudiante**    | `smoscoso` | `sofia2026`  | Acceso a expediente propio (Carnet `0904-26-002`) y notas registradas. |

---

## Verificación de Controles de Seguridad (Scripts de Prueba)

El repositorio incluye suites de comprobación automatizadas para verificar cada fase de la rúbrica:

1. **Auditoría de Bitácora y Registro Seguro (`tbl_bitacora`):**
   ```bash
   node logs_db.js
   ```
2. **Pruebas de KDF scrypt, AES-256-GCM y Validaciones:**
   ```bash
   node scratch/test_security.js
   ```
3. **Pruebas de Mitigación de Inyección SQL, IDOR y Control de Acceso:**
   ```bash
   node scratch/test_anti_sqli.js
   ```
4. **Verificación de Cifrado en Tránsito (TLS) y Manejo de Claves:**
   ```bash
   node scratch/test_tls_and_keys.js
   ```

---

## Resumen de Controles de Seguridad Implementados

* **Fase I.A - Validación de Entradas:** Validación por lista blanca estricta en nombres, apellidos, correo institucional (`@universidad.edu`), DPI (13 dígitos) y calificaciones ($0-100$).
* **Fase I.B - Inyección SQL:** Todas las consultas SQL convertidas a Prepared Statements parametrizados (`?`). Bloqueo de payloads maliciosos con HTTP 400.
* **Fase I.C - Cross-Site Scripting (XSS):** Eliminación de `dangerouslySetInnerHTML`. Renderizado contextual nativo de React JSX.
* **Fase I.D - Inyección de Comandos en SO:** Reemplazo de `exec` por `execFile` con `shell: false`, lista blanca de rutas y validación de nombres de archivo.
* **Fase II.A - Almacenamiento de Contraseñas:** KDF `scrypt` con sal criptográfica única de 16 bytes y verificación en tiempo constante (`timingSafeEqual`).
* **Fase II.B - Cifrado en Reposo:** Cifrado simétrico autenticado `AES-256-GCM` para el DPI en `TM_estudiante`.
* **Fase II.C - Gestión de Secretos:** Centralización en `.env` y exclusión total de Git mediante `.gitignore`.
* **Fase II.D - Cifrado en Tránsito:** Implementación de HTTPS / TLS 1.2+ con certificados X.509 y cabecera HSTS.
* **Fase II.E - Registro Seguro (Secure Logging):** Bitácora en SQLite (`tbl_bitacora`) con filtro automático de redacción de datos sensibles.
