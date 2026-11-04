// src/features/expedientes/expedientesIU.jsx - Consulta de expedientes académicos
import { useEffect, useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { api } from '../../core/api.js';

export default function ExpedientesIU({ user }) {
  const esAdmin = user.rol === 'admin';
  const [carnet, setCarnet] = useState('');
  const [expedientes, setExpedientes] = useState([]);
  const [error, setError] = useState('');
  const [buscado, setBuscado] = useState(false);

  const consultar = async (valor) => {
    setError('');
    const data = await api(`/api/expedientes/buscar?carnet=${encodeURIComponent(valor ?? '')}`);
    setBuscado(true);
    if (data.exito) {
      setExpedientes(data.datos);
    } else {
      setExpedientes([]);
      setError(data.mensaje || 'No se pudo completar la consulta.');
    }
  };

  // El estudiante ve su expediente automáticamente (el backend usa su carnet)
  useEffect(() => {
    if (!esAdmin) consultar(user.carnet);
  }, [esAdmin, user.carnet]);

  const promedio = expedientes.length
    ? (expedientes.reduce((s, r) => s + r.calificacion, 0) / expedientes.length).toFixed(1)
    : null;

  return (
    <>
      <div className="page-header">
        <h2>
          <span className="page-header-icon"><BookOpen size={24} /></span>
          Expedientes académicos
        </h2>
        <p>{esAdmin ? 'Consulta las calificaciones de cualquier estudiante por carnet.' : 'Tus calificaciones registradas.'}</p>
      </div>

      <div className="card">
        {esAdmin && (
          <form className="toolbar" onSubmit={(e) => { e.preventDefault(); consultar(carnet); }}>
            <input
              className="input"
              value={carnet}
              onChange={(e) => setCarnet(e.target.value)}
              placeholder="Número de carnet"
            />
            <button className="btn btn-with-icon" type="submit">
              <Search size={16} /> Consultar
            </button>
          </form>
        )}

        {!esAdmin && promedio && (
          <div className="stats">
            <div className="stat"><span>Cursos</span><b>{expedientes.length}</b></div>
            <div className="stat"><span>Promedio</span><b>{promedio}</b></div>
            <div className="stat"><span>Aprobados</span><b>{expedientes.filter((r) => r.calificacion >= 61).length}</b></div>
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Carnet</th>
                <th>Estudiante</th>
                <th>DPI</th>
                <th>Curso</th>
                <th>Nota</th>
                <th>Ciclo</th>
              </tr>
            </thead>
            <tbody>
              {expedientes.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty">
                    {buscado ? 'Sin resultados.' : 'Realiza una búsqueda para ver resultados.'}
                  </td>
                </tr>
              ) : (
                expedientes.map((r, i) => (
                  <tr key={i}>
                    <td>{r.carnet_estudiante}</td>
                    <td>{r.nombres} {r.apellidos}</td>
                    <td>{r.DPI}</td>
                    <td>{r.curso}</td>
                    <td className={`grade ${r.calificacion >= 61 ? 'ok' : 'low'}`}>{r.calificacion}</td>
                    <td>{r.ciclo} ({r.año})</td>
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
