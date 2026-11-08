import { Router } from 'express';
import db from '../../../database/connection.js';
import { requireAuth, requireRol } from '../../core/auth-middleware.js';
import { sanitizarTextoPlano } from '../../core/validators.js';
import { registrarBitacora } from '../../core/secure-logger.js';

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

// Creación de cursos: solo rol admin con validaciones y registro en bitácora
router.post('/', requireRol('admin'), (req, res) => {
  const { id_carrera, nombre_curso, horario, catedratico } = req.body || {};
  const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';
  const usuario = req.user?.username || 'admin';

  const nomCursoLimpio = sanitizarTextoPlano(nombre_curso, 100);
  const horarioLimpio = sanitizarTextoPlano(horario, 50);
  const catedraticoLimpio = sanitizarTextoPlano(catedratico, 100);

  if (!id_carrera || !nomCursoLimpio) {
    return res.status(400).json({ exito: false, mensaje: 'Carrera y nombre del curso son requeridos.' });
  }

  const { lastInsertRowid } = db.prepare(`
    INSERT INTO tbl_cursos (id_carrera, nombre_curso, horario, catedratico)
    VALUES (?, ?, ?, ?)
  `).run(id_carrera, nomCursoLimpio, horarioLimpio, catedraticoLimpio);

  registrarBitacora({
    usuario,
    ip,
    accion: 'CREAR_CURSO',
    modulo: 'CURSOS',
    resultado: 'EXITO',
    detalles: `Curso creado ID ${lastInsertRowid}: ${nomCursoLimpio}`
  });

  res.status(201).json({ exito: true, id_curso: lastInsertRowid, mensaje: 'Curso creado' });
});

export default router;
