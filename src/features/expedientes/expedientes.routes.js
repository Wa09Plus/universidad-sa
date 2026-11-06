// src/features/expedientes/expedientes.routes.js
// Expedientes Académicos con Consultas Parametrizadas y Validación Estricta
import { Router } from 'express';
import db from '../../../database/connection.js';
import { requireAuth, requireRol } from '../../core/auth-middleware.js';
import { validarCalificacion, validarCarnet } from '../../core/validators.js';
import { descifrarDPI, enmascararDPI } from '../../core/crypto-service.js';
import { registrarBitacora } from '../../core/secure-logger.js';

const router = Router();

const buscarExpedientes = (req, res) => {
  const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';
  const usuario = req.user?.username || 'desconocido';
  const esAdmin = req.user?.rol === 'admin';

  let carnet = req.query.carnet !== undefined
    ? String(req.query.carnet).trim()
    : (esAdmin ? '' : req.user?.carnet_estudiante || '');

  // Control de Acceso Estricto (Previene IDOR / Broken Access Control):
  // El estudiante SOLO puede consultar su propio carnet
  if (!esAdmin) {
    if (!req.user?.carnet_estudiante) {
      return res.status(403).json({ exito: false, mensaje: 'Usuario sin registro de estudiante vinculado.', bloqueado: true });
    }
    // Si intenta consultar el carnet de otro estudiante, se bloquea y audita
    if (carnet && carnet !== req.user.carnet_estudiante) {
      registrarBitacora({
        usuario,
        ip,
        accion: 'INTENTO_ACCESO_NO_AUTORIZADO_IDOR',
        modulo: 'EXPEDIENTES',
        resultado: 'BLOQUEADO',
        detalles: `Estudiante ${usuario} intentó ver expediente ajeno: ${carnet}`
      });
      return res.status(403).json({
        exito: false,
        mensaje: 'Acceso denegado: No tienes permisos para consultar expedientes de otros estudiantes.',
        bloqueado: true
      });
    }
    carnet = req.user.carnet_estudiante;
  }

  // Validación de entrada si se proporciona un carnet
  if (carnet) {
    const valCarnet = validarCarnet(carnet);
    if (!valCarnet.valido) {
      registrarBitacora({
        usuario,
        ip,
        accion: 'INTENTO_INYECCION_BLOQUEADO',
        modulo: 'EXPEDIENTES',
        resultado: 'BLOQUEADO',
        detalles: `Entrada maliciosa en carnet de expediente: ${carnet}`
      });
      return res.status(400).json({
        exito: false,
        mensaje: valCarnet.mensaje,
        bloqueado: true
      });
    }
    carnet = valCarnet.valor;
  }

  try {
    let query = `
      SELECT a.id_asignacion, a.carnet_estudiante, c.nombre_curso AS curso, a.ciclo, a.año,
             e.calificacion, m.nombres, m.apellidos, m.DPI, m.email_educativo, ca.nombre_carrera
      FROM tbl_asignaciones a
      JOIN tbl_cursos c ON c.id_curso = a.id_curso
      JOIN TM_estudiante m ON m.carnet_estudiante = a.carnet_estudiante
      JOIN ct_carreras ca ON ca.id_carrera = m.id_carrera
      LEFT JOIN tbl_expedientes e ON e.id_asignacion = a.id_asignacion
    `;
    const params = [];

    if (carnet) {
      query += ` WHERE a.carnet_estudiante = ? `;
      params.push(carnet);
    } else if (!esAdmin) {
      return res.json({ exito: true, datos: [] });
    }

    query += ` ORDER BY a.año DESC, a.ciclo, c.nombre_curso`;

    // Consulta Parametrizada: Evita cualquier inyección SQL
    const resultados = db.prepare(query).all(...params);

    // Protección criptográfica: Descifrado y enmascaramiento seguro del DPI
    const datosSeguros = resultados.map((r) => ({
      ...r,
      DPI: enmascararDPI(descifrarDPI(r.DPI))
    }));

    registrarBitacora({
      usuario,
      ip,
      accion: 'CONSULTA_EXPEDIENTE',
      modulo: 'EXPEDIENTES',
      resultado: 'EXITO',
      detalles: `Consulta de expediente para carnet: ${carnet || 'TODOS'}`
    });

    res.json({ exito: true, datos: datosSeguros });
  } catch (error) {
    registrarBitacora({
      usuario,
      ip,
      accion: 'ERROR_EXPEDIENTES',
      modulo: 'EXPEDIENTES',
      resultado: 'ERROR',
      detalles: error.message
    });
    res.status(500).json({ exito: false, mensaje: 'Error interno al procesar la consulta' });
  }
};

router.get('/buscar', requireAuth, buscarExpedientes);

router.put('/nota', requireAuth, requireRol('admin'), (req, res) => {
  const { id_asignacion, calificacion } = req.body || {};
  const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';
  const usuario = req.user?.username || 'admin';

  // Validación de Calificación (0 - 100 puntos y número entero)
  const valNota = validarCalificacion(calificacion);
  if (!valNota.valido) {
    registrarBitacora({
      usuario,
      ip,
      accion: 'ASIGNAR_NOTA_RECHAZADA',
      modulo: 'EXPEDIENTES',
      resultado: 'FALLO',
      detalles: `Punteo inválido: ${calificacion} (${valNota.mensaje})`
    });
    return res.status(400).json({ exito: false, mensaje: valNota.mensaje });
  }

  const idAsig = Number(id_asignacion);
  if (!Number.isInteger(idAsig) || idAsig <= 0) {
    return res.status(400).json({ exito: false, mensaje: 'Identificador de asignación no válido' });
  }

  db.prepare(`
    INSERT INTO tbl_expedientes (id_asignacion, calificacion)
    VALUES (?, ?)
    ON CONFLICT (id_asignacion)
    DO UPDATE SET calificacion = excluded.calificacion, actualizado_el = CURRENT_TIMESTAMP
  `).run(idAsig, valNota.valor);

  registrarBitacora({
    usuario,
    ip,
    accion: 'ASIGNAR_NOTA',
    modulo: 'EXPEDIENTES',
    resultado: 'EXITO',
    detalles: `Asignación ID ${idAsig} actualizada con calificación ${valNota.valor}`
  });

  res.json({ exito: true, mensaje: 'Nota guardada exitosamente' });
});

export default router;
