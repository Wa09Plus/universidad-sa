// src/features/auth/registroIU.jsx - Formulario de registro de estudiante
import { useState } from 'react';
import { api } from '../../core/api.js';

const VACIO = { carnet: '', nombres: '', apellidos: '', email: '', DPI: '', username: '', pass: '', confirmar: '' };

export default function RegistroIU({ onRegistrado, onCancelar }) {
  const [form, setForm] = useState(VACIO);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const set = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (Object.values(form).some((v) => !v.trim())) return setError('Completa todos los campos.');
    if (form.pass.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');
    if (form.pass !== form.confirmar) return setError('Las contraseñas no coinciden.');

    setCargando(true);
    try {
      const { confirmar, ...datos } = form;
      const data = await api('/api/auth/registro', { method: 'POST', body: datos });
      if (data.exito) onRegistrado(form.username, data.mensaje);
      else setError(data.mensaje || 'No se pudo completar el registro.');
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-row">
        <div className="field">
          <label className="label">Carnet</label>
          <input className="input" value={form.carnet} onChange={set('carnet')} placeholder="2026004" autoFocus />
        </div>
        <div className="field">
          <label className="label">DPI</label>
          <input className="input" value={form.DPI} onChange={set('DPI')} placeholder="13 dígitos" />
        </div>
      </div>

      <div className="form-row">
        <div className="field">
          <label className="label">Nombres</label>
          <input className="input" value={form.nombres} onChange={set('nombres')} />
        </div>
        <div className="field">
          <label className="label">Apellidos</label>
          <input className="input" value={form.apellidos} onChange={set('apellidos')} />
        </div>
      </div>

      <div className="field">
        <label className="label">Correo educativo</label>
        <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="usuario@universidad.edu" />
      </div>

      <div className="field">
        <label className="label">Usuario</label>
        <input className="input" value={form.username} onChange={set('username')} />
      </div>

      <div className="form-row">
        <div className="field">
          <label className="label">Contraseña</label>
          <input className="input" type="password" value={form.pass} onChange={set('pass')} />
        </div>
        <div className="field">
          <label className="label">Confirmar</label>
          <input className="input" type="password" value={form.confirmar} onChange={set('confirmar')} />
        </div>
      </div>

      <button className="btn btn-block" type="submit" disabled={cargando}>
        {cargando ? 'Creando cuenta...' : 'Crear cuenta'}
      </button>

      <p className="auth-switch">
        ¿Ya tienes cuenta?{' '}
        <button type="button" className="link" onClick={onCancelar}>Inicia sesión</button>
      </p>
    </form>
  );
}

