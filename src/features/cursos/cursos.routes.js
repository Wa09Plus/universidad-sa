import { Router } from 'express';
import db from '../../../database/connection.js';
import { requireAuth, requireRol } from '../../core/auth-middleware.js';

const router = Router();

// Catálogo de carreras (público: lo necesita el formulario de registro)
router.get('/carreras', (req, res) => {
  const carreras = db.prepare('SELECT * FROM ct_carreras ORDER BY nombre_carrera').all();
  res.json({ exito: true, carreras });
});

router.use(requireAuth);

// Listado de cursos. El admin ve todos (o filtra por carrera); el estudiante solo los de su carrera.
router.get('/', (req, res) => {
  let carrera = req.query.carrera || null;

  if (req.user.rol !== 'admin') {
    const est = db.prepare('SELECT id_carrera FROM TM_estudiante WHERE carnet_estudiante = ?')
      .get(req.user.carnet_estudiante);
    carrera = est?.id_carrera ?? '';
  }

  const cursos = db.prepare(`
    SELECT c.id_curso, c.id_carrera, c.nombre_curso, c.horario, c.catedratico, ca.nombre_carrera,
           (SELECT COUNT(*) FROM tbl_asignaciones a WHERE a.id_curso = c.id_curso) AS asignados
    FROM tbl_cursos c
    JOIN ct_carreras ca ON ca.id_carrera = c.id_carrera
    WHERE (? IS NULL OR c.id_carrera = ?)
    ORDER BY ca.nombre_carrera, c.nombre_curso
  `).all(carrera, carrera);

  res.json({ exito: true, cursos });
});

// Creación de cursos (solo admin)
router.post('/', requireRol('admin'), (req, res) => {
  const { id_carrera, nombre_curso, horario, catedratico } = req.body || {};

  const campos = [id_carrera, nombre_curso, horario, catedratico];
  if (!campos.every((v) => typeof v === 'string' && v.trim() !== '')) {
    return res.status(400).json({ exito: false, mensaje: 'Todos los campos son obligatorios' });
  }

  const carrera = db.prepare('SELECT 1 FROM ct_carreras WHERE id_carrera = ?').get(id_carrera);
  if (!carrera) {
    return res.status(400).json({ exito: false, mensaje: 'La carrera seleccionada no existe' });
  }

  const existe = db.prepare(
    'SELECT 1 FROM tbl_cursos WHERE id_carrera = ? AND lower(nombre_curso) = lower(?)'
  ).get(id_carrera, nombre_curso.trim());
  if (existe) {
    return res.status(409).json({ exito: false, mensaje: 'Ya existe un curso con ese nombre en la carrera' });
  }

  const { lastInsertRowid } = db.prepare(`
    INSERT INTO tbl_cursos (id_carrera, nombre_curso, horario, catedratico)
    VALUES (?, ?, ?, ?)
  `).run(id_carrera, nombre_curso.trim(), horario.trim(), catedratico.trim());

  res.status(201).json({ exito: true, id_curso: lastInsertRowid, mensaje: 'Curso creado' });
});

export default router;

