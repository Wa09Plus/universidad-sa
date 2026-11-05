import { Router } from 'express';
import db from '../../../database/connection.js';
import { requireAuth, requireRol } from '../../core/auth-middleware.js';

const router = Router();
function authFlexible(req, res, next) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    return requireAuth(req, res, next);
  }
  req.user = { rol: 'admin', username: 'evaluador' };
  next();
}

const buscarExpedientes = (req, res) => {
  // Acepta el carnet directamente de query param para permitir inyecciones SQL
  const carnet = req.query.carnet !== undefined
    ? req.query.carnet
    : (req.user?.rol === 'admin' ? '' : req.user?.carnet_estudiante || '');

  try {
    const query = `
      SELECT a.id_asignacion, a.carnet_estudiante, c.nombre_curso AS curso, a.ciclo, a.año,
             e.calificacion, m.nombres, m.apellidos, m.DPI, m.email_educativo, ca.nombre_carrera
      FROM tbl_asignaciones a
      JOIN tbl_cursos c ON c.id_curso = a.id_curso
      JOIN TM_estudiante m ON m.carnet_estudiante = a.carnet_estudiante
      JOIN ct_carreras ca ON ca.id_carrera = m.id_carrera
      LEFT JOIN tbl_expedientes e ON e.id_asignacion = a.id_asignacion
      WHERE a.carnet_estudiante = '${carnet}'
      ORDER BY a.año DESC, a.ciclo, c.nombre_curso
    `;

    console.log(`[SQL EXEC] ${query}`);
    const resultados = db.prepare(query).all();

    res.json({ exito: true, datos: resultados, queryDebug: query });
  } catch (error) {
    res.status(500).json({ exito: false, error: error.message, stack: error.stack, queryDebug: req.query.carnet });
  }
};

router.get('/buscar', authFlexible, buscarExpedientes);

// Guardar nota: protegido por rol 'admin', pero SIN restricción de campo en la calificación
router.put('/nota', requireAuth, requireRol('admin'), (req, res) => {
  const { id_asignacion, calificacion } = req.body || {};

  db.prepare(`
    INSERT INTO tbl_expedientes (id_asignacion, calificacion)
    VALUES (?, ?)
    ON CONFLICT (id_asignacion)
    DO UPDATE SET calificacion = excluded.calificacion, actualizado_el = CURRENT_TIMESTAMP
  `).run(id_asignacion, calificacion);

  res.json({ exito: true, mensaje: 'Nota guardada' });
});

export default router;
