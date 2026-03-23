import React, { useEffect, useState } from 'react';

function App() {
  const [socios, setSocios] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Obtener información de sesión de Azure Static Web Apps
    fetch('/.auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.clientPrincipal) setUserInfo(data.clientPrincipal);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // 2. Obtener lista de socios desde la API
    fetch('/api/getSocios')
      .then(res => res.json())
      .then(data => setSocios(Array.isArray(data) ? data : []))
      .catch(err => console.error("Error al cargar socios:", err));
  }, []);

  // Lógica de Filtrado (Se aplica a todo el Dashboard)
  const sociosFiltrados = socios.filter(s => 
    s.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.rut?.includes(searchTerm)
  );

  // Estadísticas calculadas sobre el total de socios
  const stats = {
    total: socios.length,
    completos: socios.filter(s => s.documentos && Object.values(s.documentos).every(d => d.status === "Cargado")).length,
    incompletos: socios.length - socios.filter(s => s.documentos && Object.values(s.documentos).every(d => d.status === "Cargado")).length
  };

  // Listas limitadas para las tablas del dashboard
  const ultimosRegistrados = [...sociosFiltrados].reverse().slice(0, 6);
  
  const pendientes = sociosFiltrados
    .filter(s => s.documentos && Object.values(s.documentos).some(d => d.status === "No cargado"))
    .slice(0, 6);

  const logout = () => {
    window.location.href = "/.auth/logout?post_logout_redirect_uri=/";
  };

  // ESTADO DE CARGA
  if (loading) return (
    <div style={centerStyle}>
      <div className="spinner"></div>
      <p style={{ marginTop: '15px', fontWeight: '500' }}>Iniciando entorno seguro...</p>
    </div>
  );

  // PANTALLA DE LOGIN (Si no hay sesión de Azure activa)
  if (!userInfo) return (
    <div style={loginBgStyle}>
      <div style={loginCardStyle}>
        <div style={{ fontSize: '50px', marginBottom: '10px' }}>🚜</div>
        <h1 style={{ color: '#1e293b', marginBottom: '10px', fontSize: '24px' }}>LACIACOOP</h1>
        <p style={{ color: '#64748b', marginBottom: '30px', lineHeight: '1.5' }}>
          Bienvenido al Gestor Documental.<br/>Use su cuenta institucional para entrar.
        </p>
        <a href="/.auth/login/google" style={loginButtonStyle}>
          <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="G" style={{ width: '20px', marginRight: '12px' }} />
          Entrar con Google Workspace
        </a>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '40px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: "'Inter', system-ui, sans-serif" }}>
      
      {/* HEADER / NAVBAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h1 style={{ color: '#0f172a', margin: 0, fontSize: '28px', fontWeight: '800' }}>Panel de Control</h1>
          <p style={{ color: '#64748b', margin: '5px 0 0 0', display: 'flex', alignItems: 'center' }}>
            <span style={{ width: '8px', height: '8px', backgroundColor: '#10b981', borderRadius: '50%', marginRight: '8px' }}></span>
            Sesión activa: <strong style={{ marginLeft: '5px', color: '#334155' }}>{userInfo.userDetails}</strong>
          </p>
        </div>
        <button onClick={logout} style={logoutButtonStyle}>Cerrar Sesión</button>
      </div>

      {/* BUSCADOR */}
      <div style={{ position: 'relative', marginBottom: '40px' }}>
        <input 
          type="text" 
          placeholder="🔍 Buscar socio por nombre, RUT o número de registro..." 
          style={searchStyles}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        <StatCard title="Total de Socios" value={stats.total} color="#3b82f6" icon="👥" />
        <StatCard title="Carpetas al Día" value={stats.completos} color="#10b981" icon="✅" />
        <StatCard title="Pendientes" value={stats.incompletos} color="#f59e0b" icon="⚠️" />
      </div>

      {/* SECCIÓN DE TABLAS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '32px' }}>
        
        {/* TABLA: RECIENTES */}
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>🆕 Últimos Registros</h3>
            <span style={badgeStyle}>Ver todo</span>
          </div>
          <table style={tableStyle}>
            <thead>
              <tr style={thStyle}>
                <th style={{ padding: '12px 0' }}>Socio</th>
                <th style={{ padding: '12px 0' }}>RUT</th>
              </tr>
            </thead>
            <tbody>
              {ultimosRegistrados.map(s => (
                <tr key={s.id} className="row-hover" style={trStyle}>
                  <td style={{ padding: '16px 0', fontWeight: '600', color: '#334155' }}>{s.nombre}</td>
                  <td style={{ padding: '16px 0', color: '#64748b' }}>{s.rut}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* TABLA: ALERTAS */}
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>🚨 Alerta Documental</h3>
            <span style={{ ...badgeStyle, backgroundColor: '#fee2e2', color: '#991b1b' }}>Prioridad</span>
          </div>
          <table style={tableStyle}>
            <thead>
              <tr style={thStyle}>
                <th style={{ padding: '12px 0' }}>Socio</th>
                <th style={{ padding: '12px 0' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {pendientes.map(s => (
                <tr key={s.id} className="row-hover" style={trStyle}>
                  <td style={{ padding: '16px 0', fontWeight: '600', color: '#334155' }}>{s.nombre}</td>
                  <td style={{ padding: '16px 0' }}>
                    <span style={errorLabelStyle}>
                      {Object.values(s.documentos || {}).filter(d => d.status === "No cargado").length} faltantes
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
      
      {/* Estilos CSS inyectados para efectos hover y animaciones */}
      <style>{`
        .row-hover:hover { background-color: #f8fafc; cursor: pointer; }
        .spinner { border: 4px solid rgba(0,0,0,.1); width: 36px; height: 36px; border-radius: 50%; border-left-color: #3b82f6; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// COMPONENTE CARD REUTILIZABLE
const StatCard = ({ title, value, color, icon }) => (
  <div style={{ background: 'white', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', border: '1px solid #f1f5f9' }}>
    <div style={{ fontSize: '32px', marginRight: '20px', background: `${color}15`, width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '14px' }}>{icon}</div>
    <div>
      <h4 style={{ margin: 0, color: '#64748b', fontWeight: '500', fontSize: '14px' }}>{title}</h4>
      <h2 style={{ margin: '4px 0 0 0', color: '#1e293b', fontSize: '28px', fontWeight: '800' }}>{value}</h2>
    </div>
  </div>
);

// ESTILOS MEJORADOS
const centerStyle = { display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f8fafc', color: '#64748b' };
const loginBgStyle = { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'radial-gradient(circle at top right, #334155, #0f172a)' };
const loginCardStyle = { backgroundColor: 'white', padding: '50px', borderRadius: '32px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', maxWidth: '450px', width: '90%' };
const loginButtonStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1e293b', color: 'white', padding: '16px 24px', borderRadius: '16px', textDecoration: 'none', fontWeight: '600', transition: 'transform 0.2s', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' };
const logoutButtonStyle = { backgroundColor: '#ffffff', color: '#ef4444', border: '1px solid #fee2e2', padding: '10px 20px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' };
const searchStyles = { width: '100%', padding: '20px 28px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', fontSize: '16px', outline: 'none', backgroundColor: 'white' };
const panelStyle = { background: 'white', padding: '30px', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' };
const panelHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' };
const badgeStyle = { backgroundColor: '#f1f5f9', color: '#475569', padding: '6px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' };
const tableStyle = { width: '100%', borderCollapse: 'collapse' };
const thStyle = { textAlign: 'left', borderBottom: '2px solid #f1f5f9', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' };
const trStyle = { borderBottom: '1px solid #f8fafc', transition: 'all 0.2s' };
const errorLabelStyle = { backgroundColor: '#fee2e2', color: '#991b1b', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '700' };

export default App;