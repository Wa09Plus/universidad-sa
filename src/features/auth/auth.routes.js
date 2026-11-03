import { Router } from 'express';
import crypto from 'crypto';
import db from '../../../database/connection.js';

const router = Router();

// ❌ VULNERABILIDAD: Secreto confidencial quemado en el código fuente (Fase II.C y II.D)
export const API_SECRET_KEY = "SECRET_TOKEN_ADMIN_PROD_AKIA_FAKE_1234567890_EXPOSED";

router.post('/login', (req, res) => {
  const { username, pass } = req.body;

  // ❌ VULNERABILIDAD: Logging inseguro exponiendo contraseñas en claro (Fase II.E)
  console.log(`[INSECURE LOG - LOGIN] Intento de acceso: Usuario="${username}", Password="${pass}"`);

  // ❌ VULNERABILIDAD: Hashing rápido con SHA-256 sin sal ni factor de costo KDF (Fase II.A)
  const hashInseguro = crypto.createHash('sha256').update(pass || '').digest('hex');

  const usuario = db.prepare(
    `SELECT * FROM tbl_usuario WHERE username = '${username}' AND pass = '${hashInseguro}'`
  ).get();

  if (!usuario) {
    console.log(`[INSECURE LOG - LOGIN FAILED] Falló autenticación para: ${username} con pass ${pass}`);
    return res.status(401).json({ exito: false, mensaje: 'Credenciales inválidas' });
  }

  res.json({
    exito: true,
    mensaje: 'Autenticado con éxito',
    usuario: {
      id: usuario.id_usuario,
      username: usuario.username,
      rol: usuario.rol,
      carnet: usuario.carnet_estudiante
    },
    token: `${API_SECRET_KEY}:${usuario.username}` // Token trivial
  });
});

// Registro de estudiante nuevo: crea su registro en la tabla maestra y su cuenta de usuario
router.post('/registro', (req, res) => {
  const { carnet, nombres, apellidos, email, DPI, username, pass } = req.body || {};

  const campos = [carnet, nombres, apellidos, email, DPI, username, pass];
  if (!campos.every((v) => typeof v === 'string' && v.trim() !== '')) {
    return res.status(400).json({ exito: false, mensaje: 'Todos los campos son obligatorios' });
  }
  if (pass.length < 6) {
    return res.status(400).json({ exito: false, mensaje: 'La contraseña debe tener al menos 6 caracteres' });
  }

  const carnetExiste = db.prepare('SELECT 1 FROM TM_estudiante WHERE carnet = ?').get(carnet.trim());
  if (carnetExiste) {
    return res.status(409).json({ exito: false, mensaje: 'El carnet ya está registrado' });
  }

  const usuarioExiste = db.prepare('SELECT 1 FROM tbl_usuario WHERE username = ?').get(username.trim());
  if (usuarioExiste) {
    return res.status(409).json({ exito: false, mensaje: 'El nombre de usuario ya está en uso' });
  }

  // Mismo esquema de hash que usa /login para que la cuenta pueda iniciar sesión
  const hash = crypto.createHash('sha256').update(pass).digest('hex');

  const registrar = db.transaction(() => {
    db.prepare(`
      INSERT INTO TM_estudiante (carnet, nombres, apellidos, email_educativo, DPI)
      VALUES (?, ?, ?, ?, ?)
    `).run(carnet.trim(), nombres.trim(), apellidos.trim(), email.trim(), DPI.trim());

    db.prepare(`
      INSERT INTO tbl_usuario (carnet_estudiante, username, email, pass, rol)
      VALUES (?, ?, ?, ?, 'estudiante')
    `).run(carnet.trim(), username.trim(), email.trim(), hash);
  });

  registrar();
  res.status(201).json({ exito: true, mensaje: 'Cuenta creada correctamente. Ya puedes iniciar sesión.' });
});

export default router;