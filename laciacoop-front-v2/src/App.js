import React, { useEffect, useState } from 'react';
import { useIdleTimer } from './useIdleTimer';

function App() {
  const [userInfo, setUserInfo] = useState(null);
  const [socios, setSocios] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSocio, setSelectedSocio] = useState(null);

  const logout = () => window.location.href = "/.auth/logout?post_logout_redirect_uri=/";
  useIdleTimer(logout, 15 * 60 * 1000); // 15 min inactividad

  useEffect(() => {
    fetch('/.auth/me').then(res => res.json()).then(data => {
      if (data.clientPrincipal) setUserInfo(data.clientPrincipal);
    });
  }, []);

  useEffect(() => {
    if (userInfo) {
      fetch('/api/getSocios').then(res => res.json()).then(data => setSocios(data));
    }
  }, [userInfo]);

  const filteredSocios = socios.filter(s => 
    s.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.rut.includes(searchTerm)
  );

  if (!userInfo) return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#1a365d' }}>
      <h1 style={{ color: 'white' }}>🚜 DMS LACIACOOP</h1>
      <a href="/.auth/login/google" style={{ padding: '15px 30px', background: 'white', borderRadius: '5px', textDecoration: 'none', color: '#1a365d', fontWeight: 'bold' }}>
        Entrar con Google Workspace
      </a>
    </div>
  );

  return (
    <div style={{ padding: '20px', background: '#f8f9fa', minHeight: '100vh' }}>
      {/* HEADER & DASHBOARD */}
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2>📊 Dashboard General</h2>
          <p>Total Socios: <strong>{socios.length}</strong> | Documentos Cargados: <strong>{socios.reduce((acc, s) => acc + Object.values(s.documentos).filter(d => d.status === 'Cargado').length, 0)}</strong></p>
        </div>
        <button onClick={logout} style={{ height: '40px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '5px' }}>Salir</button>
      </header>

      {/* BÚSQUEDA */}
      <input 
        type="text" 
        placeholder="🔍 Buscar por Nombre o RUT..." 
        style={{ width: '100%', padding: '15px', marginBottom: '20px', borderRadius: '10px', border: '1px solid #ddd' }}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div style={{ display: 'grid', gridTemplateColumns: selectedSocio ? '1fr 1fr' : '1fr', gap: '20px' }}>
        {/* TABLA DE SOCIOS */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '10px', maxHeight: '70vh', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                <th>Socio</th>
                <th>RUT</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filteredSocios.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td>{s.nombre}</td>
                  <td>{s.rut}</td>
                  <td><button onClick={() => setSelectedSocio(s)} style={{ padding: '5px 10px', cursor: 'pointer' }}>📁 Ver Ficha</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FICHA TÉCNICA Y DOCUMENTAL */}
        {selectedSocio && (
          <div style={{ background: 'white', padding: '20px', borderRadius: '10px', border: '2px solid #1a365d' }}>
            <h3>📂 Ficha: {selectedSocio.nombre}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px', marginBottom: '20px' }}>
              <p><strong>RUT:</strong> {selectedSocio.rut}</p>
              <p><strong>Ingreso:</strong> {selectedSocio.fecha_incorporacion}</p>
              <p><strong>Dirección:</strong> {selectedSocio.domicilio}</p>
            </div>
            
            <h4>📑 Carpeta Digital (11 Documentos)</h4>
            <div style={{ height: '400px', overflowY: 'auto' }}>
              {Object.keys(selectedSocio.documentos).map(key => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #f0f0f0' }}>
                  <span style={{ fontSize: '13px' }}>{key.replace(/_/g, ' ').toUpperCase()}</span>
                  <div>
                    <span style={{ fontSize: '11px', marginRight: '10px', color: selectedSocio.documentos[key].status === 'Cargado' ? 'green' : 'red' }}>
                      ● {selectedSocio.documentos[key].status}
                    </span>
                    <input type="file" style={{ fontSize: '10px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default App;