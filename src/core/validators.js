// src/core/validators.js
// Validaciones de Entrada Estrictas y Normalización (Whitelist Validation)
// Fase I.A de la Tarea Integradora

/**
 * Valida nombres y apellidos:
 * - Solo letras (incluyendo tildes, diéresis y eñes), espacios, guiones y apóstrofes legítimos (ej. D'Angelo).
 * - No permite caracteres de inyección SQL ni etiquetas HTML (<, >, ;, ", etc.).
 */
export function validarSoloLetras(valor, nombreCampo = 'Campo') {
  if (typeof valor !== 'string' || !valor.trim()) {
    return { valido: false, mensaje: `${nombreCampo} es requerido y debe ser texto.` };
  }
  const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]{2,60}$/;
  if (!regex.test(valor.trim())) {
    return {
      valido: false,
      mensaje: `${nombreCampo} solo debe contener letras y espacios (entre 2 y 60 caracteres).`
    };
  }
  return { valido: true, valor: valor.trim() };
}

/**
 * Valida parámetro de búsqueda por usuario o nombre:
 * - Solo caracteres alfanuméricos, acentos, espacios y guiones.
 * - Bloquea activamente cualquier intento de Inyección SQL (palabras clave o metacaracteres).
 */
export function validarBusquedaTexto(valor) {
  if (valor === undefined || valor === null || valor === '') return { valido: true, valor: '' };
  const str = String(valor).trim();
  if (str.length > 80) {
    return { valido: false, mensaje: 'El término de búsqueda excede la longitud máxima (80 caracteres).' };
  }

  // Detección activa de vectores de Inyección SQL
  const patronInyeccion = /('|--|\b(OR|AND|UNION|SELECT|INSERT|DELETE|UPDATE|DROP|WHERE)\b|=|<|>|;|--|\/\*)/i;
  if (patronInyeccion.test(str)) {
    return {
      valido: false,
      mensaje: 'Intento de Inyección SQL o caracteres no permitidos detectados en la búsqueda.'
    };
  }

  // Whitelist estricta: solo letras, números, acentos y espacios
  const regex = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s-]*$/;
  if (!regex.test(str)) {
    return { valido: false, mensaje: 'El parámetro de búsqueda contiene caracteres no permitidos.' };
  }
  return { valido: true, valor: str };
}

/**
 * Valida correo institucional:
 * - Obligatoriamente debe terminar en @universidad.edu
 */
export function validarCorreoInstitucional(email) {
  if (typeof email !== 'string' || !email.trim()) {
    return { valido: false, mensaje: 'El correo electrónico es obligatorio.' };
  }
  const limpio = email.trim().toLowerCase();
  const regex = /^[a-zA-Z0-9._%+-]+@universidad\.edu$/;
  if (!regex.test(limpio)) {
    return {
      valido: false,
      mensaje: 'El correo institucional debe ser válido y pertenecer al dominio @universidad.edu.'
    };
  }
  return { valido: true, valor: limpio };
}

/**
 * Valida DPI de Guatemala:
 * - Debe ser estrictamente numérico y de exactamente 13 dígitos.
 */
export function validarDPI(dpi) {
  if (!dpi) return { valido: false, mensaje: 'El DPI es obligatorio.' };
  const str = String(dpi).trim();
  const regex = /^\d{13}$/;
  if (!regex.test(str)) {
    return {
      valido: false,
      mensaje: 'El DPI debe contener exactamente 13 dígitos numéricos sin espacios ni guiones.'
    };
  }
  return { valido: true, valor: str };
}

/**
 * Valida calificación / punteo:
 * - Debe ser un número entero entre 0 y 100.
 */
export function validarCalificacion(nota) {
  if (nota === undefined || nota === null || nota === '') {
    return { valido: false, mensaje: 'La calificación es obligatoria.' };
  }
  const num = Number(nota);
  if (!Number.isFinite(num) || !Number.isInteger(num)) {
    return { valido: false, mensaje: 'La calificación debe ser un número entero.' };
  }
  if (num < 0 || num > 100) {
    return { valido: false, mensaje: 'La calificación debe encontrarse en el rango de 0 a 100 puntos.' };
  }
  return { valido: true, valor: num };
}

/**
 * Valida carnet de estudiante:
 * - Formato carrera-año-correlativo (ej. 0904-26-001) o alfanumérico estricto.
 */
export function validarCarnet(carnet) {
  if (!carnet) return { valido: false, mensaje: 'El carnet es obligatorio.' };
  const str = String(carnet).trim();
  const patronInyeccion = /('|--|\b(OR|AND|UNION|SELECT|INSERT|DELETE|UPDATE|DROP)\b|=|<|>|;|--|\/\*)/i;
  if (patronInyeccion.test(str)) {
    return { valido: false, mensaje: 'Intento de Inyección SQL detectado en carnet.' };
  }
  const regex = /^[a-zA-Z0-9-]{4,20}$/;
  if (!regex.test(str)) {
    return { valido: false, mensaje: 'Formato de carnet inválido. Debe ser alfanumérico (ej. 0904-26-001).' };
  }
  return { valido: true, valor: str };
}

/**
 * Normaliza y escapa texto para evitar XSS o deformación en salidas:
 * - No peta con apóstrofes ni caracteres especiales.
 */
export function sanitizarTextoPlano(texto, maxLen = 500) {
  if (typeof texto !== 'string') return '';
  return texto.trim().slice(0, maxLen);
}

