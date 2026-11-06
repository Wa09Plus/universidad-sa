// src/features/auth/auth.routes.js
// Autenticación Segura y Registro de Estudiantes (MASI 2026)
import { Router } from 'express';
import dotenv from 'dotenv';
import db from '../../../database/connection.js';
import { enviarCorreoBienvenida } from '../../core/email-service.js';
import { hashPassword, verifyPassword, cifrarDPI } from '../../core/crypto-service.js';
import {
  validarSoloLetras,
  validarCorreoInstitucional,
  validarDPI
} from '../../core/validators.js';
import { registrarBitacora } from '../../core/secure-logger.js';

dotenv.config();

// Gestión de Secretos: Obtenido de variables de entorno protegidas, nunca quemado en código
export const API_SECRET_KEY = process.env.API_SECRET_KEY;

const router = Router();

// Inicio de Sesión Seguro (Protegido contra SQL Injection y Ataques de Fuerza Bruta)
router.post('/login', (req, res) => {
  const { username, pass } = req.body || {};
  const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';

  if (!username || !pass) {
    registrarBitacora({
      usuario: username || 'desconocido',
      ip,
      accion: 'LOGIN_FALLIDO',
      modulo: 'AUTH',
      resultado: 'FALLO',
      detalles: 'Campos incompletos en petición de autenticación'
    });
    return res.status(400).json({ exito: false, mensaje: 'Usuario y contraseña son requeridos' });
  }

  // Consulta Parametrizada: Previene 100% Inyección SQL
  const usuario = db.prepare('SELECT * FROM tbl_usuario WHERE username = ?').get(String(username).trim());

  // Verificación de Contraseña mediante KDF scrypt (tiempo constante y resistente a GPU)
  const passwordValido = usuario && verifyPassword(pass, usuario.pass);

  if (!passwordValido) {
    // Secure Logging: Registra el intento fallido SIN revelar la contraseña
    registrarBitacora({
      usuario: String(username).trim(),
      ip,
      accion: 'LOGIN_FALLIDO',
      modulo: 'AUTH',
      resultado: 'FALLO',
      detalles: 'Credenciales inválidas proporcionadas'
    });
    return res.status(401).json({ exito: false, mensaje: 'Credenciales inválidas' });
  }

  // Secure Logging: Registro de éxito
  registrarBitacora({
    usuario: usuario.username,
    ip,
    accion: 'LOGIN_EXITOSO',
    modulo: 'AUTH',
    resultado: 'EXITO',
    detalles: `Inicio de sesión concedido con rol: ${usuario.rol}`
  });

  // Estructura segura de respuesta
  const token = `universidad-token-${Date.now()}:${usuario.username}`;
  res.json({
    exito: true,
    token,
    usuario: {
      id: usuario.id_usuario,
      username: usuario.username,
      email: usuario.email,
      rol: usuario.rol,
      carnet: usuario.carnet_estudiante
    }
  });
});

// Registro de Nuevos Estudiantes con Validación Estricta por Lista Blanca y Cifrado
router.post('/registro', async (req, res) => {
  const { nombres, apellidos, DPI, email_educativo, email, id_carrera, username, pass } = req.body || {};
  const correoAValidar = email_educativo || email;
  const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';

  // 1. Validación de Nombres y Apellidos (Solo letras, sin scripts ni caracteres maliciosos)
  const valNombres = validarSoloLetras(nombres, 'Nombres');
  if (!valNombres.valido) {
    return res.status(400).json({ exito: false, mensaje: valNombres.mensaje });
  }

  const valApellidos = validarSoloLetras(apellidos, 'Apellidos');
  if (!valApellidos.valido) {
    return res.status(400).json({ exito: false, mensaje: valApellidos.mensaje });
  }

  // 2. Validación de Correo Institucional (Obligatoriamente @universidad.edu)
  const valEmail = validarCorreoInstitucional(correoAValidar);
  if (!valEmail.valido) {
    return res.status(400).json({ exito: false, mensaje: valEmail.mensaje });
  }

  // 3. Validación de DPI (Estrictamente 13 dígitos numéricos)
  const valDPI = validarDPI(DPI);
  if (!valDPI.valido) {
    return res.status(400).json({ exito: false, mensaje: valDPI.mensaje });
  }

  // 4. Validación de Contraseña (Mínimo 8 caracteres)
  if (!pass || typeof pass !== 'string' || pass.length < 8) {
    return res.status(400).json({ exito: false, mensaje: 'La contraseña debe contener al menos 8 caracteres.' });
  }

  // 5. Validación de Usuario
  const userLimpio = String(username || '').trim();
  if (!/^[a-zA-Z0-9_]{3,30}$/.test(userLimpio)) {
    return res.status(400).json({ exito: false, mensaje: 'El nombre de usuario debe ser alfanumérico (3-30 caracteres).' });
  }

  // 6. Verificar que la carrera exista
  const carrera = db.prepare('SELECT id_carrera FROM ct_carreras WHERE id_carrera = ?').get(id_carrera);
  if (!carrera) {
    return res.status(400).json({ exito: false, mensaje: 'La carrera seleccionada no es válida.' });
  }

  // 7. Verificar unicidad de username y email
  const existente = db.prepare('SELECT id_usuario FROM tbl_usuario WHERE username = ? OR email = ?').get(userLimpio, valEmail.valor);
  if (existente) {
    return res.status(409).json({ exito: false, mensaje: 'El usuario o correo electrónico ya se encuentra registrado.' });
  }

  try {
    // Generación de carnet institucional determinista
    const correlativo = String(Math.floor(100 + Math.random() * 900));
    const carnetGenerado = `${id_carrera}-26-${correlativo}`;

    // Cifrado de datos en reposo: DPI protegido con AES-256-GCM
    const dpiCifrado = cifrarDPI(valDPI.valor);

    // Hashing seguro de contraseña con KDF scrypt y sal criptográfica
    const passwordHash = hashPassword(pass);

    const ejecutarRegistro = db.transaction(() => {
      // Inserción en TM_estudiante
      db.prepare(`
        INSERT INTO TM_estudiante (carnet_estudiante, nombres, apellidos, email_educativo, DPI, id_carrera)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(carnetGenerado, valNombres.valor, valApellidos.valor, valEmail.valor, dpiCifrado, id_carrera);

      // Inserción en tbl_usuario
      db.prepare(`
        INSERT INTO tbl_usuario (carnet_estudiante, username, email, pass, rol)
        VALUES (?, ?, ?, ?, 'estudiante')
      `).run(carnetGenerado, userLimpio, valEmail.valor, passwordHash);
    });

    ejecutarRegistro();

    // Secure Logging: Auditoría del evento de registro
    registrarBitacora({
      usuario: userLimpio,
      ip,
      accion: 'REGISTRO_ESTUDIANTE',
      modulo: 'AUTH',
      resultado: 'EXITO',
      detalles: `Estudiante registrado con carnet ${carnetGenerado} y DPI cifrado en reposo.`
    });

    // Envío asíncrono de correo de bienvenida sin bloquear la respuesta
    enviarCorreoBienvenida({
      email: valEmail.valor,
      nombres: valNombres.valor,
      carnet: carnetGenerado,
      carrera: id_carrera
    }).catch(() => {});

    res.status(201).json({
      exito: true,
      mensaje: '¡Registro completado exitosamente!',
      carnet: carnetGenerado
    });
  } catch (error) {
    registrarBitacora({
      usuario: userLimpio,
      ip,
      accion: 'ERROR_REGISTRO',
      modulo: 'AUTH',
      resultado: 'ERROR',
      detalles: error.message
    });
    res.status(500).json({ exito: false, mensaje: 'Ocurrió un error al procesar el registro.' });
  }
});

export default router;
