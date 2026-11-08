// scratch/test_comentarios.js
import db from '../database/connection.js';
import comentariosRouter from '../src/features/comentarios/comentarios.routes.js';

const postHandler = comentariosRouter.stack.find(s => s.route && s.route.path === '/' && s.route.methods.post).route.stack[0].handle;

function mockRes() {
  return {
    code: 200,
    status(c) { this.code = c; return this; },
    json(d) { console.log(`[HTTP ${this.code}]`, d); }
  };
}

console.log('=== TEST 1: Comentario con carnet válido (Carlos) ===');
await postHandler({
  body: {
    carnet_estudiante: '0904-26-001',
    autor: 'admin',
    mensaje: 'Revisión confirmada para la entrega del informe.'
  }
}, mockRes());

console.log('\n=== TEST 2: Comentario con carnet vacío o indefinido ===');
await postHandler({
  body: {
    carnet_estudiante: '',
    autor: 'admin',
    mensaje: 'Hola mundo'
  }
}, mockRes());

