// src/features/perfil/perfilIU.jsx - Información del usuario y del alumno
import { useEffect, useState } from 'react';
import { User, GraduationCap } from 'lucide-react';
import { api } from '../../core/api.js';

function Dato({ etiqueta, valor }) {
  return (
    <div className="dato">
      <span className="dato-label">{etiqueta}</span>
      <span className="dato-valor">{valor ?? '—'}</span>
    </div>
  );
}

export default function PerfilIU({ user }) {
  const [perfil, setPerfil] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const cargar = async () => {
      try {
        const data = await api(`/api/perfil/${user.id}`);
        if (data.exito) setPerfil(data);
        else setError(data.mensaje || 'No se pudo cargar el perfil.');
      } catch {
        setError('No se pudo conectar con el servidor.');
      }
    };
    cargar();
  }, [user.id]);

  const u = perfil?.usuario;
  const e = perfil?.estudiante;

  return (
    <>
      <div className="page-header">
        <h2>
          <span className="page-header-icon"><User size={24} /></span>
          Mi perfil
        </h2>
        <p>Información de tu cuenta y de tu registro como estudiante.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {!perfil && !error && <div className="card empty">Cargando información...</div>}

      {perfil && (
        <div className="perfil-grid">
          <div className="card">
            <div className="perfil-head">
              <div className="avatar avatar-lg">{u.username.charAt(0)}</div>
              <div>
                <h3>{u.username}</h3>
                <span className="badge badge-soft">{u.rol}</span>
              </div>
            </div>
            <h4 className="section-title">Cuenta de usuario</h4>
            <Dato etiqueta="ID de usuario" valor={u.id_usuario} />
            <Dato etiqueta="Usuario" valor={u.username} />
            <Dato etiqueta="Correo" valor={u.email} />
            <Dato etiqueta="Rol" valor={u.rol} />
            <Dato etiqueta="Carnet vinculado" valor={u.carnet_estudiante} />
            <Dato etiqueta="Creado el" valor={u.creado_el} />
          </div>

          <div className="card">
            <div className="perfil-head">
              <div className="avatar avatar-lg">
                <GraduationCap size={24} />
              </div>
              <div>
                <h3>{e ? `${e.nombres} ${e.apellidos}` : 'Sin estudiante vinculado'}</h3>
                {e && <span className="badge badge-soft">Carnet {e.carnet}</span>}
              </div>
            </div>
            <h4 className="section-title">Datos del estudiante</h4>
            {e ? (
              <>
                <Dato etiqueta="ID de estudiante" valor={e.id_estudiante} />
                <Dato etiqueta="Carnet" valor={e.carnet} />
                <Dato etiqueta="Nombres" valor={e.nombres} />
                <Dato etiqueta="Apellidos" valor={e.apellidos} />
                <Dato etiqueta="Correo educativo" valor={e.email_educativo} />
                <Dato etiqueta="DPI" valor={e.DPI} />
              </>
            ) : (
              <p className="empty">Esta cuenta no tiene un registro en la tabla maestra de estudiantes.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

