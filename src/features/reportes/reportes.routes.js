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
    SELECT e.carnet_estudiante AS carnet,
           m.nombres || ' ' || m.apellidos AS estudiante,
           e.curso, e.calificacion, e.ciclo, e.año,
           CASE WHEN e.calificacion >= ${NOTA_MINIMA} THEN 'Aprobado' ELSE 'Reprobado' END AS estado
    FROM tbl_expedientes e
    JOIN TM_estudiante m ON m.carnet = e.carnet_estudiante
    ORDER BY e.año DESC, e.ciclo, m.apellidos, e.curso
  `).all();

  const resumen = db.prepare(`
    SELECT COUNT(*) AS total,
           ROUND(AVG(calificacion), 1) AS promedio,
           SUM(CASE WHEN calificacion >= ${NOTA_MINIMA} THEN 1 ELSE 0 END) AS aprobados,
           SUM(CASE WHEN calificacion < ${NOTA_MINIMA} THEN 1 ELSE 0 END) AS reprobados
    FROM tbl_expedientes
  `).get();

  const porCurso = db.prepare(`
    SELECT curso,
           COUNT(*) AS estudiantes,
           ROUND(AVG(calificacion), 1) AS promedio,
           MAX(calificacion) AS maxima,
           MIN(calificacion) AS minima
    FROM tbl_expedientes
    GROUP BY curso
    ORDER BY curso
  `).all();

  res.json({ exito: true, filas, resumen, porCurso });
});

// Reporte de estudiantes: tabla maestra con rendimiento y estado de cuenta
router.get('/estudiantes', (req, res) => {
  const filas = db.prepare(`
    SELECT m.carnet, m.nombres, m.apellidos, m.email_educativo,
           COUNT(e.id_expediente) AS cursos,
           ROUND(AVG(e.calificacion), 1) AS promedio,
           COALESCE(u.username, 'Sin cuenta') AS cuenta
    FROM TM_estudiante m
    LEFT JOIN tbl_expedientes e ON e.carnet_estudiante = m.carnet
    LEFT JOIN tbl_usuario u ON u.carnet_estudiante = m.carnet
    GROUP BY m.carnet
    ORDER BY m.apellidos, m.nombres
  `).all();

  const resumen = {
    total: filas.length,
    conCuenta: filas.filter((f) => f.cuenta !== 'Sin cuenta').length,
    sinCuenta: filas.filter((f) => f.cuenta === 'Sin cuenta').length,
    sinNotas: filas.filter((f) => f.cursos === 0).length
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

