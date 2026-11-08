// scratch/test_anti_sqli.js
import db from '../database/connection.js';
import expedientesRouter from '../src/features/expedientes/expedientes.routes.js';
import { requireAuth } from '../src/core/auth-middleware.js';

function mockRes() {
  return {
    code: 200,
    status(c) { this.code = c; return this; },
    json(d) { console.log(`[HTTP ${this.code}]`, d); }
  };
}

console.log('=== ESCENARIO 1: Acceso Anónimo (Sin Token) a la URL directa ===');
requireAuth({ headers: {} }, mockRes(), () => console.log('ERROR: No debió pasar'));

console.log('\n=== ESCENARIO 2: Estudiante legítimo (Carlos) intentando ver notas de Sofia (IDOR) ===');
const buscarHandler = expedientesRouter.stack.find(s => s.route && s.route.path === '/buscar').route.stack[1].handle;
await buscarHandler({
  query: { carnet: '0904-26-002' },
  user: { username: 'cmendoza', rol: 'estudiante', carnet_estudiante: '0904-26-001' }
}, mockRes());

console.log('\n=== ESCENARIO 3: Inyección SQL en carnet ===');
await buscarHandler({
  query: { carnet: "' OR '1'='1" },
  user: { username: 'admin', rol: 'admin', carnet_estudiante: null }
}, mockRes());

console.log('\n=== ESCENARIO 4: Admin legítimo consultando carnet de Sofia ===');
await buscarHandler({
  query: { carnet: '0904-26-002' },
  user: { username: 'admin', rol: 'admin', carnet_estudiante: null }
}, mockRes());
