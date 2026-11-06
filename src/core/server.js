// src/core/server.js
// Servidor Principal Express con Configuración Segura
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
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

// Inicio del servidor: Soporte dual HTTP (desarrollo local) y HTTPS / TLS 1.3
const USE_HTTPS = process.env.HTTPS_ENABLED === 'true';
const PFX_PATH = path.join(process.cwd(), 'certs', 'localhost.pfx');

if (USE_HTTPS && fs.existsSync(PFX_PATH)) {
  const tlsOptions = {
    pfx: fs.readFileSync(PFX_PATH),
    passphrase: process.env.PFX_PASSWORD || 'temporal123',
    minVersion: 'TLSv1.2' // Exige TLS 1.2 o TLS 1.3
  };

  https.createServer(tlsOptions, app).listen(PORT, () => {
    console.log(`[INFO] Servidor Universidad SA SEGURO corriendo bajo HTTPS (TLS 1.3/1.2) en https://localhost:${PORT}`);
  });
} else {
  http.createServer(app).listen(PORT, () => {
    console.log(`[INFO] Servidor Universidad SA corriendo en http://localhost:${PORT} (Modo HTTP estándar)`);
  });
}