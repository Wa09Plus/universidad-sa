// src/core/api.js - Cliente HTTP compartido: adjunta el token de sesión a cada petición
let tokenActual = null;

export function setToken(token) {
  tokenActual = token;
}

export async function api(ruta, { method = 'GET', body } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (tokenActual) headers.Authorization = `Bearer ${tokenActual}`;

  const res = await fetch(ruta, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => ({ exito: false, mensaje: 'Respuesta inválida del servidor' }));
  return { ok: res.ok, status: res.status, ...data };
}

