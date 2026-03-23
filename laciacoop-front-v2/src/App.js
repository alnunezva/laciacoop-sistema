import React, { useEffect, useState } from 'react';

function App() {
  const [socios, setSocios] = useState([]);

  useEffect(() => {
    // IMPORTANTE: En Azure usamos ruta relativa '/api/getSocios'
    fetch('/api/getSocios') 
      .then(res => res.json())
      .then(data => setSocios(data))
      .catch(err => console.error("Error cargando socios:", err));
  }, []);

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      <h1 style={{ color: '#1a365d' }}>🚜 Gestión de Socios LACIACOOP</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <thead>
          <tr style={{ backgroundColor: '#1a365d', color: 'white', textAlign: 'left' }}>
            <th style={{ padding: '15px' }}>Nombre</th>
            <th style={{ padding: '15px' }}>RUT</th>
            <th style={{ padding: '15px' }}>Estado Cédula</th>
          </tr>
        </thead>
        <tbody>
          {socios.length > 0 ? socios.map(socio => (
            <tr key={socio.id} style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: '15px' }}>{socio.nombre}</td>
              <td style={{ padding: '15px' }}>{socio.rut}</td>
              <td style={{ padding: '15px' }}>
                <span style={{ 
                  padding: '5px 10px', 
                  borderRadius: '15px', 
                  backgroundColor: socio.documentos?.cedula_identidad?.estado === 'Cargado' ? '#dcfce7' : '#fee2e2',
                  color: socio.documentos?.cedula_identidad?.estado === 'Cargado' ? '#166534' : '#991b1b'
                }}>
                  {socio.documentos?.cedula_identidad?.estado || 'Pendiente'}
                </span>
              </td>
            </tr>
          )) : (
            <tr><td colSpan="3" style={{ padding: '20px', textAlign: 'center' }}>Cargando datos del búnker...</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default App;