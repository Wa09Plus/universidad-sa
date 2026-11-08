import { Router } from 'express';
import db from '../../../database/connection.js';
import { requireAuth } from '../../core/auth-middleware.js';
import { validarCarnet } from '../../core/validators.js';
import { registrarBitacora } from '../../core/secure-logger.js';

const router = Router();

router.use(requireAuth);

const carnetObjetivo = (req, valor) =>
  req.user.rol === 'admin' ? valor : req.user.carnet_estudiante;

// Asignaciones del estudiante
router.get('/', (req, res) => {
  const carnet = carnetObjetivo(req, req.query.carnet);
  if (!carnet) {
    return res.status(400).json({ exito: false, mensaje: 'Indica el carnet del estudiante' });
  }

  const valCarnet = validarCarnet(carnet);
  if (!valCarnet.valido) {
    return res.status(400).json({ exito: false, mensaje: valCarnet.mensaje });
  }

  const estudiante = db.prepare(`
    SELECT m.carnet_estudiante, m.nombres, m.apellidos, m.id_carrera, ca.nombre_carrera
    FROM TM_estudiante m
    JOIN ct_carreras ca ON ca.id_carrera = m.id_carrera
    WHERE m.carnet_estudiante = ?
  `).get(valCarnet.valor);

  if (!estudiante) {
    return res.status(404).json({ exito: false, mensaje: 'Estudiante no encontrado' });
  }

  const asignaciones = db.prepare(`
    SELECT a.id_asignacion, a.ciclo, a.año,
           c.id_curso, c.nombre_curso, c.horario, c.catedratico,
           e.calificacion
    FROM tbl_asignaciones a
    JOIN tbl_cursos c ON c.id_curso = a.id_curso
    LEFT JOIN tbl_expedientes e ON e.id_asignacion = a.id_asignacion
    WHERE a.carnet_estudiante = ?
    ORDER BY a.año DESC, a.ciclo, c.nombre_curso
  `).all(valCarnet.valor);

  const disponibles = db.prepare(`
    SELECT id_curso, nombre_curso, horario, catedratico
    FROM tbl_cursos
    WHERE id_carrera = ?
    ORDER BY nombre_curso
  `).all(estudiante.id_carrera);

  res.json({ exito: true, estudiante, asignaciones, disponibles, ciclos: ['Ciclo I', 'Ciclo II'] });
});

// Asignar curso
router.post('/', (req, res) => {
  const carnet = carnetObjetivo(req, req.body?.carnet_estudiante);
  const idCurso = Number(req.body?.id_curso);
  const ciclo = String(req.body?.ciclo || 'Ciclo I').slice(0, 20);
  const año = Number(req.body?.año || 2026);
  const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';
  const usuario = req.user?.username || 'usuario';

  const valCarnet = validarCarnet(carnet);
  if (!valCarnet.valido || !Number.isInteger(idCurso)) {
    return res.status(400).json({ exito: false, mensaje: 'Datos de asignación inválidos' });
  }

  db.prepare(`
    INSERT INTO tbl_asignaciones (carnet_estudiante, id_curso, ciclo, año)
    VALUES (?, ?, ?, ?)
  `).run(valCarnet.valor, idCurso, ciclo, año);

  registrarBitacora({
    usuario,
    ip,
    accion: 'ASIGNAR_CURSO',
    modulo: 'ASIGNACIONES',
    resultado: 'EXITO',
    detalles: `Estudiante ${valCarnet.valor} asignado al curso ID ${idCurso}`
  });

  res.status(201).json({ exito: true, mensaje: 'Curso asignado exitosamente' });
});

// Eliminar asignación
router.delete('/:id', (req, res) => {
  const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';
  const usuario = req.user?.username || 'usuario';

  const asignacion = db.prepare(`
    SELECT a.carnet_estudiante, e.id_expediente
    FROM tbl_asignaciones a
    LEFT JOIN tbl_expedientes e ON e.id_asignacion = a.id_asignacion
    WHERE a.id_asignacion = ?
  `).get(req.params.id);

  if (!asignacion) {
    return res.status(404).json({ exito: false, mensaje: 'Asignación no encontrada' });
  }
  if (req.user.rol !== 'admin' && asignacion.carnet_estudiante !== req.user.carnet_estudiante) {
    return res.status(403).json({ exito: false, mensaje: 'No tienes permisos para esta acción.' });
  }

  db.prepare('DELETE FROM tbl_asignaciones WHERE id_asignacion = ?').run(req.params.id);

  registrarBitacora({
    usuario,
    ip,
    accion: 'ELIMINAR_ASIGNACION',
    modulo: 'ASIGNACIONES',
    resultado: 'EXITO',
    detalles: `Asignación ID ${req.params.id} eliminada para carnet ${asignacion.carnet_estudiante}`
  });

  res.json({ exito: true, mensaje: 'Asignación eliminada' });
});

export default router;
