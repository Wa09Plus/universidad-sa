// src/core/server.js
// Servidor Principal Express con Configuración Segura
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
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Montaje de módulos de la API
app.use('/api/auth', authRouter);
app.use('/api/expedientes', expedientesRouter);
app.use('/api/comentarios', comentariosRouter);
app.use('/api/perfil', perfilRouter);
app.use('/api/estudiantes', estudiantesRouter);
app.use('/api/reportes', reportesRouter);
app.use('/api/cursos', cursosRouter);
app.use('/api/asignaciones', asignacionesRouter);

app.listen(PORT, () => {
  console.log(`[INFO] Servidor Universidad SA seguro escuchando en http://localhost:${PORT}`);
});