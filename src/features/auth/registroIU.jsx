// src/features/auth/registroIU.jsx - Formulario de registro con selección de carrera y carnet automático
import { useEffect, useState } from 'react';
import { api } from '../../core/api.js';

const VACIO = { id_carrera: '', nombres: '', apellidos: '', email: '', DPI: '', username: '', pass: '', confirmar: '' };

export default function RegistroIU({ onRegistrado, onCancelar }) {
  const [form, setForm] = useState(VACIO);
  const [carreras, setCarreras] = useState([]);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    api('/api/cursos/carreras').then((res) => {
      if (res.exito && res.carreras?.length > 0) {
        setCarreras(res.carreras);
        setForm((prev) => ({ ...prev, id_carrera: res.carreras[0].id_carrera }));
      }
    });
  }, []);

  const set = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (Object.values(form).some((v) => !v.trim())) return setError('Completa todos los campos requeridos.');
    if (form.pass.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');
    if (form.pass !== form.confirmar) return setError('Las contraseñas no coinciden.');

    setCargando(true);
    try {
      const { confirmar: _confirmar, ...datos } = form;
      const data = await api('/api/auth/registro', {
        method: 'POST',
        body: {
          ...datos,
          email_educativo: form.email,
          email: form.email
        }
      });
      if (data.exito) {
        onRegistrado(form.username, data.mensaje);
      } else {
        setError(data.mensaje || 'No se pudo completar el registro.');
      }
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="field">
        <label className="label">Carrera Universitaria</label>
        <select
          className="input"
          value={form.id_carrera}
          onChange={set('id_carrera')}
          required
        >
          {carreras.map((c) => (
            <option key={c.id_carrera} value={c.id_carrera}>
              {c.nombre_carrera} ({c.id_carrera}) - {c.jornada}
            </option>
          ))}
        </select>
        <small className="muted" style={{ display: 'block', marginTop: '4px' }}>
          * Tu carnet oficial será generado automáticamente al registrarte.
        </small>
      </div>

      <div className="form-row">
        <div className="field">
          <label className="label">Nombres</label>
          <input className="input" value={form.nombres} onChange={set('nombres')} required autoFocus />
        </div>
        <div className="field">
          <label className="label">Apellidos</label>
          <input className="input" value={form.apellidos} onChange={set('apellidos')} required />
        </div>
      </div>

      <div className="form-row">
        <div className="field">
          <label className="label">DPI</label>
          <input className="input" value={form.DPI} onChange={set('DPI')} placeholder="13 dígitos" required />
        </div>
        <div className="field">
          <label className="label">Correo educativo</label>
          <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="usuario@universidad.edu" required />
        </div>
      </div>

      <div className="field">
        <label className="label">Nombre de Usuario</label>
        <input className="input" value={form.username} onChange={set('username')} required />
      </div>

      <div className="form-row">
        <div className="field">
          <label className="label">Contraseña</label>
          <input className="input" type="password" value={form.pass} onChange={set('pass')} required />
        </div>
        <div className="field">
          <label className="label">Confirmar Contraseña</label>
          <input className="input" type="password" value={form.confirmar} onChange={set('confirmar')} required />
        </div>
      </div>

      <button className="btn btn-block" type="submit" disabled={cargando || carreras.length === 0}>
        {cargando ? 'Generando carnet y creando cuenta...' : 'Crear cuenta'}
      </button>

      <p className="auth-switch">
        ¿Ya tienes cuenta?{' '}
        <button type="button" className="link" onClick={onCancelar}>Inicia sesión</button>
      </p>
    </form>
  );
}
