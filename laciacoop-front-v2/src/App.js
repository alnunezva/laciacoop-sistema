import React, { useEffect, useState } from 'react';

function App() {
  const [socios, setSocios] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Obtener información de sesión de Azure SSO
    fetch('/.auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.clientPrincipal) setUserInfo(data.clientPrincipal);
        setLoading(false);
      });

    // 2. Obtener lista de socios
    fetch('/api/getSocios')
      .then(res => res.json())
      .then(data => setSocios(data))
      .catch(err => console.error("Error al cargar socios:", err));
  }, []);

  // Lógica de Filtrado y Dashboard
  const sociosFiltrados = socios.filter(s => 
    s.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.rut.includes(searchTerm)
  );

  const stats = {
    total: socios.length,
    completos: socios.filter(s => s.documentos && Object.values(s.documentos).every(d => d.status === "Cargado")).length,
    incompletos: socios.length - socios.filter(s => s.documentos && Object.values(s.documentos).every(d => d.status === "Cargado")).length
  };

  const ultimosRegistrados = [...sociosFiltrados].reverse().slice(0, 5);
  
  const pendientes = sociosFiltrados
    .filter(s => s.documentos && Object.values(s.documentos).some(d => d.status === "No cargado"))
    .slice(0, 5);

  const logout = () => {
    window.location.href = "/.auth/logout?post_logout_redirect_uri=/";
  };

  if (loading) return <div style={centerStyle}>Cargando entorno seguro...</div>;

  if (!userInfo) return (
    <div style={loginBgStyle}>
      <div style={loginCardStyle}>
        <h1 style={{ color: '#1e293b', marginBottom: '10px' }}>🚜 LACIACOOP</h1>
        <p style={{ color: '#64748b', marginBottom: '30px' }}>Inicie sesión con su cuenta @cooplacia para continuar</p>
        <a href="/.auth/login/google" style={loginButtonStyle}>
          <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="G" style={{ width: '20px', marginRight: '12px' }} />
          Entrar con Google Workspace
        </a>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '40px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      
      {/* NAVBAR / HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h1 style={{ color: '#0f172a', margin: 0, fontSize: '28px' }}>Panel de Control Documental</h1>
          <p style={{ color: '#64748b', margin: '5px 0 0 0' }}>Bienvenido(a), <strong>{userInfo.userDetails}</strong></p>
        </div>
        <button onClick={logout} style={logoutButtonStyle}>Cerrar Sesión</button>
      </div>

      {/* BUSCADOR PROMINENTE */}
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '40px' }}>
        <StatCard title="Total de Socios" value={stats.total} color="#3b82f6" icon="👥" />
        <StatCard title="Carpetas al Día" value={stats.completos} color="#10b981" icon="✅" />
        <StatCard title="Pendientes de Acción" value={stats.incompletos} color="#f59e0b" icon="⚠️" />
      </div>

      {/* TABLES SECTION */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        
        {/* TABLA: ULTIMOS REGISTROS */}
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <h3 style={{ margin: 0 }}>🆕 Últimos Registros</h3>
            <span style={badgeStyle}>Nuevos</span>
          </div>
          <table style={tableStyle}>
            <thead>
              <tr style={thStyle}><th>Socio</th><th>RUT</th></tr>
            </thead>
            <tbody>
              {ultimosRegistrados.map(s => (
                <tr key={s.id} style={trStyle}>
                  <td style={{ fontWeight: '500' }}>{s.nombre}</td>
                  <td style={{ color: '#64748b' }}>{s.rut}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* TABLA: ALERTAS DOCUMENTALES */}
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <h3 style={{ margin: 0 }}>🚨 Alerta Documental</h3>
            <span style={{ ...badgeStyle, backgroundColor: '#fef3c7', color: '#92400e' }}>Urgente</span>
          </div>
          <table style={tableStyle}>
            <thead>
              <tr style={thStyle}><th>Socio</th><th>Documentos Faltantes</th></tr>
            </thead>
            <tbody>
              {pendientes.map(s => (
                <tr key={s.id} style={trStyle}>
                  <td style={{ fontWeight: '500' }}>{s.nombre}</td>
                  <td>
                    <span style={errorLabelStyle}>
                      {Object.values(s.documentos || {}).filter(d => d.status === "No cargado").length} pendientes
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}

// COMPONENTES AUXILIARES
const StatCard = ({ title, value, color, icon }) => (
  <div style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', display: 'flex', alignItems: 'center' }}>
    <div style={{ fontSize: '32px', marginRight: '20px' }}>{icon}</div>
    <div>
      <h4 style={{ margin: 0, color: '#64748b', fontWeight: '500', fontSize: '14px' }}>{title}</h4>
      <h2 style={{ margin: '4px 0 0 0', color: '#1e293b', fontSize: '24px', fontWeight: '700' }}>{value}</h2>
    </div>
    <div style={{ marginLeft: 'auto', width: '4px', height: '40px', backgroundColor: color, borderRadius: '2px' }} />
  </div>
);

// ESTILOS EN OBJETOS (CSS-IN-JS)
const centerStyle = { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f8fafc', color: '#64748b' };

const loginBgStyle = { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' };

const loginCardStyle = { backgroundColor: 'white', padding: '48px', borderRadius: '24px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)', maxWidth: '400px' };

const loginButtonStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', color: '#1e293b', padding: '14px 24px', borderRadius: '12px', textDecoration: 'none', fontWeight: '600', border: '1px solid #e2e8f0', transition: 'all 0.2s' };

const logoutButtonStyle = { backgroundColor: '#fee2e2', color: '#991b1b', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' };

const searchStyles = { width: '100%', padding: '18px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)', fontSize: '16px', outline: 'none', transition: 'border-color 0.2s' };

const panelStyle = { background: 'white', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' };

const panelHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' };

const badgeStyle = { backgroundColor: '#dcfce7', color: '#166534', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' };

const tableStyle = { width: '100%', borderCollapse: 'collapse' };

const thStyle = { textAlign: 'left', borderBottom: '1px solid #f1f5f9', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' };

const trStyle = { borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' };

const errorLabelStyle = { backgroundColor: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '500' };

export default App;