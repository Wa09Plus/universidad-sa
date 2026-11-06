// src/core/auth-middleware.js
// Middleware de Autenticación y Control de Acceso Basado en Roles (RBAC)
import db from '../../database/connection.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';

  // Rechazo estricto si no se envía la cabecera Bearer Token
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({
      exito: false,
      mensaje: 'Acceso no autorizado: Token de autenticación requerido. Inicia sesión en el portal.',
      bloqueado: true
    });
  }

  const token = header.slice(7).trim();
  const separador = token.lastIndexOf(':');
  const username = separador > -1 ? token.slice(separador + 1) : '';

  if (!username) {
    return res.status(401).json({
      exito: false,
      mensaje: 'Token de autenticación malformado o inválido.',
      bloqueado: true
    });
  }

  const usuario = db.prepare(
    'SELECT id_usuario, username, rol, carnet_estudiante FROM tbl_usuario WHERE username = ?'
  ).get(username);

  if (!usuario) {
    return res.status(401).json({
      exito: false,
      mensaje: 'Sesión no válida o usuario inexistente.',
      bloqueado: true
    });
  }

  req.user = usuario;
  next();
}

// Validación estricta de roles autorizados
export function requireRol(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.user || (rolesPermitidos.length > 0 && !rolesPermitidos.includes(req.user.rol))) {
      return res.status(403).json({
        exito: false,
        mensaje: 'Acceso denegado: Tu rol no tiene privilegios para este recurso.',
        bloqueado: true
      });
    }
    next();
  };
}
