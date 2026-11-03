// src/features/reportes/reportesIU.jsx - Generación de reportes (solo admin)
import { useEffect, useState } from 'react';
import { api } from '../../core/api.js';

const REPORTES = {
  notas: {
    titulo: 'Reporte de notas',
    columnas: [
      ['carnet', 'Carnet'], ['estudiante', 'Estudiante'], ['curso', 'Curso'],
      ['calificacion', 'Nota'], ['ciclo', 'Ciclo'], ['año', 'Año'], ['estado', 'Estado']
    ],
    stats: (r) => [
      ['Calificaciones', r.total], ['Promedio general', r.promedio ?? '—'],
      ['Aprobados', r.aprobados ?? 0], ['Reprobados', r.reprobados ?? 0]
    ]
  },
  estudiantes: {
    titulo: 'Reporte de estudiantes',
    columnas: [
      ['carnet', 'Carnet'], ['nombres', 'Nombres'], ['apellidos', 'Apellidos'],
      ['email_educativo', 'Correo'], ['cursos', 'Cursos'], ['promedio', 'Promedio'], ['cuenta', 'Cuenta']
    ],
    stats: (r) => [
      ['Estudiantes', r.total], ['Con cuenta', r.conCuenta],
      ['Sin cuenta', r.sinCuenta], ['Sin notas', r.sinNotas]
    ]
  },
  usuarios: {
    titulo: 'Reporte de usuarios',
    columnas: [
      ['id_usuario', 'ID'], ['username', 'Usuario'], ['email', 'Correo'],
      ['rol', 'Rol'], ['carnet', 'Carnet'], ['creado_el', 'Creado el']
    ],
    stats: (r) => [['Usuarios', r.total], ['Administradores', r.admins], ['Estudiantes', r.estudiantes]]
  }
};

function exportarCSV(nombre, columnas, filas) {
  const escapar = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lineas = [
    columnas.map(([, titulo]) => escapar(titulo)).join(','),
    ...filas.map((f) => columnas.map(([clave]) => escapar(f[clave])).join(','))
  ];
  // BOM para que Excel respete tildes y ñ
  const blob = new Blob(['\uFEFF' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nombre}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportesIU() {
  const [tipo, setTipo] = useState('notas');
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setDatos(null);
    setError('');
    api(`/api/reportes/${tipo}`).then((data) => {
      if (data.exito) setDatos(data);
      else setError(data.mensaje || 'No se pudo generar el reporte.');
    });
  }, [tipo]);

  const def = REPORTES[tipo];

  return (
    <>
      <div className="page-header no-print">
        <h2>📊 Reportes</h2>
        <p>Genera, exporta o imprime reportes de notas, estudiantes y usuarios.</p>
      </div>

      <div className="tabs no-print">
        {Object.entries(REPORTES).map(([id, r]) => (
          <button key={id} className={`tab ${tipo === id ? 'active' : ''}`} onClick={() => setTipo(id)}>
            {r.titulo.replace('Reporte de ', '')}
          </button>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {!datos && !error && <div className="card empty">Generando reporte...</div>}

      {datos && (
        <div className="card">
          <div className="detalle-head">
            <div>
              <h3>{def.titulo}</h3>
              <small className="muted">Generado el {new Date().toLocaleString('es-GT')}</small>
            </div>
            <div className="toolbar no-print" style={{ marginBottom: 0 }}>
              <button className="btn btn-ghost" onClick={() => exportarCSV(tipo, def.columnas, datos.filas)}>⬇ Exportar CSV</button>
              <button className="btn" onClick={() => window.print()}>🖨 Imprimir</button>
            </div>
          </div>

          <div className="stats">
            {def.stats(datos.resumen).map(([etiqueta, valor]) => (
              <div key={etiqueta} className="stat"><span>{etiqueta}</span><b>{valor}</b></div>
            ))}
          </div>

          {tipo === 'notas' && datos.porCurso?.length > 0 && (
            <>
              <h4 className="section-title" style={{ marginTop: 8 }}>Resumen por curso</h4>
              <div className="table-wrap" style={{ marginTop: 8 }}>
                <table className="table">
                  <thead><tr><th>Curso</th><th>Estudiantes</th><th>Promedio</th><th>Máxima</th><th>Mínima</th></tr></thead>
                  <tbody>
                    {datos.porCurso.map((c) => (
                      <tr key={c.curso}>
                        <td>{c.curso}</td><td>{c.estudiantes}</td><td>{c.promedio}</td><td>{c.maxima}</td><td>{c.minima}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <h4 className="section-title" style={{ marginTop: 24 }}>Detalle de calificaciones</h4>
            </>
          )}

          <div className="table-wrap" style={{ marginTop: 8 }}>
            <table className="table">
              <thead>
                <tr>{def.columnas.map(([clave, titulo]) => <th key={clave}>{titulo}</th>)}</tr>
              </thead>
              <tbody>
                {datos.filas.length === 0 ? (
                  <tr><td colSpan={def.columnas.length} className="empty">Sin datos.</td></tr>
                ) : (
                  datos.filas.map((f, i) => (
                    <tr key={i}>
                      {def.columnas.map(([clave]) => (
                        <td key={clave} className={clave === 'estado' ? (f.estado === 'Aprobado' ? 'grade ok' : 'grade low') : ''}>
                          {f[clave] ?? '—'}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

