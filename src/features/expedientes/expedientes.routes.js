import { Router } from 'express';
import db from '../../../database/connection.js';
import { requireAuth, requireRol } from '../../core/auth-middleware.js';

const router = Router();

// ❌ VULNERABILIDAD: SQL Injection directo en la búsqueda (Fase I.B)
// Devuelve todas las asignaciones del estudiante con su nota (null = pendiente de calificar)
router.get('/buscar', requireAuth, (req, res) => {
  // Control por rol: el admin consulta cualquier carnet; el estudiante solo el suyo
  const carnet = req.user.rol === 'admin' ? req.query.carnet : req.user.carnet_estudiante;

  try {
    // Concatenación cruda sin parametrizar ni validar tipo de dato
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

    // ❌ VULNERABILIDAD: Retorna DPI en texto plano (Fase II.B)
    res.json({ exito: true, datos: resultados, queryDebug: query });
  } catch (error) {
    // ❌ VULNERABILIDAD: Error 500 exponiendo traza interna y estructura de BD
    res.status(500).json({ exito: false, error: error.message, stack: error.stack });
  }
});

// Asignar o actualizar la nota de una asignación (solo admin)
router.put('/nota', requireAuth, requireRol('admin'), (req, res) => {
  const idAsignacion = Number(req.body?.id_asignacion);
  const calificacion = Number(req.body?.calificacion);

  if (!Number.isInteger(idAsignacion)) {
    return res.status(400).json({ exito: false, mensaje: 'Asignación inválida' });
  }
  if (!Number.isInteger(calificacion) || calificacion < 0 || calificacion > 100) {
    return res.status(400).json({ exito: false, mensaje: 'La nota debe ser un número entero entre 0 y 100' });
  }

  const asignacion = db.prepare('SELECT 1 FROM tbl_asignaciones WHERE id_asignacion = ?').get(idAsignacion);
  if (!asignacion) {
    return res.status(404).json({ exito: false, mensaje: 'La asignación no existe' });
  }

  db.prepare(`
    INSERT INTO tbl_expedientes (id_asignacion, calificacion)
    VALUES (?, ?)
    ON CONFLICT (id_asignacion)
    DO UPDATE SET calificacion = excluded.calificacion, actualizado_el = CURRENT_TIMESTAMP
  `).run(idAsignacion, calificacion);

  res.json({ exito: true, mensaje: 'Nota guardada' });
});

export default router;
