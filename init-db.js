// init-db.js
// Inicialización Segura del Esquema de Base de Datos y Semillero (MASI 2026)
import db from './database/connection.js';
import { hashPassword, cifrarDPI } from './src/core/crypto-service.js';

console.log('🔄 Inicializando base de datos segura de Universidad SA...');

// Eliminación ordenada de tablas existentes
db.exec(`
  DROP TABLE IF EXISTS tbl_bitacora;
  DROP TABLE IF EXISTS tbl_comentarios;
  DROP TABLE IF EXISTS tbl_expedientes;
  DROP TABLE IF EXISTS tbl_asignaciones;
  DROP TABLE IF EXISTS tbl_usuario;
  DROP TABLE IF EXISTS TM_estudiante;
  DROP TABLE IF EXISTS tbl_cursos;
  DROP TABLE IF EXISTS ct_carreras;
`);

// Creación de las 8 tablas con relaciones e integridad referencial
db.exec(`
  -- Catálogo de Carreras
  CREATE TABLE ct_carreras (
    id_carrera TEXT PRIMARY KEY,
    nombre_carrera TEXT NOT NULL,
    jornada TEXT NOT NULL,
    sede TEXT NOT NULL
  );

  -- Catálogo de Cursos
  CREATE TABLE tbl_cursos (
    id_curso INTEGER PRIMARY KEY AUTOINCREMENT,
    id_carrera TEXT NOT NULL,
    nombre_curso TEXT NOT NULL,
    horario TEXT NOT NULL,
    catedratico TEXT NOT NULL,
    FOREIGN KEY (id_carrera) REFERENCES ct_carreras(id_carrera) ON DELETE RESTRICT
  );

  -- Tabla Maestra: Estudiantes (DPI Cifrado en Reposo con AES-256-GCM)
  CREATE TABLE TM_estudiante (
    id_estudiante INTEGER PRIMARY KEY AUTOINCREMENT,
    carnet_estudiante TEXT UNIQUE NOT NULL,
    nombres TEXT NOT NULL,
    apellidos TEXT NOT NULL,
    email_educativo TEXT UNIQUE NOT NULL,
    DPI TEXT NOT NULL,
    id_carrera TEXT NOT NULL,
    creado_el DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_carrera) REFERENCES ct_carreras(id_carrera) ON DELETE RESTRICT
  );

  -- Tabla de Usuarios (Contraseñas con KDF scrypt + Sal Criptográfica)
  CREATE TABLE tbl_usuario (
    id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
    carnet_estudiante TEXT UNIQUE,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    pass TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('admin', 'estudiante')),
    creado_el DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (carnet_estudiante) REFERENCES TM_estudiante(carnet_estudiante) ON DELETE SET NULL
  );

  -- Tabla Intermedia: Asignaciones (Múltiples cursos por estudiante)
  CREATE TABLE tbl_asignaciones (
    id_asignacion INTEGER PRIMARY KEY AUTOINCREMENT,
    carnet_estudiante TEXT NOT NULL,
    id_curso INTEGER NOT NULL,
    ciclo TEXT NOT NULL,
    año INTEGER NOT NULL,
    FOREIGN KEY (carnet_estudiante) REFERENCES TM_estudiante(carnet_estudiante) ON DELETE CASCADE,
    FOREIGN KEY (id_curso) REFERENCES tbl_cursos(id_curso) ON DELETE CASCADE
  );

  -- Expedientes Académicos (Notas oficiales administradas por el Admin)
  CREATE TABLE tbl_expedientes (
    id_expediente INTEGER PRIMARY KEY AUTOINCREMENT,
    id_asignacion INTEGER UNIQUE NOT NULL,
    calificacion INTEGER NOT NULL,
    actualizado_el DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_asignacion) REFERENCES tbl_asignaciones(id_asignacion) ON DELETE CASCADE
  );

  -- Comentarios del Portal
  CREATE TABLE tbl_comentarios (
    id_comentario INTEGER PRIMARY KEY AUTOINCREMENT,
    carnet_estudiante TEXT NOT NULL,
    autor TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (carnet_estudiante) REFERENCES TM_estudiante(carnet_estudiante) ON DELETE CASCADE
  );

  -- Bitácora de Auditoría Segura (Secure Logging)
  CREATE TABLE tbl_bitacora (
    id_log INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    usuario TEXT NOT NULL,
    ip TEXT NOT NULL,
    accion TEXT NOT NULL,
    modulo TEXT NOT NULL,
    resultado TEXT NOT NULL,
    detalles TEXT NOT NULL
  );
`);

// Inserción de datos iniciales protegidos
const poblarBase = db.transaction(() => {
  // Insertar Carreras
  const insertCar = db.prepare(`INSERT INTO ct_carreras (id_carrera, nombre_carrera, jornada, sede) VALUES (?, ?, ?, ?)`);
  insertCar.run('0904', 'Ingeniería en Sistemas de Información', 'Plan Diario / Matutina', 'Campus Central');
  insertCar.run('0902', 'Ingeniería Industrial', 'Plan Diario / Vespertina', 'Campus Central');
  insertCar.run('0901', 'Licenciatura en Administración', 'Fin de Semana', 'Sede Regional');

  // Insertar Cursos
  const insertCur = db.prepare(`INSERT INTO tbl_cursos (id_carrera, nombre_curso, horario, catedratico) VALUES (?, ?, ?, ?)`);
  const c1 = insertCur.run('0904', 'Seguridad en Aplicaciones', '07:00 - 09:00', 'Ing. Cifuentes').lastInsertRowid;
  const c2 = insertCur.run('0904', 'Bases de Datos Avanzadas', '09:00 - 11:00', 'Inga. Morales').lastInsertRowid;
  const c3 = insertCur.run('0902', 'Optimización de Procesos', '14:00 - 16:00', 'Ing. Castillo').lastInsertRowid;

  // Insertar Estudiantes (DPI cifrado con AES-256-GCM en reposo)
  const insertEst = db.prepare(`INSERT INTO TM_estudiante (carnet_estudiante, nombres, apellidos, email_educativo, DPI, id_carrera) VALUES (?, ?, ?, ?, ?, ?)`);
  insertEst.run('0904-26-001', 'Carlos', 'Mendoza', 'cmendoza@universidad.edu', cifrarDPI('3001123450101'), '0904');
  insertEst.run('0904-26-002', 'Sofia', 'Moscoso', 'smoscoso@universidad.edu', cifrarDPI('2998456780101'), '0904');
  insertEst.run('0902-26-001', 'Marcos', 'Pérez', 'mperez@universidad.edu', cifrarDPI('1890334450101'), '0902');

  // Insertar Usuarios (Contraseñas con scrypt KDF + Sal criptográfica de 128 bits)
  const insertUsu = db.prepare(`INSERT INTO tbl_usuario (carnet_estudiante, username, email, pass, rol) VALUES (?, ?, ?, ?, ?)`);
  insertUsu.run(null, 'admin', 'admin@universidad.edu', hashPassword('admin123'), 'admin');
  insertUsu.run('0904-26-001', 'cmendoza', 'cmendoza@universidad.edu', hashPassword('carlos2026'), 'estudiante');
  insertUsu.run('0904-26-002', 'smoscoso', 'smoscoso@universidad.edu', hashPassword('sofia2026'), 'estudiante');

  // Asignaciones
  const insertAsig = db.prepare(`INSERT INTO tbl_asignaciones (carnet_estudiante, id_curso, ciclo, año) VALUES (?, ?, ?, ?)`);
  const a1 = insertAsig.run('0904-26-001', c1, 'Ciclo I', 2026).lastInsertRowid;
  const a2 = insertAsig.run('0904-26-001', c2, 'Ciclo I', 2026).lastInsertRowid;
  const a3 = insertAsig.run('0904-26-002', c1, 'Ciclo I', 2026).lastInsertRowid;
  const a4 = insertAsig.run('0902-26-001', c3, 'Ciclo I', 2026).lastInsertRowid;

  // Expedientes
  const insertExp = db.prepare(`INSERT INTO tbl_expedientes (id_asignacion, calificacion) VALUES (?, ?)`);
  insertExp.run(a1, 95);
  insertExp.run(a2, 88);
  insertExp.run(a3, 74);
  insertExp.run(a4, 90);

  // Comentarios iniciales
  const insertCom = db.prepare(`INSERT INTO tbl_comentarios (carnet_estudiante, autor, mensaje) VALUES (?, ?, ?)`);
  insertCom.run('0904-26-001', 'Carlos Mendoza', '¿Cuándo se suben las actas finales del primer ciclo?');
  insertCom.run('0904-26-002', 'Sofia Moscoso', 'Revisión solicitada para la ponderación del proyecto 2.');

  // Registro inicial en Bitácora
  const insertLog = db.prepare(`INSERT INTO tbl_bitacora (usuario, ip, accion, modulo, resultado, detalles) VALUES (?, ?, ?, ?, ?, ?)`);
  insertLog.run('sistema', '127.0.0.1', 'INICIALIZACION_BD', 'SISTEMA', 'EXITO', 'Base de datos inicializada con esquema cifrado y KDF scrypt.');
});

poblarBase();
console.log('✅ Base de datos recreada exitosamente con 8 tablas seguras y protegidas.');
