import { Router } from 'express';
import db from '../../../database/connection.js';
import { requireAuth } from '../../core/auth-middleware.js';

const router = Router();
const CICLOS = ['Ciclo I', 'Ciclo II'];

router.use(requireAuth);

// Control por rol: el admin trabaja con cualquier carnet; el estudiante solo con el suyo
const carnetObjetivo = (req, valor) =>
  req.user.rol === 'admin' ? valor : req.user.carnet_estudiante;

// Asignaciones de un estudiante + cursos disponibles de su carrera
router.get('/', (req, res) => {
  const carnet = carnetObjetivo(req, req.query.carnet);
  if (!carnet) {
    return res.status(400).json({ exito: false, mensaje: 'Indica el carnet del estudiante' });
  }

  const estudiante = db.prepare(`
    SELECT m.carnet_estudiante, m.nombres, m.apellidos, m.id_carrera, ca.nombre_carrera
    FROM TM_estudiante m
    JOIN ct_carreras ca ON ca.id_carrera = m.id_carrera
    WHERE m.carnet_estudiante = ?
  `).get(carnet);

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
  `).all(carnet);

  const disponibles = db.prepare(`
    SELECT id_curso, nombre_curso, horario, catedratico
    FROM tbl_cursos
    WHERE id_carrera = ?
    ORDER BY nombre_curso
  `).all(estudiante.id_carrera);

  res.json({ exito: true, estudiante, asignaciones, disponibles, ciclos: CICLOS });
});

// Asignar un curso
router.post('/', (req, res) => {
  const carnet = carnetObjetivo(req, req.body?.carnet_estudiante);
  const idCurso = Number(req.body?.id_curso);
  const ciclo = req.body?.ciclo;
  const año = Number(req.body?.año);

  if (!carnet || !Number.isInteger(idCurso)) {
    return res.status(400).json({ exito: false, mensaje: 'Selecciona el estudiante y el curso' });
  }
  if (!CICLOS.includes(ciclo)) {
    return res.status(400).json({ exito: false, mensaje: 'Ciclo inválido' });
  }
  if (!Number.isInteger(año) || año < 2000 || año > 2100) {
    return res.status(400).json({ exito: false, mensaje: 'Año inválido' });
  }

  const estudiante = db.prepare('SELECT id_carrera FROM TM_estudiante WHERE carnet_estudiante = ?').get(carnet);
  if (!estudiante) {
    return res.status(404).json({ exito: false, mensaje: 'Estudiante no encontrado' });
  }

  const curso = db.prepare('SELECT id_carrera FROM tbl_cursos WHERE id_curso = ?').get(idCurso);
  if (!curso) {
    return res.status(404).json({ exito: false, mensaje: 'Curso no encontrado' });
  }
  if (curso.id_carrera !== estudiante.id_carrera) {
    return res.status(400).json({ exito: false, mensaje: 'El curso no pertenece a la carrera del estudiante' });
  }

  const duplicada = db.prepare(`
    SELECT 1 FROM tbl_asignaciones
    WHERE carnet_estudiante = ? AND id_curso = ? AND ciclo = ? AND año = ?
  `).get(carnet, idCurso, ciclo, año);
  if (duplicada) {
    return res.status(409).json({ exito: false, mensaje: 'El curso ya está asignado en ese ciclo' });
  }

  db.prepare(`
    INSERT INTO tbl_asignaciones (carnet_estudiante, id_curso, ciclo, año)
    VALUES (?, ?, ?, ?)
  `).run(carnet, idCurso, ciclo, año);

  res.status(201).json({ exito: true, mensaje: 'Curso asignado' });
});

// Quitar una asignación (solo si aún no tiene nota)
router.delete('/:id', (req, res) => {
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
  if (asignacion.id_expediente) {
    return res.status(409).json({ exito: false, mensaje: 'No se puede quitar un curso que ya tiene nota' });
  }

  db.prepare('DELETE FROM tbl_asignaciones WHERE id_asignacion = ?').run(req.params.id);
  res.json({ exito: true, mensaje: 'Asignación eliminada' });
});

export default router;

