// src/features/estudiantes/estudiantesIU.jsx - Búsqueda de estudiantes (solo admin)
import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '../../core/api.js';

export default function EstudiantesIU() {
  const [q, setQ] = useState('');
  const [estudiantes, setEstudiantes] = useState([]);
  const [detalle, setDetalle] = useState(null);
  const [error, setError] = useState('');

  const buscar = async (texto = q) => {
    setError('');
    const data = await api(`/api/estudiantes?q=${encodeURIComponent(texto)}`);
    if (data.exito) setEstudiantes(data.estudiantes);
    else setError(data.mensaje || 'No se pudo realizar la búsqueda.');
  };

  const verDetalle = async (carnet) => {
    const data = await api(`/api/estudiantes/${encodeURIComponent(carnet)}`);
    if (data.exito) setDetalle(data);
    else setError(data.mensaje || 'No se pudo cargar el estudiante.');
  };

  useEffect(() => {
    buscar('');
  }, []);

  return (
    <>
      <div className="page-header">
        <h2>
          <span className="page-header-icon"><Search size={24} /></span>
          Búsqueda de estudiantes
        </h2>
        <p>Busca por carnet, nombre, apellido o correo educativo.</p>
      </div>

      <div className="card">
        <form className="toolbar" onSubmit={(e) => { e.preventDefault(); buscar(); }}>
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar estudiante..." />
          <button className="btn btn-with-icon" type="submit">
            <Search size={16} /> Buscar
          </button>
        </form>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Carnet</th>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Cuenta</th>
                <th>Cursos</th>
                <th>Promedio</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {estudiantes.length === 0 ? (
                <tr><td colSpan="7" className="empty">No se encontraron estudiantes.</td></tr>
              ) : (
                estudiantes.map((s) => (
                  <tr key={s.carnet} className={detalle?.estudiante.carnet === s.carnet ? 'row-active' : ''}>
                    <td>{s.carnet}</td>
                    <td>{s.nombres} {s.apellidos}</td>
                    <td>{s.email_educativo}</td>
                    <td>{s.username || <span className="muted">Sin cuenta</span>}</td>
                    <td>{s.cursos}</td>
                    <td>{s.promedio ?? '—'}</td>
                    <td><button className="btn btn-sm btn-ghost" onClick={() => verDetalle(s.carnet)}>Ver</button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detalle && (
        <div className="card detalle">
          <div className="detalle-head">
            <h3>{detalle.estudiante.nombres} {detalle.estudiante.apellidos}</h3>
            <button className="btn btn-sm btn-ghost" onClick={() => setDetalle(null)}>Cerrar</button>
          </div>

          <div className="perfil-grid">
            <div>
              <h4 className="section-title">Tabla maestra</h4>
              <div className="dato"><span className="dato-label">Carnet</span><span className="dato-valor">{detalle.estudiante.carnet}</span></div>
              <div className="dato"><span className="dato-label">Correo</span><span className="dato-valor">{detalle.estudiante.email_educativo}</span></div>
              <div className="dato"><span className="dato-label">DPI</span><span className="dato-valor">{detalle.estudiante.DPI}</span></div>
            </div>
            <div>
              <h4 className="section-title">Cuenta de usuario</h4>
              {detalle.usuario ? (
                <>
                  <div className="dato"><span className="dato-label">Usuario</span><span className="dato-valor">{detalle.usuario.username}</span></div>
                  <div className="dato"><span className="dato-label">Rol</span><span className="dato-valor">{detalle.usuario.rol}</span></div>
                  <div className="dato"><span className="dato-label">Creado el</span><span className="dato-valor">{detalle.usuario.creado_el}</span></div>
                </>
              ) : (
                <p className="muted">Este estudiante no tiene cuenta.</p>
              )}
            </div>
          </div>

          <h4 className="section-title" style={{ marginTop: 20 }}>Expediente</h4>
          <table className="table">
            <thead><tr><th>Curso</th><th>Nota</th><th>Ciclo</th></tr></thead>
            <tbody>
              {detalle.expedientes.length === 0 ? (
                <tr><td colSpan="3" className="empty">Sin calificaciones registradas.</td></tr>
              ) : (
                detalle.expedientes.map((x, i) => (
                  <tr key={i}>
                    <td>{x.curso}</td>
                    <td className={`grade ${x.calificacion >= 61 ? 'ok' : 'low'}`}>{x.calificacion}</td>
                    <td>{x.ciclo} ({x.año})</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

