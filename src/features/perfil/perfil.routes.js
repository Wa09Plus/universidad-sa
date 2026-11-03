import { Router } from 'express';
import db from '../../../database/connection.js';
import { requireAuth } from '../../core/auth-middleware.js';

const router = Router();

// Información del usuario (tbl_usuario) y su estudiante vinculado (TM_estudiante)
router.get('/:idUsuario', requireAuth, (req, res) => {
  // Control por rol: un estudiante solo puede ver su propio perfil
  if (req.user.rol !== 'admin' && String(req.user.id_usuario) !== req.params.idUsuario) {
    return res.status(403).json({ exito: false, mensaje: 'No tienes permisos para ver este perfil.' });
  }

  const usuario = db.prepare(`
    SELECT id_usuario, carnet_estudiante, username, email, rol, creado_el
    FROM tbl_usuario
    WHERE id_usuario = ?
  `).get(req.params.idUsuario);

  if (!usuario) {
    return res.status(404).json({ exito: false, mensaje: 'Usuario no encontrado' });
  }

  const estudiante = usuario.carnet_estudiante
    ? db.prepare(`
        SELECT id_estudiante, carnet, nombres, apellidos, email_educativo, DPI
        FROM TM_estudiante
        WHERE carnet = ?
      `).get(usuario.carnet_estudiante)
    : null;

  res.json({ exito: true, usuario, estudiante: estudiante || null });
});

export default router;
