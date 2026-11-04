import { Router } from 'express';
import db from '../../../database/connection.js';
import { requireAuth, requireRol } from '../../core/auth-middleware.js';

const router = Router();

// Todo el módulo es exclusivo del administrador
router.use(requireAuth, requireRol('admin'));

// Búsqueda de estudiantes por carnet, nombre, apellido, correo o carrera
router.get('/', (req, res) => {
  const filtro = `%${(req.query.q || '').trim()}%`;

  const estudiantes = db.prepare(`
    SELECT m.id_estudiante, m.carnet_estudiante, m.nombres, m.apellidos, m.email_educativo, m.DPI,
           m.id_carrera, ca.nombre_carrera, u.username,
           (SELECT COUNT(*) FROM tbl_asignaciones a WHERE a.carnet_estudiante = m.carnet_estudiante) AS cursos,
           (SELECT ROUND(AVG(e.calificacion), 1)
              FROM tbl_expedientes e
              JOIN tbl_asignaciones a ON a.id_asignacion = e.id_asignacion
             WHERE a.carnet_estudiante = m.carnet_estudiante) AS promedio
    FROM TM_estudiante m
    JOIN ct_carreras ca ON ca.id_carrera = m.id_carrera
    LEFT JOIN tbl_usuario u ON u.carnet_estudiante = m.carnet_estudiante
    WHERE m.carnet_estudiante LIKE ?
       OR m.nombres LIKE ?
       OR m.apellidos LIKE ?
       OR (m.nombres || ' ' || m.apellidos) LIKE ?
       OR m.email_educativo LIKE ?
       OR ca.nombre_carrera LIKE ?
    ORDER BY m.apellidos, m.nombres
  `).all(filtro, filtro, filtro, filtro, filtro, filtro);

  res.json({ exito: true, estudiantes });
});

// Detalle de un estudiante: datos maestros, carrera, cuenta de usuario y expediente
router.get('/:carnet', (req, res) => {
  const estudiante = db.prepare(`
    SELECT m.*, ca.nombre_carrera, ca.jornada, ca.sede
    FROM TM_estudiante m
    JOIN ct_carreras ca ON ca.id_carrera = m.id_carrera
    WHERE m.carnet_estudiante = ?
  `).get(req.params.carnet);

  if (!estudiante) {
    return res.status(404).json({ exito: false, mensaje: 'Estudiante no encontrado' });
  }

  const usuario = db.prepare(`
    SELECT id_usuario, username, email, rol, creado_el
    FROM tbl_usuario WHERE carnet_estudiante = ?
  `).get(req.params.carnet);

  const expedientes = db.prepare(`
    SELECT c.nombre_curso AS curso, e.calificacion, a.ciclo, a.año
    FROM tbl_asignaciones a
    JOIN tbl_cursos c ON c.id_curso = a.id_curso
    LEFT JOIN tbl_expedientes e ON e.id_asignacion = a.id_asignacion
    WHERE a.carnet_estudiante = ?
    ORDER BY a.año DESC, a.ciclo, c.nombre_curso
  `).all(req.params.carnet);

  res.json({ exito: true, estudiante, usuario: usuario || null, expedientes });
});

export default router;
