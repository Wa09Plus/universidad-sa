import { Router } from 'express';
import db from '../../../database/connection.js';
import { requireAuth, requireRol } from '../../core/auth-middleware.js';

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

export default router;
