// init-db.js
import db from './database/connection.js';

console.log('Reseteando esquema relacional en SQLite...');

// 1. Eliminar tablas previas (en orden inverso por las FK)
db.exec(`
  DROP TABLE IF EXISTS tbl_bitacora;
  DROP TABLE IF EXISTS tbl_comentarios;
  DROP TABLE IF EXISTS tbl_expedientes;
  DROP TABLE IF EXISTS tbl_usuario;
  DROP TABLE IF EXISTS TM_estudiante;
`);

// 2. DDL: Creación limpia de tus 4 tablas
db.exec(`
  -- Tabla Maestra
  CREATE TABLE TM_estudiante (
    id_estudiante INTEGER PRIMARY KEY AUTOINCREMENT,
    carnet TEXT UNIQUE NOT NULL,
    nombres TEXT NOT NULL,
    apellidos TEXT NOT NULL,
    email_educativo TEXT NOT NULL,
    DPI TEXT NOT NULL
  );

  -- Tabla de Usuarios
  CREATE TABLE tbl_usuario (
    id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
    carnet_estudiante TEXT UNIQUE NULL,
    username TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    pass TEXT NOT NULL,
    rol TEXT NOT NULL DEFAULT 'estudiante',
    creado_el DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (carnet_estudiante) REFERENCES TM_estudiante(carnet) ON DELETE SET NULL
  );

  -- Expedientes Académicos (1:N)
  CREATE TABLE tbl_expedientes (
    id_expediente INTEGER PRIMARY KEY AUTOINCREMENT,
    carnet_estudiante TEXT NOT NULL,
    curso TEXT NOT NULL,
    calificacion INTEGER NOT NULL,
    ciclo TEXT NOT NULL,
    año INTEGER NOT NULL,
    FOREIGN KEY (carnet_estudiante) REFERENCES TM_estudiante(carnet) ON DELETE CASCADE
  );

  -- Comentarios del Portal (1:N)
  CREATE TABLE tbl_comentarios (
    id_comentario INTEGER PRIMARY KEY AUTOINCREMENT,
    carnet_estudiante TEXT NOT NULL,
    autor TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (carnet_estudiante) REFERENCES TM_estudiante(carnet) ON DELETE CASCADE
  );
`);

console.log('🌱 Sembrando datos iniciales...');

const insertEstudiante = db.prepare(`
  INSERT INTO TM_estudiante (carnet, nombres, apellidos, email_educativo, DPI)
  VALUES (?, ?, ?, ?, ?)
`);

const insertUsuario = db.prepare(`
  INSERT INTO tbl_usuario (carnet_estudiante, username, email, pass, rol)
  VALUES (?, ?, ?, ?, ?)
`);

const insertExpediente = db.prepare(`
  INSERT INTO tbl_expedientes (carnet_estudiante, curso, calificacion, ciclo, año)
  VALUES (?, ?, ?, ?, ?)
`);

const insertComentario = db.prepare(`
  INSERT INTO tbl_comentarios (carnet_estudiante, autor, mensaje)
  VALUES (?, ?, ?)
`);

const poblarBaseDeDatos = db.transaction(() => {
  insertEstudiante.run('2026001', 'Carlos', 'Mendoza', 'cmendoza@nuestrauni.edu', '3001123450101');
  insertEstudiante.run('2026002', 'Sofia', 'Moscoso', 'smoscoso@nuestrauni.edu', '2998456780101');
  insertEstudiante.run('2026003', 'Marcos', 'Pérez', 'mperez@nuestrauni.edu', '1890334450101');

  insertUsuario.run(null, 'admin', 'admin@nuestrauni.edu', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'admin');
  insertUsuario.run('2026001', 'cmendoza', 'cmendoza@nuestrauni.edu', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'estudiante');
  insertUsuario.run('2026002', 'salvarez', 'salvarez@nuestrauni.edu', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'estudiante');

  insertExpediente.run('2026001', 'Seguridad en Aplicaciones', 95, 'Ciclo I', 2026);
  insertExpediente.run('2026001', 'Bases de Datos Avanzadas', 88, 'Ciclo I', 2026);
  insertExpediente.run('2026002', 'Seguridad en Aplicaciones', 74, 'Ciclo I', 2026);
  insertExpediente.run('2026003', 'Auditoría Forense', 91, 'Ciclo I', 2026);

  insertComentario.run('2026001', 'Carlos Mendoza', '¿Cuándo se suben las actas finales del primer ciclo?');
  insertComentario.run('2026002', 'Sofia Moscoso', 'Revisión solicitada para la ponderación del proyecto 2.');
});

poblarBaseDeDatos();

console.log('✅ Base de datos reseteada y creada con 4 tablas exactas.');