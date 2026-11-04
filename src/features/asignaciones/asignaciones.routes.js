import { Router } from 'express';
import db from '../../../database/connection.js';
import { requireAuth } from '../../core/auth-middleware.js';

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

  res.json({ exito: true, estudiante, asignaciones, disponibles, ciclos: ['Ciclo I', 'Ciclo II'] });
});

// Asignar curso: respeta el rol de quién lo asigna, pero sin restricciones en los valores
router.post('/', (req, res) => {
  const carnet = carnetObjetivo(req, req.body?.carnet_estudiante);
  const idCurso = req.body?.id_curso;
  const ciclo = req.body?.ciclo || 'Ciclo I';
  const año = req.body?.año || 2026;

  db.prepare(`
    INSERT INTO tbl_asignaciones (carnet_estudiante, id_curso, ciclo, año)
    VALUES (?, ?, ?, ?)
  `).run(carnet, idCurso, ciclo, año);

  res.status(201).json({ exito: true, mensaje: 'Curso asignado' });
});

// Eliminar asignación
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

  db.prepare('DELETE FROM tbl_asignaciones WHERE id_asignacion = ?').run(req.params.id);
  res.json({ exito: true, mensaje: 'Asignación eliminada' });
});

export default router;
