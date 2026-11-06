// src/features/comentarios/comentarios.routes.js
// Foro de consultas con mitigación de XSS Almacenado y Registro de Auditoría
import { Router } from 'express';
import db from '../../../database/connection.js';
import { sanitizarTextoPlano, validarCarnet } from '../../core/validators.js';
import { registrarBitacora } from '../../core/secure-logger.js';

const router = Router();

// Listar comentarios ordenados cronológicamente descendente
router.get('/', (req, res) => {
  try {
    const comentarios = db.prepare('SELECT * FROM tbl_comentarios ORDER BY id_comentario DESC').all();
    res.json({ exito: true, comentarios });
  } catch {
    res.status(500).json({ exito: false, mensaje: 'Error al recuperar comentarios' });
  }
});

// Creación de comentario con validación de entradas y mitigación de XSS
router.post('/', (req, res) => {
  const { carnet_estudiante, autor, mensaje } = req.body || {};
  const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';
  const usuario = autor ? String(autor).slice(0, 50) : 'anonimo';

  // Validación de longitud y contenido
  const mensajeLimpio = sanitizarTextoPlano(mensaje, 500);
  if (!mensajeLimpio) {
    return res.status(400).json({ exito: false, mensaje: 'El mensaje no puede estar vacío.' });
  }

  const valCarnet = validarCarnet(carnet_estudiante);
  if (!valCarnet.valido) {
    return res.status(400).json({ exito: false, mensaje: valCarnet.mensaje });
  }

  // Consulta parametrizada en BD
  db.prepare(`
    INSERT INTO tbl_comentarios (carnet_estudiante, autor, mensaje)
    VALUES (?, ?, ?)
  `).run(valCarnet.valor, usuario, mensajeLimpio);

  // Registro en bitácora de auditoría segura
  registrarBitacora({
    usuario,
    ip,
    accion: 'CREAR_COMENTARIO',
    modulo: 'FORO',
    resultado: 'EXITO',
    detalles: `Comentario publicado para el carnet ${valCarnet.valor}`
  });

  res.json({ exito: true, mensaje: 'Comentario publicado con éxito' });
});

export default router;
