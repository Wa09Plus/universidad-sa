// src/features/cursos/cursosIU.jsx - Creación y visualización de cursos
import { useEffect, useState } from 'react';
import { BookPlus, ListFilter } from 'lucide-react';
import { api } from '../../core/api.js';

export default function CursosIU({ user }) {
  const esAdmin = user.rol === 'admin';
  const [cursos, setCursos] = useState([]);
  const [carreras, setCarreras] = useState([]);
  const [carreraFiltro, setCarreraFiltro] = useState('');
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [cargando, setCargando] = useState(false);

  // Formulario para crear curso (solo admin)
  const [form, setForm] = useState({
    id_carrera: '',
    nombre_curso: '',
    horario: '',
    catedratico: ''
  });

  const cargarDatos = async (filtro = carreraFiltro) => {
    setError('');
    const resCursos = await api(`/api/cursos?carrera=${encodeURIComponent(filtro)}`);
    if (resCursos.exito) setCursos(resCursos.cursos);
    else setError(resCursos.mensaje || 'Error al obtener cursos');

    if (esAdmin) {
      const resCarreras = await api('/api/cursos/carreras');
      if (resCarreras.exito) {
        setCarreras(resCarreras.carreras);
        if (!form.id_carrera && resCarreras.carreras.length > 0) {
          setForm((prev) => ({ ...prev, id_carrera: resCarreras.carreras[0].id_carrera }));
        }
      }
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [carreraFiltro]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setAviso('');
    setCargando(true);

    try {
      const res = await api('/api/cursos', { method: 'POST', body: form });
      if (res.exito) {
        setAviso(`¡Curso "${form.nombre_curso}" creado con éxito!`);
        setForm((prev) => ({
          ...prev,
          nombre_curso: '',
          horario: '',
          catedratico: ''
        }));
        cargarDatos();
      } else {
        setError(res.mensaje || 'No se pudo crear el curso');
      }
    } catch {
      setError('Error de comunicación con el servidor');
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h2>
          <span className="page-header-icon"><BookPlus size={24} /></span>
          Gestión de Cursos
        </h2>
        <p>{esAdmin ? 'Crea nuevos cursos o consulta la oferta académica por carrera.' : 'Consulta el catálogo de cursos de tu carrera.'}</p>
      </div>

      {esAdmin && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Crear Nuevo Curso</h3>
          {aviso && <div className="alert alert-success">{aviso}</div>}
          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="field">
                <label className="label">Carrera</label>
                <select
                  className="input"
                  value={form.id_carrera}
                  onChange={(e) => setForm({ ...form, id_carrera: e.target.value })}
                  required
                >
                  {carreras.map((c) => (
                    <option key={c.id_carrera} value={c.id_carrera}>
                      {c.nombre_carrera} ({c.id_carrera})
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="label">Nombre del Curso</label>
                <input
                  className="input"
                  value={form.nombre_curso}
                  onChange={(e) => setForm({ ...form, nombre_curso: e.target.value })}
                  placeholder="ej. Redes de Computadoras"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="field">
                <label className="label">Horario</label>
                <input
                  className="input"
                  value={form.horario}
                  onChange={(e) => setForm({ ...form, horario: e.target.value })}
                  placeholder="ej. 07:00 - 09:00"
                  required
                />
              </div>
              <div className="field">
                <label className="label">Catedrático</label>
                <input
                  className="input"
                  value={form.catedratico}
                  onChange={(e) => setForm({ ...form, catedratico: e.target.value })}
                  placeholder="ej. Ing. Juan Pérez"
                  required
                />
              </div>
            </div>

            <button className="btn" type="submit" disabled={cargando}>
              {cargando ? 'Guardando...' : 'Crear Curso'}
            </button>
          </form>
        </div>
      )}

      <div className="card">
        <div className="detalle-head">
          <h3 style={{ margin: 0 }}>Catálogo de Cursos</h3>
          {esAdmin && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ListFilter size={18} className="muted" />
              <select
                className="input"
                style={{ width: 'auto', padding: '6px 12px' }}
                value={carreraFiltro}
                onChange={(e) => setCarreraFiltro(e.target.value)}
              >
                <option value="">Todas las Carreras</option>
                {carreras.map((c) => (
                  <option key={c.id_carrera} value={c.id_carrera}>
                    {c.nombre_carrera}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Carrera</th>
                <th>Curso</th>
                <th>Horario</th>
                <th>Catedrático</th>
                {esAdmin && <th>Alumnos Asignados</th>}
              </tr>
            </thead>
            <tbody>
              {cursos.length === 0 ? (
                <tr>
                  <td colSpan={esAdmin ? 6 : 5} className="empty">No hay cursos registrados.</td>
                </tr>
              ) : (
                cursos.map((c) => (
                  <tr key={c.id_curso}>
                    <td>{c.id_curso}</td>
                    <td>{c.nombre_carrera}</td>
                    <td><b>{c.nombre_curso}</b></td>
                    <td>{c.horario}</td>
                    <td>{c.catedratico}</td>
                    {esAdmin && <td><span className="badge badge-soft">{c.asignados}</span></td>}
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

