// src/features/reportes/reportes.routes.js
// Generación y Compresión Segura de Reportes
import { Router } from 'express';
import { execFile } from 'node:child_process';
import db from '../../../database/connection.js';
import { requireAuth, requireRol } from '../../core/auth-middleware.js';
import { registrarBitacora } from '../../core/secure-logger.js';

const router = Router();
const NOTA_MINIMA = 61;

// Todo el módulo es exclusivo del administrador
router.use(requireAuth, requireRol('admin'));

// Reporte de notas: todas las calificaciones + resumen general y por curso
router.get('/notas', (req, res) => {
  const filas = db.prepare(`
    SELECT a.carnet_estudiante AS carnet,
           m.nombres || ' ' || m.apellidos AS estudiante,
           ca.nombre_carrera AS carrera,
           c.nombre_curso AS curso, e.calificacion, a.ciclo, a.año,
           CASE WHEN e.calificacion >= ${NOTA_MINIMA} THEN 'Aprobado' ELSE 'Reprobado' END AS estado
    FROM tbl_expedientes e
    JOIN tbl_asignaciones a ON a.id_asignacion = e.id_asignacion
    JOIN tbl_cursos c ON c.id_curso = a.id_curso
    JOIN TM_estudiante m ON m.carnet_estudiante = a.carnet_estudiante
    JOIN ct_carreras ca ON ca.id_carrera = m.id_carrera
    ORDER BY a.año DESC, a.ciclo, m.apellidos, c.nombre_curso
  `).all();

  const resumen = db.prepare(`
    SELECT COUNT(*) AS total,
           ROUND(AVG(calificacion), 1) AS promedio,
           SUM(CASE WHEN calificacion >= ${NOTA_MINIMA} THEN 1 ELSE 0 END) AS aprobados,
           SUM(CASE WHEN calificacion < ${NOTA_MINIMA} THEN 1 ELSE 0 END) AS reprobados
    FROM tbl_expedientes
  `).get();

  const porCurso = db.prepare(`
    SELECT c.nombre_curso AS curso,
           COUNT(*) AS estudiantes,
           ROUND(AVG(e.calificacion), 1) AS promedio,
           MAX(e.calificacion) AS maxima,
           MIN(e.calificacion) AS minima
    FROM tbl_expedientes e
    JOIN tbl_asignaciones a ON a.id_asignacion = e.id_asignacion
    JOIN tbl_cursos c ON c.id_curso = a.id_curso
    GROUP BY c.id_curso
    ORDER BY c.nombre_curso
  `).all();

  res.json({ exito: true, filas, resumen, porCurso });
});

// Reporte de estudiantes: tabla maestra con carrera, rendimiento y estado de cuenta
router.get('/estudiantes', (req, res) => {
  const filas = db.prepare(`
    SELECT m.carnet_estudiante AS carnet, m.nombres, m.apellidos, m.email_educativo,
           ca.nombre_carrera AS carrera,
           COUNT(a.id_asignacion) AS cursos,
           COUNT(e.id_expediente) AS calificados,
           ROUND(AVG(e.calificacion), 1) AS promedio,
           COALESCE(u.username, 'Sin cuenta') AS cuenta
    FROM TM_estudiante m
    JOIN ct_carreras ca ON ca.id_carrera = m.id_carrera
    LEFT JOIN tbl_asignaciones a ON a.carnet_estudiante = m.carnet_estudiante
    LEFT JOIN tbl_expedientes e ON e.id_asignacion = a.id_asignacion
    LEFT JOIN tbl_usuario u ON u.carnet_estudiante = m.carnet_estudiante
    GROUP BY m.carnet_estudiante
    ORDER BY m.apellidos, m.nombres
  `).all();

  const resumen = {
    total: filas.length,
    conCuenta: filas.filter((f) => f.cuenta !== 'Sin cuenta').length,
    sinCuenta: filas.filter((f) => f.cuenta === 'Sin cuenta').length,
    sinCursos: filas.filter((f) => f.cursos === 0).length
  };

  res.json({ exito: true, filas, resumen });
});

// Reporte de cursos: catálogo con asignados, calificados y promedio
router.get('/cursos', (req, res) => {
  const filas = db.prepare(`
    SELECT c.id_curso, c.nombre_curso AS curso, ca.nombre_carrera AS carrera,
           c.horario, c.catedratico,
           COUNT(a.id_asignacion) AS asignados,
           COUNT(e.id_expediente) AS calificados,
           ROUND(AVG(e.calificacion), 1) AS promedio
    FROM tbl_cursos c
    JOIN ct_carreras ca ON ca.id_carrera = c.id_carrera
    LEFT JOIN tbl_asignaciones a ON a.id_curso = c.id_curso
    LEFT JOIN tbl_expedientes e ON e.id_asignacion = a.id_asignacion
    GROUP BY c.id_curso
    ORDER BY ca.nombre_carrera, c.nombre_curso
  `).all();

  const resumen = {
    total: filas.length,
    asignaciones: filas.reduce((s, f) => s + f.asignados, 0),
    pendientes: filas.reduce((s, f) => s + (f.asignados - f.calificados), 0),
    sinAlumnos: filas.filter((f) => f.asignados === 0).length
  };

  res.json({ exito: true, filas, resumen });
});

// Reporte de usuarios: cuentas registradas (sin contraseñas)
router.get('/usuarios', (req, res) => {
  const filas = db.prepare(`
    SELECT id_usuario, username, email, rol,
           COALESCE(carnet_estudiante, '—') AS carnet, creado_el
    FROM tbl_usuario
    ORDER BY rol, username
  `).all();

  const resumen = {
    total: filas.length,
    admins: filas.filter((f) => f.rol === 'admin').length,
    estudiantes: filas.filter((f) => f.rol === 'estudiante').length
  };

  res.json({ exito: true, filas, resumen });
});

// Lista blanca (Whitelist) estricta de rutas permitidas para compresión
const ORIGENES_PERMITIDOS = {
  'database': 'database',
  'cursos': 'src/features/cursos',
  'reportes': 'src/features/reportes'
};

// Mitigación de Inyección de Comandos en Sistema Operativo (Fase I.D)
// 1. Reemplazo de exec() por execFile() sin invocación de shell (shell: false).
// 2. Parámetros controlados en un array de argumentos (no concatenación de cadenas).
// 3. Validación por lista blanca estricta del origen y regex del destino.
// 4. Registro seguro de auditoría en tbl_bitacora.
router.all('/comprimir', (req, res) => {
  const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';
  const usuario = req.user?.username || 'admin';
  const archivoSolicitado = String(req.query.archivo || req.body?.archivo || 'database').trim();
  const destinoSolicitado = String(req.query.destino || req.body?.destino || 'reportes_export.tar').trim();

  // 1. Control por lista blanca del archivo u origen
  const rutaOrigen = ORIGENES_PERMITIDOS[archivoSolicitado];
  if (!rutaOrigen) {
    registrarBitacora({
      usuario,
      ip,
      accion: 'COMPRESION_RECHAZADA',
      modulo: 'REPORTES',
      resultado: 'FALLO',
      detalles: `Intento de acceso a recurso fuera de whitelist: ${archivoSolicitado}`
    });
    return res.status(400).json({
      exito: false,
      mensaje: `Origen no permitido. Opciones autorizadas: ${Object.keys(ORIGENES_PERMITIDOS).join(', ')}`,
      error: 'Parámetro no autorizado'
    });
  }

  // 2. Validación estricta del nombre del archivo de destino (previene Path Traversal y caracteres shell)
  const regexDestino = /^[a-zA-Z0-9_-]+\.(tar|zip)$/;
  if (!regexDestino.test(destinoSolicitado)) {
    registrarBitacora({
      usuario,
      ip,
      accion: 'COMPRESION_RECHAZADA',
      modulo: 'REPORTES',
      resultado: 'FALLO',
      detalles: `Nombre de archivo destino inválido: ${destinoSolicitado}`
    });
    return res.status(400).json({
      exito: false,
      mensaje: 'El nombre del archivo destino solo puede contener caracteres alfanuméricos y extensión .tar o .zip',
      error: 'Destino inválido'
    });
  }

  // 3. Ejecución segura mediante execFile:
  // - shell: false garantiza que NO se invoque /bin/sh ni cmd.exe.
  // - Los argumentos viajan en un array estricto, imposibilitando inyecciones de comandos tipo & ; | $(...)
  const args = ['-cf', destinoSolicitado, rutaOrigen];

  execFile('tar', args, { timeout: 10000, maxBuffer: 1024 * 500, shell: false }, (error, stdout, stderr) => {
    if (error) {
      registrarBitacora({
        usuario,
        ip,
        accion: 'COMPRESION_FALLIDA',
        modulo: 'REPORTES',
        resultado: 'ERROR',
        detalles: `Fallo al comprimir ${archivoSolicitado}: ${error.message}`
      });
      return res.status(500).json({
        exito: false,
        mensaje: 'Error durante el proceso de compresión',
        error: error.message
      });
    }

    registrarBitacora({
      usuario,
      ip,
      accion: 'COMPRESION_EXITOSA',
      modulo: 'REPORTES',
      resultado: 'EXITO',
      detalles: `Compresión segura de ${archivoSolicitado} a ${destinoSolicitado}`
    });

    res.json({
      exito: true,
      mensaje: 'Reporte comprimido con éxito de forma segura',
      destino: destinoSolicitado,
      salida: stdout || stderr || 'Archivo generado correctamente en el servidor.'
    });
  });
});

export default router;
