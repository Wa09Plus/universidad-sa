// src/core/auth-middleware.js - Verificación de sesión y control de acceso por rol
import db from '../../database/connection.js';
import { API_SECRET_KEY } from '../features/auth/auth.routes.js';

// Valida el token "Bearer <secreto>:<username>" emitido por /api/auth/login
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const separador = token.lastIndexOf(':');
  const username = separador > -1 ? token.slice(separador + 1) : '';

  if (!username || token !== `${API_SECRET_KEY}:${username}`) {
    return res.status(401).json({ exito: false, mensaje: 'Sesión no válida. Inicia sesión de nuevo.' });
  }

  const usuario = db.prepare(
    'SELECT id_usuario, username, rol, carnet_estudiante FROM tbl_usuario WHERE username = ?'
  ).get(username);

  if (!usuario) {
    return res.status(401).json({ exito: false, mensaje: 'Sesión no válida. Inicia sesión de nuevo.' });
  }

  req.user = usuario;
  next();
}

// Restringe la ruta a uno o varios roles. Usar después de requireAuth.
export function requireRol(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      return res.status(403).json({ exito: false, mensaje: 'No tienes permisos para esta acción.' });
    }
    next();
  };
}

