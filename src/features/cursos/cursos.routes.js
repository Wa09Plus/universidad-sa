import { Router } from 'express';
import db from '../../../database/connection.js';
import { requireAuth, requireRol } from '../../core/auth-middleware.js';

const router = Router();

// Catálogo de carreras
router.get('/carreras', (req, res) => {
  const carreras = db.prepare('SELECT * FROM ct_carreras ORDER BY nombre_carrera').all();
  res.json({ exito: true, carreras });
});

router.use(requireAuth);

// Listado de cursos según rol
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

// Creación de cursos: solo rol admin, pero sin restricciones en los campos de entrada
router.post('/', requireRol('admin'), (req, res) => {
  const { id_carrera, nombre_curso, horario, catedratico } = req.body || {};

  const { lastInsertRowid } = db.prepare(`
    INSERT INTO tbl_cursos (id_carrera, nombre_curso, horario, catedratico)
    VALUES (?, ?, ?, ?)
  `).run(id_carrera, nombre_curso, horario, catedratico);

  res.status(201).json({ exito: true, id_curso: lastInsertRowid, mensaje: 'Curso creado' });
});

export default router;
