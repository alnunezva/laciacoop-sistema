import React, { useEffect, useState } from 'react';

function App() {
  const [socios, setSocios] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    fetch('/.auth/me').then(res => res.json()).then(data => {
      if (data.clientPrincipal) setUserInfo(data.clientPrincipal);
    });
    fetch('/api/getSocios').then(res => res.json()).then(data => setSocios(data));
  }, []);

  // Lógica de Dashboard
  const pendientes = socios.filter(s => 
    Object.values(s.documentos).some(d => d.status === "No cargado")
  ).slice(0, 5);

  const ultimosRegistrados = [...socios].reverse().slice(0, 5);

  const stats = {
    total: socios.length,
    completos: socios.filter(s => Object.values(s.documentos).every(d => d.status === "Cargado")).length,
    incompletos: socios.length - socios.filter(s => Object.values(s.documentos).every(d => d.status === "Cargado")).length
  };

  if (!userInfo) return <div style={{textAlign:'center', padding:'50px'}}>Cargando Sistema @cooplacia...</div>;

  return (
    <div style={{ padding: '30px', backgroundColor: '#f4f7f6', minHeight: '100vh', fontFamily: 'Segoe UI' }}>
      
      {/* 1. BUSCADOR SUPERIOR */}
      <div style={{ marginBottom: '30px' }}>
        <input 
          type="text" 
          placeholder="🔍 Buscar socio por Nombre o RUT..." 
          style={{ width: '100%', padding: '15px', borderRadius: '10px', border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* 2. TARJETAS RESUMEN */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
        <Card title="Total Socios" value={stats.total} color="#1a365d" />
        <Card title="Carpetas Completas" value={stats.completos} color="#27ae60" />
        <Card title="Documentación Pendiente" value={stats.incompletos} color="#e67e22" />
      </div>

      {/* 3. TABLAS DE CONTROL */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        
        {/* Tabla A: Últimos registrados */}
        <div style={tableContainerStyle}>
          <h3 style={{color: '#1a365d'}}>🆕 Últimos 5 Socios</h3>
          <table style={{width: '100%', borderCollapse: 'collapse'}}>
            <thead><tr style={headerStyle}><th>Nombre</th><th>RUT</th></tr></thead>
            <tbody>
              {ultimosRegistrados.map(s => (
                <tr key={s.id} style={rowStyle}><td>{s.nombre}</td><td>{s.rut}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tabla B: Pendientes de Documentos */}
        <div style={tableContainerStyle}>
          <h3 style={{color: '#e67e22'}}>⚠️ Documentación Pendiente</h3>
          <table style={{width: '100%', borderCollapse: 'collapse'}}>
            <thead><tr style={headerStyle}><th>Nombre</th><th>Pendientes</th></tr></thead>
            <tbody>
              {pendientes.map(s => (
                <tr key={s.id} style={rowStyle}>
                  <td>{s.nombre}</td>
                  <td style={{color: 'red'}}>
                    {Object.values(s.documentos).filter(d => d.status === "No cargado").length} docs
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

// Componentes Estilizados Rápidos
const Card = ({ title, value, color }) => (
  <div style={{ background: 'white', padding: '20px', borderRadius: '12px', borderLeft: `6px solid ${color}`, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
    <h4 style={{ margin: 0, color: '#7f8c8d' }}>{title}</h4>
    <h2 style={{ margin: '10px 0 0 0', color: color }}>{value}</h2>
  </div>
);

const tableContainerStyle = { background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' };
const headerStyle = { textAlign: 'left', borderBottom: '2px solid #eee', fontSize: '14px' };
const rowStyle = { borderBottom: '1px solid #eee', fontSize: '14px' };

export default App;