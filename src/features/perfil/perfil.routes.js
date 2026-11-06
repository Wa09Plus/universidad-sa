// src/features/perfil/perfil.routes.js
// Visualización de Perfil con Descifrado Seguro de Datos Sensibles (DPI)
import { Router } from 'express';
import db from '../../../database/connection.js';
import { requireAuth } from '../../core/auth-middleware.js';
import { descifrarDPI } from '../../core/crypto-service.js';
import { registrarBitacora } from '../../core/secure-logger.js';

const router = Router();

// Información del usuario (tbl_usuario) y su estudiante vinculado (TM_estudiante)
router.get('/:idUsuario', requireAuth, (req, res) => {
  const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';
  const idParam = String(req.params.idUsuario);

  // Control por rol: el estudiante solo puede ver su propio perfil
  if (req.user.rol !== 'admin' && String(req.user.id_usuario) !== idParam) {
    registrarBitacora({
      usuario: req.user.username,
      ip,
      accion: 'ACCESO_PERFIL_DENEGADO',
      modulo: 'PERFIL',
      resultado: 'FALLO',
      detalles: `Intento no autorizado de acceder al perfil ID ${idParam}`
    });
    return res.status(403).json({ exito: false, mensaje: 'No tienes permisos para ver este perfil.' });
  }

  const usuario = db.prepare(`
    SELECT id_usuario, carnet_estudiante, username, email, rol, creado_el
    FROM tbl_usuario
    WHERE id_usuario = ?
  `).get(idParam);

  if (!usuario) {
    return res.status(404).json({ exito: false, mensaje: 'Usuario no encontrado' });
  }

  const estudiante = usuario.carnet_estudiante
    ? db.prepare(`
        SELECT m.id_estudiante, m.carnet_estudiante, m.nombres, m.apellidos, m.email_educativo, m.DPI,
               m.id_carrera, ca.nombre_carrera, ca.jornada, ca.sede
        FROM TM_estudiante m
        JOIN ct_carreras ca ON ca.id_carrera = m.id_carrera
        WHERE m.carnet_estudiante = ?
      `).get(usuario.carnet_estudiante)
    : null;

  // Descifrado seguro del DPI para el titular de la cuenta
  if (estudiante && estudiante.DPI) {
    estudiante.DPI = descifrarDPI(estudiante.DPI);
  }

  registrarBitacora({
    usuario: req.user.username,
    ip,
    accion: 'CONSULTA_PERFIL',
    modulo: 'PERFIL',
    resultado: 'EXITO',
    detalles: `Consulta de perfil propio/autorizado ID ${idParam}`
  });

  res.json({ exito: true, usuario, estudiante: estudiante || null });
});

export default router;
