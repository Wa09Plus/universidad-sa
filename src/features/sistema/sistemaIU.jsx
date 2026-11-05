// src/features/sistema/sistemaIU.jsx - Herramienta de Diagnóstico del Servidor y Red
import { useState } from 'react';
import { Terminal, Play } from 'lucide-react';
import { api } from '../../core/api.js';

export default function SistemaIU() {
  const [ip, setIp] = useState('127.0.0.1');
  const [salida, setSalida] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const ejecutarDiagnostico = async (e) => {
    if (e) e.preventDefault();
    setCargando(true);
    setError('');
    setSalida('');

    try {
      const data = await api(`/api/sistema/ping?ip=${encodeURIComponent(ip)}`);
      setSalida(data.salida || 'Sin respuesta del host.');
      if (!data.exito && data.error) {
        setError(data.error);
      }
    } catch {
      setError('Tiempo de espera agotado al intentar contactar con el host');
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h2>
          <span className="page-header-icon"><Terminal size={24} /></span>
          Diagnóstico de Red del Servidor
        </h2>
        <p>Herramienta para comprobar la conectividad del servidor con sedes y hosts remotos.</p>
      </div>

      <div className="card">
        <form onSubmit={ejecutarDiagnostico}>
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
                {cargando ? 'Comprobando...' : 'Ejecutar Ping'}
              </button>
            </div>
          </div>
        </form>

        {error && <div className="alert alert-error" style={{ marginTop: 16 }}>{error}</div>}

        {(salida || cargando) && (
          <div style={{ marginTop: 16 }}>
            <span className="label">Consola de Diagnóstico:</span>
            <pre className="terminal">
              {cargando ? '⚡ Enviando paquetes ICMP al host indicado...' : salida}
            </pre>
          </div>
        )}
      </div>
    </>
  );
}
