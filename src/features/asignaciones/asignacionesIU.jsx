// src/features/asignaciones/asignacionesIU.jsx - Asignación de cursos (Admin y Estudiantes)
import { useEffect, useState } from 'react';
import { UserCheck, Trash2, PlusCircle } from 'lucide-react';
import { api } from '../../core/api.js';

export default function AsignacionesIU({ user }) {
  const esAdmin = user.rol === 'admin';
  const [carnetBuscar, setCarnetBuscar] = useState(user.carnet || '');
  const [estudiantesLista, setEstudiantesLista] = useState([]);

  const [estudianteInfo, setEstudianteInfo] = useState(null);
  const [asignaciones, setAsignaciones] = useState([]);
  const [disponibles, setDisponibles] = useState([]);
  const [ciclos, setCiclos] = useState(['Ciclo I', 'Ciclo II']);

  const [idCursoSel, setIdCursoSel] = useState('');
  const [cicloSel, setCicloSel] = useState('Ciclo I');
  const [añoSel, setAñoSel] = useState(new Date().getFullYear());

  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [cargando, setCargando] = useState(false);

  const cargarAsignaciones = async (carnet) => {
    if (!carnet) return;
    setError('');
    setCargando(true);
    try {
      const res = await api(`/api/asignaciones?carnet=${encodeURIComponent(carnet)}`);
      if (res.exito) {
        setEstudianteInfo(res.estudiante);
        setAsignaciones(res.asignaciones);
        setDisponibles(res.disponibles);
        if (res.ciclos) setCiclos(res.ciclos);
        if (res.disponibles?.length > 0 && !idCursoSel) {
          setIdCursoSel(res.disponibles[0].id_curso);
        }
      } else {
        setEstudianteInfo(null);
        setAsignaciones([]);
        setDisponibles([]);
        setError(res.mensaje || 'Error al cargar asignaciones');
      }
    } catch {
      setError('Error al conectar con el servidor');
    } finally {
      setCargando(false);
    }
  };

  // Si es admin, cargar la lista de estudiantes para poder seleccionarlos
  useEffect(() => {
    if (esAdmin) {
      api('/api/estudiantes').then((res) => {
        if (res.exito && res.estudiantes?.length > 0) {
          setEstudiantesLista(res.estudiantes);
          if (!carnetBuscar) {
            setCarnetBuscar(res.estudiantes[0].carnet_estudiante);
            cargarAsignaciones(res.estudiantes[0].carnet_estudiante);
          }
        }
      });
    } else {
      cargarAsignaciones(user.carnet);
    }
  }, [esAdmin]);

  const handleAsignar = async (e) => {
    e.preventDefault();
    setError('');
    setAviso('');

    if (!idCursoSel) {
      setError('Selecciona un curso válido para asignar');
      return;
    }

    try {
      const payload = {
        carnet_estudiante: carnetBuscar,
        id_curso: Number(idCursoSel),
        ciclo: cicloSel,
        año: Number(añoSel)
      };

      const res = await api('/api/asignaciones', { method: 'POST', body: payload });
      if (res.exito) {
        setAviso('¡Curso asignado correctamente!');
        cargarAsignaciones(carnetBuscar);
      } else {
        setError(res.mensaje || 'No se pudo asignar el curso');
      }
    } catch {
      setError('Error en la asignación');
    }
  };

  const handleEliminar = async (idAsignacion) => {
    if (!confirm('¿Seguro que deseas desasignar este curso?')) return;
    setError('');
    setAviso('');

    try {
      const res = await api(`/api/asignaciones/${idAsignacion}`, { method: 'DELETE' });
      if (res.exito) {
        setAviso('Asignación eliminada.');
        cargarAsignaciones(carnetBuscar);
      } else {
        setError(res.mensaje || 'No se pudo desasignar el curso');
      }
    } catch {
      setError('Error al eliminar asignación');
    }
  };

  return (
    <>
      <div className="page-header">
        <h2>
          <span className="page-header-icon"><UserCheck size={24} /></span>
          Asignación de Cursos
        </h2>
        <p>{esAdmin ? 'Asigna o retira cursos para los estudiantes registrados.' : 'Asigna los cursos correspondientes a tu carrera.'}</p>
      </div>

      {esAdmin && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <label className="label">Selecciona el Estudiante a gestionar:</label>
          <div className="toolbar" style={{ marginBottom: 0 }}>
            <select
              className="input"
              value={carnetBuscar}
              onChange={(e) => {
                setCarnetBuscar(e.target.value);
                cargarAsignaciones(e.target.value);
              }}
            >
              {estudiantesLista.map((s) => (
                <option key={s.carnet_estudiante} value={s.carnet_estudiante}>
                  {s.carnet_estudiante} - {s.nombres} {s.apellidos} ({s.nombre_carrera})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {aviso && <div className="alert alert-success">{aviso}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {estudianteInfo && (
        <>
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>
              <PlusCircle size={20} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
              Asignar Curso a: <b>{estudianteInfo.nombres} {estudianteInfo.apellidos}</b> ({estudianteInfo.nombre_carrera})
            </h3>

            <form onSubmit={handleAsignar}>
              <div className="form-row">
                <div className="field">
                  <label className="label">Curso de su Carrera</label>
                  <select
                    className="input"
                    value={idCursoSel}
                    onChange={(e) => setIdCursoSel(e.target.value)}
                    required
                  >
                    {disponibles.map((c) => (
                      <option key={c.id_curso} value={c.id_curso}>
                        {c.nombre_curso} | {c.horario} ({c.catedratico})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="label">Ciclo</label>
                  <select
                    className="input"
                    value={cicloSel}
                    onChange={(e) => setCicloSel(e.target.value)}
                  >
                    {ciclos.map((ci) => (
                      <option key={ci} value={ci}>{ci}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="label">Año</label>
                  <input
                    type="number"
                    className="input"
                    value={añoSel}
                    onChange={(e) => setAñoSel(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button className="btn" type="submit" disabled={cargando || disponibles.length === 0}>
                Asignar Curso
              </button>
            </form>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Cursos Actualmente Asignados ({asignaciones.length})</h3>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Curso</th>
                    <th>Horario</th>
                    <th>Catedrático</th>
                    <th>Ciclo / Año</th>
                    <th>Estado / Calificación</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {asignaciones.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="empty">El estudiante no tiene cursos asignados aún.</td>
                    </tr>
                  ) : (
                    asignaciones.map((a) => (
                      <tr key={a.id_asignacion}>
                        <td><b>{a.nombre_curso}</b></td>
                        <td>{a.horario}</td>
                        <td>{a.catedratico}</td>
                        <td>{a.ciclo} ({a.año})</td>
                        <td>
                          {a.calificacion !== null ? (
                            <span className={`grade ${a.calificacion >= 61 ? 'ok' : 'low'}`}>
                              {a.calificacion} pts
                            </span>
                          ) : (
                            <span className="badge badge-soft">Pendiente de nota</span>
                          )}
                        </td>
                        <td>
                          {a.calificacion === null ? (
                            <button
                              className="btn btn-sm btn-ghost"
                              style={{ color: 'var(--danger)', borderColor: 'var(--border)' }}
                              onClick={() => handleEliminar(a.id_asignacion)}
                              title="Desasignar curso"
                            >
                              <Trash2 size={15} /> Desasignar
                            </button>
                          ) : (
                            <small className="muted">Calificado</small>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}

