// src/features/estudiantes/estudiantes.routes.js
// Búsqueda y Detalle de Estudiantes con Validación de Entradas, Cifrado de DPI y Auditoría
import { Router } from 'express';
import db from '../../../database/connection.js';
import { requireAuth, requireRol } from '../../core/auth-middleware.js';
import { validarBusquedaTexto, validarCarnet } from '../../core/validators.js';
import { descifrarDPI, enmascararDPI } from '../../core/crypto-service.js';
import { registrarBitacora } from '../../core/secure-logger.js';

const router = Router();

// Todo el módulo es exclusivo del administrador
router.use(requireAuth, requireRol('admin'));

// Búsqueda de estudiantes por carnet específico o filtro general por texto (q)
router.get('/', (req, res) => {
  const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';
  const usuario = req.user?.username || 'admin';

  // 1. Si se envía parámetro carnet específico (ej. ?carnet=0904-26-002)
  if (req.query.carnet !== undefined) {
    const carnetRaw = String(req.query.carnet).trim();
    if (!carnetRaw) {
      return res.status(400).json({ exito: false, mensaje: 'El carnet no puede estar vacío.' });
    }

    const valCarnet = validarCarnet(carnetRaw);
    if (!valCarnet.valido) {
      registrarBitacora({
        usuario,
        ip,
        accion: 'INTENTO_INYECCION_BLOQUEADO',
        modulo: 'ESTUDIANTES',
        resultado: 'BLOQUEADO',
        detalles: `Entrada maliciosa o inválida en parámetro carnet: ${carnetRaw}`
      });
      return res.status(400).json({
        exito: false,
        mensaje: valCarnet.mensaje,
        bloqueado: true
      });
    }

    // Consulta parametrizada estricta para el carnet solicitado (solo devuelve 1 registro)
    const rows = db.prepare(`
      SELECT m.id_estudiante, m.carnet_estudiante, m.nombres, m.apellidos, m.email_educativo, m.DPI,
             m.id_carrera, ca.nombre_carrera, u.username,
             (SELECT COUNT(*) FROM tbl_asignaciones a WHERE a.carnet_estudiante = m.carnet_estudiante) AS cursos,
             (SELECT ROUND(AVG(e.calificacion), 1)
                FROM tbl_expedientes e
                JOIN tbl_asignaciones a ON a.id_asignacion = e.id_asignacion
               WHERE a.carnet_estudiante = m.carnet_estudiante) AS promedio
      FROM TM_estudiante m
      JOIN ct_carreras ca ON ca.id_carrera = m.id_carrera
      LEFT JOIN tbl_usuario u ON u.carnet_estudiante = m.carnet_estudiante
      WHERE m.carnet_estudiante = ?
    `).all(valCarnet.valor);

    const estudiantes = rows.map((s) => ({
      ...s,
      carnet: s.carnet_estudiante,
      DPI: enmascararDPI(descifrarDPI(s.DPI))
    }));

    registrarBitacora({
      usuario,
      ip,
      accion: 'BUSQUEDA_ESTUDIANTE_POR_CARNET',
      modulo: 'ESTUDIANTES',
      resultado: 'EXITO',
      detalles: `Búsqueda por carnet exacto: ${valCarnet.valor} (Encontrados: ${estudiantes.length})`
    });

    return res.json({ exito: true, estudiantes });
  }

  // 2. Si se envía búsqueda general por texto (q) o listar todos
  const valBusqueda = validarBusquedaTexto(req.query.q);
  if (!valBusqueda.valido) {
    registrarBitacora({
      usuario,
      ip,
      accion: 'INTENTO_INYECCION_BLOQUEADO',
      modulo: 'ESTUDIANTES',
      resultado: 'BLOQUEADO',
      detalles: `Entrada maliciosa en término de búsqueda: ${req.query.q}`
    });
    return res.status(400).json({
      exito: false,
      mensaje: valBusqueda.mensaje,
      bloqueado: true
    });
  }

  const termino = valBusqueda.valor;
  const filtro = `%${termino}%`;

  const rows = db.prepare(`
    SELECT m.id_estudiante, m.carnet_estudiante, m.nombres, m.apellidos, m.email_educativo, m.DPI,
           m.id_carrera, ca.nombre_carrera, u.username,
           (SELECT COUNT(*) FROM tbl_asignaciones a WHERE a.carnet_estudiante = m.carnet_estudiante) AS cursos,
           (SELECT ROUND(AVG(e.calificacion), 1)
              FROM tbl_expedientes e
              JOIN tbl_asignaciones a ON a.id_asignacion = e.id_asignacion
             WHERE a.carnet_estudiante = m.carnet_estudiante) AS promedio
    FROM TM_estudiante m
    JOIN ct_carreras ca ON ca.id_carrera = m.id_carrera
    LEFT JOIN tbl_usuario u ON u.carnet_estudiante = m.carnet_estudiante
    WHERE m.carnet_estudiante LIKE ?
       OR m.nombres LIKE ?
       OR m.apellidos LIKE ?
       OR (m.nombres || ' ' || m.apellidos) LIKE ?
       OR m.email_educativo LIKE ?
       OR ca.nombre_carrera LIKE ?
    ORDER BY m.apellidos, m.nombres
  `).all(filtro, filtro, filtro, filtro, filtro, filtro);

  // Protección criptográfica: Desencriptar y enmascarar DPI sensible para la lista
  const estudiantes = rows.map((s) => ({
    ...s,
    carnet: s.carnet_estudiante,
    DPI: enmascararDPI(descifrarDPI(s.DPI))
  }));

  registrarBitacora({
    usuario,
    ip,
    accion: 'BUSQUEDA_ESTUDIANTES',
    modulo: 'ESTUDIANTES',
    resultado: 'EXITO',
    detalles: `Búsqueda ejecutada con término: "${termino || 'TODOS'}" (Resultados: ${estudiantes.length})`
  });

  res.json({ exito: true, estudiantes });
});

// Detalle de un estudiante: datos maestros, carrera, cuenta de usuario y expediente
router.get('/:carnet', (req, res) => {
  const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';
  const usuario = req.user?.username || 'admin';

  const valCarnet = validarCarnet(req.params.carnet);
  if (!valCarnet.valido) {
    return res.status(400).json({ exito: false, mensaje: valCarnet.mensaje });
  }
  const carnet = valCarnet.valor;

  const estudiante = db.prepare(`
    SELECT m.*, ca.nombre_carrera, ca.jornada, ca.sede
    FROM TM_estudiante m
    JOIN ct_carreras ca ON ca.id_carrera = m.id_carrera
    WHERE m.carnet_estudiante = ?
  `).get(carnet);

  if (!estudiante) {
    return res.status(404).json({ exito: false, mensaje: 'Estudiante no encontrado' });
  }

  // Descifrado seguro de DPI para vista de detalle del administrador
  estudiante.DPI = descifrarDPI(estudiante.DPI);

  const cuentaUsuario = db.prepare(`
    SELECT id_usuario, username, email, rol, creado_el
    FROM tbl_usuario WHERE carnet_estudiante = ?
  `).get(carnet);

  const expedientes = db.prepare(`
    SELECT c.nombre_curso AS curso, e.calificacion, a.ciclo, a.año
    FROM tbl_asignaciones a
    JOIN tbl_cursos c ON c.id_curso = a.id_curso
    LEFT JOIN tbl_expedientes e ON e.id_asignacion = a.id_asignacion
    WHERE a.carnet_estudiante = ?
    ORDER BY a.año DESC, a.ciclo, c.nombre_curso
  `).all(carnet);

  registrarBitacora({
    usuario,
    ip,
    accion: 'DETALLE_ESTUDIANTE',
    modulo: 'ESTUDIANTES',
    resultado: 'EXITO',
    detalles: `Visualización de expediente y datos de ${carnet}`
  });

  res.json({ exito: true, estudiante, usuario: cuentaUsuario || null, expedientes });
});

export default router;
