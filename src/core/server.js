import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRouter from '../features/auth/auth.routes.js';
import expedientesRouter from '../features/expedientes/expedientes.routes.js';
import comentariosRouter from '../features/comentarios/comentarios.routes.js';
import perfilRouter from '../features/perfil/perfil.routes.js';
import estudiantesRouter from '../features/estudiantes/estudiantes.routes.js';
import reportesRouter from '../features/reportes/reportes.routes.js';
import cursosRouter from '../features/cursos/cursos.routes.js';
import asignacionesRouter from '../features/asignaciones/asignaciones.routes.js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// ❌ VULNERABILIDAD: Middleware global que loguea body entero sin filtrar secretos (Fase II.E)
app.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log(`[HTTP TRACE] ${req.method} ${req.url} - Payload:`, JSON.stringify(req.body));
  }
  next();
});

// Montaje de módulos
app.use('/api/auth', authRouter);
app.use('/api/expedientes', expedientesRouter);
app.use('/api/comentarios', comentariosRouter);
app.use('/api/perfil', perfilRouter);
app.use('/api/estudiantes', estudiantesRouter);
app.use('/api/reportes', reportesRouter);
app.use('/api/cursos', cursosRouter);
app.use('/api/asignaciones', asignacionesRouter);

app.listen(PORT, () => {
  console.log(`🔥 Servidor VULNERABLE escuchando en http://localhost:${PORT}`);
});