// src/core/App.jsx - Shell principal: login, menú lateral por rol y enrutado de módulos
import { useState } from 'react';
import './App.css';
import { setToken } from './api.js';
import {
  GraduationCap,
  BookOpen,
  MessageSquare,
  Search,
  BarChart3,
  User as UserIcon,
  Home,
  LogOut,
  BookPlus,
  UserCheck,
  Terminal
} from 'lucide-react';

import AuthIU from '../features/auth/authIU.jsx';
import ExpedientesIU from '../features/expedientes/expedientesIU.jsx';
import ComentariosIU from '../features/comentarios/comentariosIU.jsx';
import EstudiantesIU from '../features/estudiantes/estudiantesIU.jsx';
import ReportesIU from '../features/reportes/reportesIU.jsx';
import PerfilIU from '../features/perfil/perfilIU.jsx';
import CursosIU from '../features/cursos/cursosIU.jsx';
import AsignacionesIU from '../features/asignaciones/asignacionesIU.jsx';
import SistemaIU from '../features/sistema/sistemaIU.jsx';

// Cada módulo declara qué roles pueden verlo
const MODULOS = [
  {
    id: 'cursos',
    Icon: BookPlus,
    titulo: 'Cursos',
    descripcion: 'Catálogo y creación de cursos por carrera.',
    roles: ['admin', 'estudiante'],
    Componente: CursosIU
  },
  {
    id: 'asignaciones',
    Icon: UserCheck,
    titulo: 'Asignaciones',
    descripcion: 'Asignación de cursos semestrales para estudiantes.',
    roles: ['admin', 'estudiante'],
    Componente: AsignacionesIU
  },
  {
    id: 'expedientes',
    Icon: BookOpen,
    titulo: 'Expedientes',
    descripcion: 'Consulta calificaciones y gestión de notas docentes.',
    roles: ['admin', 'estudiante'],
    Componente: ExpedientesIU
  },
  {
    id: 'comentarios',
    Icon: MessageSquare,
    titulo: 'Foro de consultas',
    descripcion: 'Publica dudas y revisa los mensajes de la comunidad.',
    roles: ['admin', 'estudiante'],
    Componente: ComentariosIU
  },
  {
    id: 'estudiantes',
    Icon: Search,
    titulo: 'Estudiantes',
    descripcion: 'Busca estudiantes y revisa su información completa.',
    roles: ['admin'],
    Componente: EstudiantesIU
  },
  {
    id: 'reportes',
    Icon: BarChart3,
    titulo: 'Reportes',
    descripcion: 'Genera reportes de notas, estudiantes, cursos y usuarios.',
    roles: ['admin'],
    Componente: ReportesIU
  },
  {
    id: 'perfil',
    Icon: UserIcon,
    titulo: 'Mi perfil',
    descripcion: 'Información de tu cuenta de usuario y tus datos de estudiante.',
    roles: ['admin', 'estudiante'],
    Componente: PerfilIU
  },
  {
    id: 'sistema',
    Icon: Terminal,
    titulo: 'Diagnóstico de Red',
    descripcion: 'Herramienta de conectividad y comprobación de red.',
    roles: ['admin', 'estudiante'],
    Componente: SistemaIU
  }
];

function Bienvenida({ user, modulos, onNavegar }) {
  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <>
      <div className="welcome-hero">
        <h2>{saludo}, {user.username}</h2>
        <p>Bienvenido al Portal Universitario. Selecciona un módulo para comenzar.</p>
        <span className="badge">
          {user.rol}{user.carnet ? ` · Carnet ${user.carnet}` : ''}
        </span>
      </div>

      <div className="module-grid">
        {modulos.map((m) => {
          const Icon = m.Icon;
          return (
            <button key={m.id} className="card module-card" onClick={() => onNavegar(m.id)}>
              <div className="module-icon">
                <Icon size={24} />
              </div>
              <h3>{m.titulo}</h3>
              <p>{m.descripcion}</p>
            </button>
          );
        })}
      </div>
    </>
  );
}

const USUARIO_DEFAULT = {
  id: 1,
  username: 'admin',
  rol: 'admin',
  carnet: null
};

export default function App() {
  const [user, setUser] = useState(USUARIO_DEFAULT);
  const [vista, setVista] = useState('inicio');

  const handleLogin = (usuario, token) => {
    setToken(token);
    setUser(usuario);
    setVista('inicio');
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setVista('inicio');
  };

  if (!user) return <AuthIU onLogin={handleLogin} />;

  // Filtrado estricto por roles
  const modulosPermitidos = MODULOS.filter((m) => m.roles.includes(user.rol));
  const moduloActivo = modulosPermitidos.find((m) => m.id === vista);

  return (
    <div className="layout">
      <aside className="sidebar no-print">
        <div className="sidebar-brand">
          <GraduationCap size={24} />
          <span>Portal Universitario</span>
        </div>

        <ul className="menu">
          <li>
            <button
              className={`menu-item ${vista === 'inicio' ? 'active' : ''}`}
              onClick={() => setVista('inicio')}
            >
              <span className="menu-icon"><Home size={18} /></span> Inicio
            </button>
          </li>
          {modulosPermitidos.map((m) => {
            const Icon = m.Icon;
            return (
              <li key={m.id}>
                <button
                  className={`menu-item ${vista === m.id ? 'active' : ''}`}
                  onClick={() => setVista(m.id)}
                >
                  <span className="menu-icon"><Icon size={18} /></span> {m.titulo}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="sidebar-user">
          <div className="avatar">{user.username.charAt(0)}</div>
          <div className="sidebar-user-info">
            <b>{user.username}</b>
            <small>{user.rol}</small>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Cerrar sesión">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <main className="content">
        {moduloActivo ? (
          <moduloActivo.Componente user={user} />
        ) : (
          <Bienvenida user={user} modulos={modulosPermitidos} onNavegar={setVista} />
        )}
      </main>
    </div>
  );
}
