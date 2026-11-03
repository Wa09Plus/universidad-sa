import { Router } from 'express';
import db from '../../../database/connection.js';
import { requireAuth } from '../../core/auth-middleware.js';

const router = Router();

// ❌ VULNERABILIDAD: SQL Injection directo en la búsqueda (Fase I.B)
router.get('/buscar', requireAuth, (req, res) => {
  // Control por rol: el admin consulta cualquier carnet; el estudiante solo el suyo
  const carnet = req.user.rol === 'admin' ? req.query.carnet : req.user.carnet_estudiante;

  try {
    // Concatenación cruda sin parametrizar ni validar tipo de dato
    const query = `
      SELECT e.carnet_estudiante, e.curso, e.calificacion, e.ciclo, e.año,
             m.nombres, m.apellidos, m.DPI, m.email_educativo
      FROM tbl_expedientes e
      JOIN TM_estudiante m ON e.carnet_estudiante = m.carnet
      WHERE e.carnet_estudiante = '${carnet}'
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

export default router;