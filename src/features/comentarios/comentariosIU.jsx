// src/features/comentarios/comentariosIU.jsx - Foro de consultas
import { useEffect, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { api } from '../../core/api.js';

export default function ComentariosIU({ user }) {
  const esAdmin = user.rol === 'admin';
  const [comentarios, setComentarios] = useState([]);
  const [estudiantes, setEstudiantes] = useState([]);
  const [carnet, setCarnet] = useState(user.carnet || '');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const cargar = async () => {
    const data = await api('/api/comentarios');
    if (data.exito) setComentarios(data.comentarios);
    else setError(data.mensaje || 'No se pudieron cargar los comentarios.');
  };

  useEffect(() => {
    cargar();
    // El admin elige a qué estudiante va dirigido su comentario
    if (esAdmin) {
      api('/api/estudiantes').then((data) => {
        if (data.exito) {
          setEstudiantes(data.estudiantes);
          if (data.estudiantes.length) setCarnet(data.estudiantes[0].carnet);
        }
      });
    }
  }, [esAdmin]);

  const publicar = async (e) => {
    e.preventDefault();
    if (!mensaje.trim()) return;
    setError('');
    const data = await api('/api/comentarios', {
      method: 'POST',
      body: { carnet_estudiante: carnet, autor: user.username, mensaje }
    });
    if (!data.exito) return setError(data.mensaje || 'No se pudo publicar el comentario.');
    setMensaje('');
    cargar();
  };

  return (
    <>
      <div className="page-header">
        <h2>
          <span className="page-header-icon"><MessageSquare size={24} /></span>
          Foro de consultas
        </h2>
        <p>Publica dudas y revisa los mensajes de la comunidad.</p>
      </div>

      <div className="card">
        <form onSubmit={publicar}>
          <div className="form-row">
            <div className="field">
              <label className="label">Publicando como</label>
              <input className="input" value={`${user.username} (${user.rol})`} disabled />
            </div>
            <div className="field">
              <label className="label">{esAdmin ? 'Dirigido al estudiante' : 'Carnet'}</label>
              {esAdmin ? (
                <select className="input" value={carnet} onChange={(e) => setCarnet(e.target.value)}>
                  {estudiantes.map((s) => (
                    <option key={s.carnet} value={s.carnet}>
                      {s.carnet} · {s.nombres} {s.apellidos}
                    </option>
                  ))}
                </select>
              ) : (
                <input className="input" value={carnet} disabled />
              )}
            </div>
          </div>
          <div className="field">
            <label className="label">Mensaje</label>
            <textarea
              className="input"
              rows="3"
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder="Escribe tu consulta..."
            />
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <button className="btn btn-with-icon" type="submit">
            <Send size={16} /> Publicar mensaje
          </button>
        </form>

        <div className="comment-list">
          {comentarios.length === 0 && <div className="empty">Aún no hay comentarios.</div>}
          {comentarios.map((c) => (
            <div key={c.id_comentario} className="comment">
              <div className="avatar">{(c.autor || '?').charAt(0)}</div>
              <div className="comment-body">
                <div className="comment-meta">
                  <b>{c.autor}</b>{c.timestamp} · Carnet {c.carnet_estudiante}
                </div>
                <div dangerouslySetInnerHTML={{ __html: c.mensaje }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
