// src/core/server.js
// Servidor Principal Express con Configuración Segura y Soporte TLS/HTTPS
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
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

app.use(cors());
app.use(express.json());

// Endurecimiento de Seguridad: HTTP Strict Transport Security (HSTS)
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// Montaje de módulos de la API
app.use('/api/auth', authRouter);
app.use('/api/expedientes', expedientesRouter);
app.use('/api/comentarios', comentariosRouter);
app.use('/api/perfil', perfilRouter);
app.use('/api/estudiantes', estudiantesRouter);
app.use('/api/reportes', reportesRouter);
app.use('/api/cursos', cursosRouter);
app.use('/api/asignaciones', asignacionesRouter);

// Certificados para Cifrado en Tránsito (TLS 1.2 / TLS 1.3)
const KEY_PATH = path.join(process.cwd(), 'certs', 'server.key');
const CERT_PATH = path.join(process.cwd(), 'certs', 'server.crt');

if (fs.existsSync(KEY_PATH) && fs.existsSync(CERT_PATH)) {
  const tlsOptions = {
    key: fs.readFileSync(KEY_PATH),
    cert: fs.readFileSync(CERT_PATH),
    minVersion: 'TLSv1.2'
  };

  https.createServer(tlsOptions, app).listen(HTTPS_PORT, () => {
    console.log(`[INFO] Servidor HTTPS seguro (TLS 1.2/1.3) escuchando en https://localhost:${HTTPS_PORT}`);
  });
}

http.createServer(app).listen(PORT, () => {
  console.log(`[INFO] Servidor HTTP escuchando en http://localhost:${PORT}`);
});
