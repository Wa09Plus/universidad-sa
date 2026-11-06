// scratch/test_security.js
// Script de Verificación Integral de Seguridad (MASI 2026)
import db from '../database/connection.js';
import { verifyPassword, descifrarDPI, enmascararDPI } from '../src/core/crypto-service.js';
import {
  validarCalificacion,
  validarCarnet,
  validarCorreoInstitucional,
  validarDPI,
  validarSoloLetras
} from '../src/core/validators.js';

console.log('====================================================');
console.log('1. PRUEBAS DE VALIDACIÓN DE ENTRADAS (FASE I.A)');
console.log('====================================================');
console.log('Nombre válido "Juan Pérez":', validarSoloLetras('Juan Pérez', 'Nombres'));
console.log('Nombre con números "Juan123":', validarSoloLetras('Juan123', 'Nombres'));
console.log('Nombre con apóstrofo legítimo "D\'Angelo":', validarSoloLetras("D'Angelo", 'Nombres'));
console.log('Correo institucional "cmendoza@universidad.edu":', validarCorreoInstitucional('cmendoza@universidad.edu'));
console.log('Correo externo "hacker@gmail.com":', validarCorreoInstitucional('hacker@gmail.com'));
console.log('DPI válido 13 dígitos "3001123450101":', validarDPI('3001123450101'));
console.log('DPI inválido "123":', validarDPI('123'));
console.log('Calificación 85 pts:', validarCalificacion(85));
console.log('Calificación fuera de rango 150 pts:', validarCalificacion(150));
console.log('Calificación negativa -10 pts:', validarCalificacion(-10));

console.log('\n====================================================');
console.log('2. PRUEBAS DE CRIPTOGRAFÍA EN REPOSO (FASE II.B)');
console.log('====================================================');
const est = db.prepare('SELECT carnet_estudiante, DPI FROM TM_estudiante LIMIT 1').get();
console.log('DPI Cifrado en BD (AES-256-GCM):', est.DPI);
const descifrado = descifrarDPI(est.DPI);
console.log('DPI Descifrado autenticado:', descifrado);
console.log('DPI Enmascarado en vistas públicas:', enmascararDPI(descifrado));

console.log('\n====================================================');
console.log('3. PRUEBAS DE KDF DE CONTRASEÑAS (FASE II.A)');
console.log('====================================================');
const user = db.prepare("SELECT username, pass FROM tbl_usuario WHERE username = 'admin'").get();
console.log('Hash en BD (scrypt con sal):', user.pass);
console.log('Verificación contraseña correcta "admin123":', verifyPassword('admin123', user.pass));
console.log('Verificación contraseña incorrecta "WrongPass":', verifyPassword('WrongPass', user.pass));

console.log('\n====================================================');
console.log('4. PRUEBAS DE MITIGACIÓN DE SQL INJECTION (FASE I.B)');
console.log('====================================================');
const payloadInyeccion = "' OR '1'='1";
const valCarnet = validarCarnet(payloadInyeccion);
console.log('Filtro de carnet malicioso:', valCarnet);
const rows = db.prepare('SELECT * FROM tbl_asignaciones WHERE carnet_estudiante = ?').all(payloadInyeccion);
console.log('Registros devueltos por la consulta parametrizada:', rows.length);

console.log('\n====================================================');
console.log('5. PRUEBAS DE AUDITORÍA Y BITÁCORA (FASE II.E)');
console.log('====================================================');
const logs = db.prepare('SELECT COUNT(*) as total FROM tbl_bitacora').get();
console.log(`Total de eventos auditados en tbl_bitacora: ${logs.total}`);

