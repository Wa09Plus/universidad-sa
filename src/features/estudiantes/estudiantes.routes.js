import { Router } from 'express';
import db from '../../../database/connection.js';
import { requireAuth, requireRol } from '../../core/auth-middleware.js';

const router = Router();

// Todo el módulo es exclusivo del administrador
router.use(requireAuth, requireRol('admin'));

// Búsqueda de estudiantes por carnet, nombre, apellido o correo
router.get('/', (req, res) => {
  const filtro = `%${(req.query.q || '').trim()}%`;

  const estudiantes = db.prepare(`
    SELECT m.id_estudiante, m.carnet, m.nombres, m.apellidos, m.email_educativo, m.DPI,
           u.username,
           (SELECT COUNT(*) FROM tbl_expedientes e WHERE e.carnet_estudiante = m.carnet) AS cursos,
           (SELECT ROUND(AVG(e.calificacion), 1) FROM tbl_expedientes e WHERE e.carnet_estudiante = m.carnet) AS promedio
    FROM TM_estudiante m
    LEFT JOIN tbl_usuario u ON u.carnet_estudiante = m.carnet
    WHERE m.carnet LIKE ?
       OR m.nombres LIKE ?
       OR m.apellidos LIKE ?
       OR (m.nombres || ' ' || m.apellidos) LIKE ?
       OR m.email_educativo LIKE ?
    ORDER BY m.apellidos, m.nombres
  `).all(filtro, filtro, filtro, filtro, filtro);

  res.json({ exito: true, estudiantes });
});

// Detalle de un estudiante: datos maestros, cuenta de usuario y expediente
router.get('/:carnet', (req, res) => {
  const estudiante = db.prepare('SELECT * FROM TM_estudiante WHERE carnet = ?').get(req.params.carnet);

  if (!estudiante) {
    return res.status(404).json({ exito: false, mensaje: 'Estudiante no encontrado' });
  }

  const usuario = db.prepare(`
    SELECT id_usuario, username, email, rol, creado_el
    FROM tbl_usuario WHERE carnet_estudiante = ?
  `).get(req.params.carnet);

  const expedientes = db.prepare(`
    SELECT curso, calificacion, ciclo, año
    FROM tbl_expedientes WHERE carnet_estudiante = ?
    ORDER BY año DESC, ciclo, curso
  `).all(req.params.carnet);

  res.json({ exito: true, estudiante, usuario: usuario || null, expedientes });
});

export default router;

