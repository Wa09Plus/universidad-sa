// src/features/auth/authIU.jsx - Pantallas de inicio de sesión y registro
import { useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { api } from '../../core/api.js';
import RegistroIU from './registroIU.jsx';

export default function AuthIU({ onLogin }) {
  const [modo, setModo] = useState('login');
  const [form, setForm] = useState({ username: '', pass: '' });
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setAviso('');
    setCargando(true);
    try {
      const data = await api('/api/auth/login', { method: 'POST', body: form });
      if (data.exito) onLogin(data.usuario, data.token);
      else setError(data.mensaje || 'Credenciales inválidas');
    } catch {
      setError('No se pudo conectar con el servidor. ¿Está corriendo el backend?');
    } finally {
      setCargando(false);
    }
  };

  const handleRegistrado = (username, mensaje) => {
    setForm({ username, pass: '' });
    setAviso(mensaje);
    setError('');
    setModo('login');
  };

  return (
    <div className="login-screen">
      <div className="card login-card">
        <div className="login-brand">
          <div className="login-logo">
            <GraduationCap size={32} />
          </div>
          <h1>Portal Universitario</h1>
          <p>{modo === 'login' ? 'Ingresa con tu usuario institucional' : 'Crea tu cuenta de estudiante'}</p>
        </div>

        {modo === 'registro' ? (
          <RegistroIU onRegistrado={handleRegistrado} onCancelar={() => setModo('login')} />
        ) : (
          <form onSubmit={handleSubmit}>
            {aviso && <div className="alert alert-success">{aviso}</div>}
            {error && <div className="alert alert-error">{error}</div>}

            <div className="field">
              <label className="label" htmlFor="username">Usuario</label>
              <input
                id="username"
                className="input"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="ej. cmendoza"
                autoFocus
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="pass">Contraseña</label>
              <input
                id="pass"
                type="password"
                className="input"
                value={form.pass}
                onChange={(e) => setForm({ ...form, pass: e.target.value })}
                placeholder="••••••••"
              />
            </div>

            <button className="btn btn-block" type="submit" disabled={cargando}>
              {cargando ? 'Ingresando...' : 'Iniciar sesión'}
            </button>

            <p className="auth-switch">
              ¿No tienes cuenta?{' '}
              <button type="button" className="link" onClick={() => { setModo('registro'); setError(''); setAviso(''); }}>
                Regístrate
              </button>
            </p>

            <div className="login-hint">
              Usuarios de prueba:<br />
              <code>admin</code> / <code>admin123</code> · <code>cmendoza</code> / <code>password</code>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
