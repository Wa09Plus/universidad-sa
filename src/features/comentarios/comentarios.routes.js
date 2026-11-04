import { Router } from 'express';
import db from '../../../database/connection.js';

const router = Router();

// Listar comentarios sin autenticación ni sanitización
router.get('/', (req, res) => {
  const comentarios = db.prepare('SELECT * FROM tbl_comentarios ORDER BY id_comentario DESC').all();
  res.json({ exito: true, comentarios });
});

// ❌ VULNERABILIDAD: XSS Almacenado - Inserción sin sanitización
router.post('/', (req, res) => {
  const { carnet_estudiante, autor, mensaje } = req.body || {};

  console.log(`[INSECURE LOG - COMENTARIO] Autor="${autor}", Mensaje="${mensaje}"`);

  db.prepare(`
    INSERT INTO tbl_comentarios (carnet_estudiante, autor, mensaje)
    VALUES (?, ?, ?)
  `).run(carnet_estudiante, autor, mensaje);

  res.json({ exito: true, mensaje: 'Comentario guardado sin sanitizar' });
});

export default router;
