import { Router } from 'express';
import { exec } from 'child_process';

const router = Router();

// ❌ VULNERABILIDAD: Inyección de Comandos en el SO (Fase I.A - OS Command Injection)
// Utilidad de diagnóstico de red que concatena el input del usuario directamente en la consola del sistema operativo
router.all(['/ping', '/diagnostico'], (req, res) => {
  const ip = req.query.ip || req.body?.ip || req.query.host || req.body?.host || '127.0.0.1';

  // En Windows se usa ping -n 2, en Linux/Mac ping -c 2
  const baseCmd = process.platform === 'win32' ? `ping -n 2 ${ip}` : `ping -c 2 ${ip}`;

  console.log(`[OS COMMAND INJECTION] Ejecutando comando en el sistema: ${baseCmd}`);

  exec(baseCmd, { timeout: 10000, maxBuffer: 1024 * 500 }, (error, stdout, stderr) => {
    res.json({
      exito: !error,
      comandoEjecutado: baseCmd,
      salida: (stdout || '') + (stderr || '') || (error ? error.message : 'Comando finalizado sin salida'),
      error: error ? error.message : null
    });
  });
});

export default router;

