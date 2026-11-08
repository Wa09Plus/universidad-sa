// src/features/expedientes/expedientesIU.jsx - Consulta de expedientes académicos y asignación de notas (Admin)
import { useEffect, useState } from 'react';
import { BookOpen, Search, CheckCircle, Edit3 } from 'lucide-react';
import { api } from '../../core/api.js';

export default function ExpedientesIU({ user }) {
  const esAdmin = user.rol === 'admin';
  const [carnet, setCarnet] = useState('');
  const [expedientes, setExpedientes] = useState([]);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [buscado, setBuscado] = useState(false);

  // Estados para asignación / edición de nota por el Admin
  const [editandoAsignacion, setEditandoAsignacion] = useState(null);
  const [nuevaNota, setNuevaNota] = useState('');
  const [guardandoNota, setGuardandoNota] = useState(false);

  const consultar = async (valor) => {
    setError('');
    setAviso('');
    const data = await api(`/api/expedientes/buscar?carnet=${encodeURIComponent(valor ?? '')}`);
    setBuscado(true);
    if (data.exito) {
      setExpedientes(data.datos || []);
    } else {
      setExpedientes([]);
      setError(data.error || data.mensaje || 'No se pudo completar la consulta.');
    }
  };

  // El estudiante ve su expediente automáticamente
  useEffect(() => {
    if (!esAdmin) consultar(user.carnet);
  }, [esAdmin, user.carnet]);

  const calificados = expedientes.filter((r) => r.calificacion !== null && r.calificacion !== undefined);
  const promedio = calificados.length
    ? (calificados.reduce((s, r) => s + r.calificacion, 0) / calificados.length).toFixed(1)
    : null;

  const handleGuardarNota = async (idAsignacion) => {
    setGuardandoNota(true);
    setError('');
    try {
      const res = await api('/api/expedientes/nota', {
        method: 'PUT',
        body: {
          id_asignacion: idAsignacion,
          calificacion: nuevaNota
        }
      });

      if (res.exito) {
        setAviso('¡Calificación guardada con éxito en el expediente!');
        setEditandoAsignacion(null);
        setNuevaNota('');
        consultar(carnet);
      } else {
        setError(res.mensaje || 'No se pudo registrar la nota');
      }
    } catch {
      setError('Error al comunicarse con el servidor');
    } finally {
      setGuardandoNota(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h2>
          <span className="page-header-icon"><BookOpen size={24} /></span>
          Expedientes Académicos
        </h2>
        <p>
          {esAdmin
            ? 'Consulta cursos y notas por carnet. Asigna o modifica calificaciones de los estudiantes.'
            : 'Tus calificaciones registradas.'}
        </p>
      </div>

      <div className="card">
        {esAdmin && (
          <form className="toolbar" onSubmit={(e) => { e.preventDefault(); consultar(carnet); }}>
            <input
              className="input"
              value={carnet}
              onChange={(e) => setCarnet(e.target.value)}
              placeholder="Número de carnet (ej. 0904-26-001)"
            />
            <button className="btn btn-with-icon" type="submit">
              <Search size={16} /> Consultar
            </button>
          </form>
        )}

        {!esAdmin && promedio && (
          <div className="stats">
            <div className="stat"><span>Asignados</span><b>{expedientes.length}</b></div>
            <div className="stat"><span>Calificados</span><b>{calificados.length}</b></div>
            <div className="stat"><span>Promedio</span><b>{promedio}</b></div>
            <div className="stat"><span>Aprobados</span><b>{calificados.filter((r) => r.calificacion >= 61).length}</b></div>
          </div>
        )}

        {aviso && <div className="alert alert-success">{aviso}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Carnet</th>
                <th>Estudiante</th>
                <th>Carrera</th>
                <th>Curso</th>
                <th>Ciclo / Año</th>
                <th>Nota</th>
                {esAdmin && <th>Acción Docente / Admin</th>}
              </tr>
            </thead>
            <tbody>
              {expedientes.length === 0 ? (
                <tr>
                  <td colSpan={esAdmin ? 7 : 6} className="empty">
                    {buscado ? 'Sin resultados para este carnet.' : 'Realiza una búsqueda para ver expedientes.'}
                  </td>
                </tr>
              ) : (
                expedientes.map((r) => (
                  <tr key={r.id_asignacion}>
                    <td><code>{r.carnet_estudiante}</code></td>
                    <td>{r.nombres} {r.apellidos}</td>
                    <td><small className="muted">{r.nombre_carrera}</small></td>
                    <td><b>{r.curso}</b></td>
                    <td>{r.ciclo} ({r.año})</td>
                    <td>
                      {r.calificacion !== null ? (
                        <span className={`grade ${r.calificacion >= 61 ? 'ok' : 'low'}`}>
                          {r.calificacion} pts
                        </span>
                      ) : (
                        <span className="badge badge-soft">Sin calificar</span>
                      )}
                    </td>
                    {esAdmin && (
                      <td>
                        {editandoAsignacion === r.id_asignacion ? (
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <input
                              type="text"
                              className="input"
                              style={{ width: '80px', padding: '4px 8px' }}
                              value={nuevaNota}
                              placeholder="Nota"
                              onChange={(e) => setNuevaNota(e.target.value)}
                              autoFocus
                            />
                            <button
                              className="btn btn-sm"
                              onClick={() => handleGuardarNota(r.id_asignacion)}
                              disabled={guardandoNota}
                              title="Guardar calificación"
                            >
                              <CheckCircle size={15} /> Guardar
                            </button>
                            <button
                              className="btn btn-sm btn-ghost"
                              onClick={() => {
                                setEditandoAsignacion(null);
                                setNuevaNota('');
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            className="btn btn-sm btn-ghost btn-with-icon"
                            onClick={() => {
                              setEditandoAsignacion(r.id_asignacion);
                              setNuevaNota(r.calificacion !== null ? String(r.calificacion) : '');
                            }}
                          >
                            <Edit3 size={14} /> {r.calificacion !== null ? 'Modificar Nota' : 'Asignar Nota'}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
