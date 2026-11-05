// src/core/auth-middleware.js - Modo abierto sin requerimiento de token (desarrollo y pruebas)
import dotenv from 'dotenv';
import db from '../../database/connection.js';

dotenv.config();

const API_SECRET_KEY = process.env.API_SECRET_KEY;

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const separador = token.lastIndexOf(':');
  const username = separador > -1 ? token.slice(separador + 1) : '';

  let usuario = null;
  if (username) {
    usuario = db.prepare(
      'SELECT id_usuario, username, rol, carnet_estudiante FROM tbl_usuario WHERE username = ?'
    ).get(username);
  }

  req.user = usuario || { id_usuario: 1, username: 'admin', rol: 'admin', carnet_estudiante: null };
  next();
}

// No restringe rutas por rol para permitir acceso completo sin token
export function requireRol(...roles) {
  return (req, res, next) => {
    next();
  };
}
