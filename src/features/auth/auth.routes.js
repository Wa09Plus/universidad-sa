import { Router } from 'express';
import db from '../../../database/connection.js';

const router = Router();

// ❌ VULNERABILIDAD: Secreto confidencial quemado en el código fuente (Fase II.C y II.D)
export const API_SECRET_KEY = "SECRET_TOKEN_ADMIN_PROD_AKIA_FAKE_1234567890_EXPOSED";

router.post('/login', (req, res) => {
  const { username, pass } = req.body;

  // ❌ VULNERABILIDAD: Logging inseguro exponiendo contraseñas en claro (Fase II.E)
  console.log(`[INSECURE LOG - LOGIN] Intento de acceso: Usuario="${username}", Password="${pass}"`);

  // ❌ VULNERABILIDAD: Contraseñas almacenadas y comparadas en texto plano, sin hash (Fase II.A)
  const usuario = db.prepare(
    `SELECT * FROM tbl_usuario WHERE username = '${username}' AND pass = '${pass}'`
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

// Registro de estudiante nuevo: elige su carrera y el sistema genera el carnet
// con el formato carrera-año-correlativo (ej. 0904-26-003)
router.post('/registro', (req, res) => {
  const { id_carrera, nombres, apellidos, email, DPI, username, pass } = req.body || {};

  const campos = [id_carrera, nombres, apellidos, email, DPI, username, pass];
  if (!campos.every((v) => typeof v === 'string' && v.trim() !== '')) {
    return res.status(400).json({ exito: false, mensaje: 'Todos los campos son obligatorios' });
  }
  if (pass.length < 6) {
    return res.status(400).json({ exito: false, mensaje: 'La contraseña debe tener al menos 6 caracteres' });
  }

  const carrera = db.prepare('SELECT id_carrera FROM ct_carreras WHERE id_carrera = ?').get(id_carrera);
  if (!carrera) {
    return res.status(400).json({ exito: false, mensaje: 'La carrera seleccionada no existe' });
  }

  const usuarioExiste = db.prepare('SELECT 1 FROM tbl_usuario WHERE username = ?').get(username.trim());
  if (usuarioExiste) {
    return res.status(409).json({ exito: false, mensaje: 'El nombre de usuario ya está en uso' });
  }

  const año = String(new Date().getFullYear()).slice(-2);
  const prefijo = `${id_carrera}-${año}-`;

  const registrar = db.transaction(() => {
    // Siguiente correlativo disponible para esa carrera y año
    const { ultimo } = db.prepare(`
      SELECT MAX(CAST(substr(carnet_estudiante, ?) AS INTEGER)) AS ultimo
      FROM TM_estudiante
      WHERE carnet_estudiante LIKE ?
    `).get(prefijo.length + 1, `${prefijo}%`);

    const carnet = `${prefijo}${String((ultimo || 0) + 1).padStart(3, '0')}`;

    db.prepare(`
      INSERT INTO TM_estudiante (carnet_estudiante, nombres, apellidos, email_educativo, DPI, id_carrera)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(carnet, nombres.trim(), apellidos.trim(), email.trim(), DPI.trim(), id_carrera);

    // Se guarda en texto plano para ser consistente con /login
    db.prepare(`
      INSERT INTO tbl_usuario (carnet_estudiante, username, email, pass, rol)
      VALUES (?, ?, ?, ?, 'estudiante')
    `).run(carnet, username.trim(), email.trim(), pass);

    return carnet;
  });

  const carnet = registrar();
  res.status(201).json({
    exito: true,
    carnet,
    mensaje: `Cuenta creada correctamente. Tu carnet es ${carnet}. Ya puedes iniciar sesión.`
  });
});

export default router;
