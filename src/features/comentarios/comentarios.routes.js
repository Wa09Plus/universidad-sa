import { Router } from 'express';
import db from '../../../database/connection.js';
import { requireAuth } from '../../core/auth-middleware.js';

const router = Router();

// Listar comentarios (se entregan crudos al frontend)
router.get('/', requireAuth, (req, res) => {
  const comentarios = db.prepare('SELECT * FROM tbl_comentarios ORDER BY id_comentario DESC').all();
  res.json({ exito: true, comentarios });
});

// ❌ VULNERABILIDAD: XSS Almacenado - Inserción sin sanitización (Fase I.C)
router.post('/', requireAuth, (req, res) => {
  const { autor, mensaje } = req.body;
  // Control por rol: el estudiante publica con su propio carnet; el admin elige el estudiante
  const carnet_estudiante = req.user.rol === 'admin' ? req.body.carnet_estudiante : req.user.carnet_estudiante;

  console.log(`[INSECURE LOG - COMENTARIO] Autor="${autor}", Mensaje="${mensaje}"`);

  db.prepare(`
    INSERT INTO tbl_comentarios (carnet_estudiante, autor, mensaje)
    VALUES (?, ?, ?)
  `).run(carnet_estudiante, autor, mensaje);

  res.json({ exito: true, mensaje: 'Comentario guardado sin sanitizar' });
});

export default router;