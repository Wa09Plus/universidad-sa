// init-db.js
import db from './database/connection.js';

console.log('⚡ Reseteando base de datos con nueva arquitectura de 7 tablas (Modo Inseguro)...');

// 1. Eliminar tablas previas (en orden inverso de dependencias)
db.exec(`
  DROP TABLE IF EXISTS tbl_comentarios;
  DROP TABLE IF EXISTS tbl_expedientes;
  DROP TABLE IF EXISTS tbl_asignaciones;
  DROP TABLE IF EXISTS tbl_usuario;
  DROP TABLE IF EXISTS TM_estudiante;
  DROP TABLE IF EXISTS tbl_cursos;
  DROP TABLE IF EXISTS ct_carreras;
`);

// 2. Creación de tablas
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
    FOREIGN KEY (id_carrera) REFERENCES ct_carreras(id_carrera) ON DELETE CASCADE
  );

  -- Tabla Maestra de Estudiantes (Carnet = carrera-año-correlativo, ej. 0904-26-001)
  CREATE TABLE TM_estudiante (
    id_estudiante INTEGER PRIMARY KEY AUTOINCREMENT,
    carnet_estudiante TEXT UNIQUE NOT NULL,
    nombres TEXT NOT NULL,
    apellidos TEXT NOT NULL,
    email_educativo TEXT NOT NULL,
    DPI TEXT NOT NULL,
    id_carrera TEXT NOT NULL,
    FOREIGN KEY (id_carrera) REFERENCES ct_carreras(id_carrera) ON DELETE RESTRICT
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
    FOREIGN KEY (carnet_estudiante) REFERENCES TM_estudiante(carnet_estudiante) ON DELETE SET NULL
  );

  -- Tabla Intermedia: Asignaciones (Múltiples cursos por estudiante)
  -- Una fila por cada curso que lleva un estudiante en un ciclo/año.
  -- El UNIQUE evita asignar el mismo curso dos veces en el mismo ciclo.
  CREATE TABLE tbl_asignaciones (
    id_asignacion INTEGER PRIMARY KEY AUTOINCREMENT,
    carnet_estudiante TEXT NOT NULL,
    id_curso INTEGER NOT NULL,
    ciclo TEXT NOT NULL,
    año INTEGER NOT NULL,
    UNIQUE (carnet_estudiante, id_curso, ciclo, año),
    FOREIGN KEY (carnet_estudiante) REFERENCES TM_estudiante(carnet_estudiante) ON DELETE CASCADE,
    FOREIGN KEY (id_curso) REFERENCES tbl_cursos(id_curso) ON DELETE CASCADE
  );

  -- Expedientes Académicos (Notas oficiales administradas por el Admin)
  -- Cada nota pertenece a UNA asignación: solo se califica lo que el estudiante tiene asignado.
  -- Estudiante, curso, ciclo y año se obtienen a través de la asignación (sin duplicar datos).
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
`);

console.log('🌱 Sembrando catálogos y datos iniciales en texto plano...');

const poblarBase = db.transaction(() => {
  // Insertar Carreras (Ej. 0904 = Sistemas)
  const insertCarrera = db.prepare(`INSERT INTO ct_carreras (id_carrera, nombre_carrera, jornada, sede) VALUES (?, ?, ?, ?)`);
  insertCarrera.run('0904', 'Ingeniería en Sistemas de Información', 'Fin de Semana', 'Sede Central');
  insertCarrera.run('0902', 'Ingeniería Industrial', 'Diaria', 'Sede Central');

  // Insertar Cursos
  const insertCurso = db.prepare(`INSERT INTO tbl_cursos (id_carrera, nombre_curso, horario, catedratico) VALUES (?, ?, ?, ?)`);
  const c1 = insertCurso.run('0904', 'Seguridad en Aplicaciones', '07:00-09:00', 'Ing. Roberto Carlos').lastInsertRowid;
  const c2 = insertCurso.run('0904', 'Bases de Datos Avanzadas', '09:00-11:00', 'Inga. Maria Fernanda').lastInsertRowid;
  const c3 = insertCurso.run('0902', 'Investigación de Operaciones', '07:00-09:00', 'Ing. Mario López').lastInsertRowid;
  insertCurso.run('0904', 'Programación Web', '11:00-13:00', 'Ing. Luis Herrera');
  insertCurso.run('0902', 'Estadística Industrial', '09:00-11:00', 'Inga. Ana Morales');

  // Insertar Estudiantes (Carnet = carrera-año-correlativo)
  const insertEst = db.prepare(`INSERT INTO TM_estudiante (carnet_estudiante, nombres, apellidos, email_educativo, DPI, id_carrera) VALUES (?, ?, ?, ?, ?, ?)`);
  insertEst.run('0904-26-001', 'Carlos', 'Mendoza', 'cmendoza@universidad.edu', '3001123450101', '0904');
  insertEst.run('0904-26-002', 'Sofia', 'Alvarez', 'salvarez@universidad.edu', '2998456780101', '0904');
  insertEst.run('0902-26-001', 'Marcos', 'Pérez', 'mperez@universidad.edu', '1890334450101', '0902');

  // Insertar Usuarios (Contraseñas expuestas)
  const insertUsu = db.prepare(`INSERT INTO tbl_usuario (carnet_estudiante, username, email, pass, rol) VALUES (?, ?, ?, ?, ?)`);
  insertUsu.run(null, 'admin', 'admin@universidad.edu', 'admin123', 'admin');
  insertUsu.run('0904-26-001', 'cmendoza', 'cmendoza@universidad.edu', 'carlos2026', 'estudiante');
  insertUsu.run('0904-26-002', 'salvarez', 'salvarez@universidad.edu', 'sofia2026', 'estudiante');

  // Asignaciones (Múltiples cursos por alumno)
  const insertAsig = db.prepare(`INSERT INTO tbl_asignaciones (carnet_estudiante, id_curso, ciclo, año) VALUES (?, ?, ?, ?)`);
  const a1 = insertAsig.run('0904-26-001', c1, 'Ciclo I', 2026).lastInsertRowid;
  const a2 = insertAsig.run('0904-26-001', c2, 'Ciclo I', 2026).lastInsertRowid;
  const a3 = insertAsig.run('0904-26-002', c1, 'Ciclo I', 2026).lastInsertRowid;
  insertAsig.run('0902-26-001', c3, 'Ciclo I', 2026); // Pendiente de calificar

  // Expedientes (El admin ya calificó algunos cursos)
  const insertExp = db.prepare(`INSERT INTO tbl_expedientes (id_asignacion, calificacion) VALUES (?, ?)`);
  insertExp.run(a1, 95);
  insertExp.run(a2, 88);
  insertExp.run(a3, 74);

  // Comentarios
  const insertCom = db.prepare(`INSERT INTO tbl_comentarios (carnet_estudiante, autor, mensaje) VALUES (?, ?, ?)`);
  insertCom.run('0904-26-001', 'Carlos Mendoza', '¿Cuándo se suben las actas finales?');
});

poblarBase();
console.log('✅ Base de datos recreada con éxito (7 tablas operativas).');
