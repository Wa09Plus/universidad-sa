// src/features/sistema/sistemaIU.jsx - Herramienta de Diagnóstico del Sistema y Red (Vulnerable a Command Injection)
import { useState } from 'react';
import { Terminal, Play, ShieldAlert, Cpu } from 'lucide-react';
import { api } from '../../core/api.js';

export default function SistemaIU() {
  const [ip, setIp] = useState('127.0.0.1');
  const [salida, setSalida] = useState('');
  const [comando, setComando] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const ejecutarDiagnostico = async (targetIp = ip) => {
    setCargando(true);
    setError('');
    setSalida('');
    setComando('');

    try {
      const data = await api(`/api/sistema/ping?ip=${encodeURIComponent(targetIp)}`);
      setComando(data.comandoEjecutado || '');
      setSalida(data.salida || 'Sin salida devuelta');
      if (!data.exito && data.error) {
        setError(data.error);
      }
    } catch {
      setError('Error al comunicarse con el servidor o tiempo de espera agotado');
    } finally {
      setCargando(false);
    }
  };

  const aplicarPayload = (payload) => {
    setIp(payload);
    ejecutarDiagnostico(payload);
  };

  return (
    <>
      <div className="page-header">
        <h2>
          <span className="page-header-icon"><Terminal size={24} /></span>
          Diagnóstico y Herramientas del Servidor
        </h2>
        <p>Herramienta interna de verificación de conectividad y estado del host (Vulnerable a Inyección de Comandos).</p>
      </div>

      <div className="card">
        <form onSubmit={(e) => { e.preventDefault(); ejecutarDiagnostico(); }}>
          <div className="field">
            <label className="label">Dirección IP o Host a verificar</label>
            <div className="toolbar" style={{ marginBottom: 0 }}>
              <input
                className="input"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                placeholder="ej. 127.0.0.1"
                disabled={cargando}
              />
              <button className="btn btn-with-icon" type="submit" disabled={cargando}>
                <Play size={16} />
                {cargando ? 'Ejecutando en el SO...' : 'Ejecutar Diagnóstico'}
              </button>
            </div>
          </div>
        </form>

        <div style={{ marginTop: 16 }}>
          <label className="label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldAlert size={15} color="var(--danger)" />
            Cargas de prueba (Inyección de Comandos en el SO):
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => aplicarPayload('127.0.0.1')}
            >
              Ping normal (127.0.0.1)
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
              onClick={() => aplicarPayload('127.0.0.1 & whoami')}
            >
              Inyección: & whoami
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
              onClick={() => aplicarPayload('127.0.0.1 & dir')}
            >
              Inyección: & dir
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
              onClick={() => aplicarPayload('127.0.0.1 & hostname')}
            >
              Inyección: & hostname
            </button>
          </div>
        </div>

        {error && <div className="alert alert-error" style={{ marginTop: 16 }}>{error}</div>}

        {comando && (
          <div style={{ marginTop: 18 }}>
            <span className="label">Comando real ejecutado en el shell del SO:</span>
            <code>{comando}</code>
          </div>
        )}

        {(salida || cargando) && (
          <div style={{ marginTop: 12 }}>
            <span className="label">Terminal del Servidor:</span>
            <pre className="terminal">
              {cargando ? '⚡ Ejecutando comando en el sistema operativo...' : salida}
            </pre>
          </div>
        )}
      </div>
    </>
  );
}

