import { Router } from 'express';
import db from '../../../database/connection.js';
import { requireAuth, requireRol } from '../../core/auth-middleware.js';

const router = Router();

// ❌ VULNERABILIDAD: SQL Injection directo en la búsqueda (Fase I.B)
router.get('/buscar', requireAuth, (req, res) => {
  // Admin consulta cualquier carnet; estudiante solo el suyo
  const carnet = req.user.rol === 'admin' ? req.query.carnet : req.user.carnet_estudiante;

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

    // ❌ VULNERABILIDAD: Retorna DPI en texto plano
    res.json({ exito: true, datos: resultados, queryDebug: query });
  } catch (error) {
    // ❌ VULNERABILIDAD: Error 500 exponiendo traza interna y estructura de BD
    res.status(500).json({ exito: false, error: error.message, stack: error.stack });
  }
});

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
