import React, { useEffect, useState } from 'react';
import Papa from 'papaparse'; 

function App() {
  const [socios, setSocios] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socioSeleccionado, setSocioSeleccionado] = useState(null);

  const tiposDocumentos = [
    "Solicitud de incorporación", "Cédula de identidad", "Título de dominio",
    "Pago cuota de incorporación", "Pago cuota de participación", "Transferencias",
    "Cesión de derechos", "Compra y venta", "Actualización de datos",
    "Certificación de factibilidad de agua", "Certificación de deudas de agua"
  ];

  // Configuración de documentos que NO permiten repetición (se mantienen como objeto único)
  const docsUnicos = ["Solicitud de incorporación", "Cédula de identidad", "Pago cuota de incorporación"];

  useEffect(() => {
    fetch('/.auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.clientPrincipal) setUserInfo(data.clientPrincipal);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch(`/api/getSocios?t=${new Date().getTime()}`)
      .then(res => {
        if (!res.ok) throw new Error("Error red");
        return res.json();
      })
      .then(data => setSocios(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error("Error API:", err);
        setSocios([]); 
      });
  }, []);

  const handleGuardar = async (socioAActualizar = socioSeleccionado) => {
    if (!socioAActualizar) return;
    try {
      const response = await fetch('/api/saveSocio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(socioAActualizar)
      });
      if (response.ok) {
        setSocios(socios.map(s => s.id === socioAActualizar.id ? socioAActualizar : s));
        return true;
      }
    } catch (error) {
      console.error("Error al guardar:", error);
      return false;
    }
  };

  const handleUpload = async (docType) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,image/*';

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const response = await fetch(`/api/uploadDoc?socioId=${socioSeleccionado.id}&docType=${encodeURIComponent(docType)}&fileName=${encodeURIComponent(file.name)}`, {
          method: 'POST',
          body: file
        });

        if (response.ok) {
          const result = await response.json();
          const socioActualizado = { ...socioSeleccionado };
          if (!socioActualizado.documentos) socioActualizado.documentos = {};
          
          const nuevoDoc = { status: "Cargado", url: result.url, name: file.name };

          // LÓGICA DE MULTIPLES ARCHIVOS
          if (docsUnicos.includes(docType)) {
            socioActualizado.documentos[docType] = nuevoDoc;
          } else {
            if (!Array.isArray(socioActualizado.documentos[docType])) {
              const anterior = socioActualizado.documentos[docType];
              socioActualizado.documentos[docType] = anterior ? [anterior, nuevoDoc] : [nuevoDoc];
            } else {
              socioActualizado.documentos[docType].push(nuevoDoc);
            }
          }

          const guardadoExitoso = await handleGuardar(socioActualizado);
          if (guardadoExitoso) {
            setSocioSeleccionado(socioActualizado);
            alert(`✅ ${file.name} cargado correctamente.`);
          }
        }
      } catch (error) {
        alert("❌ Error al subir el archivo.");
      }
    };
    input.click();
  };

  const handleDownload = async (url) => {
    try {
      const blobPath = url.split('/documentos-socios/')[1].split('?')[0];
      const response = await fetch(`/api/getDocUrl?blobPath=${encodeURIComponent(blobPath)}`);
      const data = await response.json();
      if (data.url) window.open(data.url, '_blank');
    } catch (error) {
      alert("❌ Error de acceso.");
    }
  };

  const handleDelete = async (docType, index = null) => {
    if (!window.confirm(`¿Eliminar este archivo de ${docType}?`)) return;
    try {
      const docInfo = index !== null ? socioSeleccionado.documentos[docType][index] : socioSeleccionado.documentos[docType];
      const urlSinToken = docInfo.url.split('?')[0];
      const fullFileName = decodeURIComponent(urlSinToken.split('/').pop());
      const fileName = fullFileName.substring(docType.length + 1);
      
      const response = await fetch(`/api/deleteDoc?socioId=${socioSeleccionado.id}&docType=${encodeURIComponent(docType)}&fileName=${encodeURIComponent(fileName)}`, { method: 'DELETE' });
      
      if (response.ok) {
        const socioActualizado = { ...socioSeleccionado };
        if (index !== null) {
          socioActualizado.documentos[docType].splice(index, 1);
          if (socioActualizado.documentos[docType].length === 0) delete socioActualizado.documentos[docType];
        } else {
          delete socioActualizado.documentos[docType];
        }
        await handleGuardar(socioActualizado);
        setSocioSeleccionado(socioActualizado);
      }
    } catch (error) {
      alert("❌ Error al eliminar.");
    }
  };

  const handleImportCSV = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!window.confirm(`¿Iniciar carga masiva de ${file.name}?`)) return;

      setLoading(true);

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        delimiter: ";",
        encoding: "UTF-8",
        complete: async (results) => {
          let exitos = 0;
          let errores = 0;

          for (const row of results.data) {
            const rutOriginal = row['Rut'] ? row['Rut'].trim() : "";
            const idLimpio = rutOriginal.replace(/\./g, '').replace(/-/g, '');
            
            if (!idLimpio) { errores++; continue; }

            const socioParaUpsert = {
              id: idLimpio, 
              nombre: row['Socio'] ? row['Socio'].trim() : "Sin Nombre",
              rut: rutOriginal,
              direccion: row['Domicilio'] ? row['Domicilio'].trim() : "",
              fechaIncorporacion: row['Fecha Incorporación'] ? row['Fecha Incorporación'].split('-').reverse().join('-') : "", 
              contratos: row['Contratos Asociados'] ? [row['Contratos Asociados'].toString().trim()] : [],
              estado: "Activo",
              documentos: {}, 
              observaciones: `Carga masiva: ${new Date().toLocaleDateString()}`,
              sexo: row['Sexo'] || "",
              estadoCivil: row['Estado Civil'] || "",
              profesion: row['Profesión U Oficio'] || ""
            };

            try {
              const res = await fetch('/api/saveSocio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(socioParaUpsert)
              });
              if (res.ok) exitos++; else errores++;
            } catch (err) { errores++; }
          }

          setLoading(false);
          alert(`🏁 Carga Finalizada\n✅ Exitosos: ${exitos}\n❌ Errores: ${errores}`);
          window.location.reload(); 
        }
      });
    };
    input.click();
  }; 

  const handleEliminarSocio = async () => {
    if (!socioSeleccionado) return;
    const confirmacion = window.confirm(`⚠️ ¿ESTÁ SEGURO? Esta acción eliminará a ${socioSeleccionado.nombre} y todos sus datos de forma permanente.`);
    if (!confirmacion) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/deleteSocio?id=${encodeURIComponent(socioSeleccionado.id)}`, { method: 'DELETE' });
      if (response.ok) {
        setSocios(socios.filter(s => s.id !== socioSeleccionado.id));
        setSocioSeleccionado(null);
        alert("🗑️ Socio eliminado con éxito.");
      } else {
        alert("❌ No se pudo eliminar el socio.");
      }
    } catch (error) {
      alert("❌ Error de conexión.");
    } finally {
      setLoading(false);
    }
  };

  const sociosFiltrados = socios.filter((s) => {
    const limpiar = (texto) => {
      if (!texto) return "";
      return texto.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.-]/g, ""); 
    };
    const nombreSocio = limpiar(s.nombre);
    const rutSocio = limpiar(s.rut).replace(/\s/g, ""); 
    const terminos = searchTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const palabrasBusqueda = terminos.split(/\s+/).filter(p => p !== "");
    if (palabrasBusqueda.length === 0) return true;
    const busquedaLimpiaParaRut = terminos.replace(/[.\s-]/g, "");
    const coincideRut = rutSocio.includes(busquedaLimpiaParaRut);
    const coincideNombre = palabrasBusqueda.every(palabra => nombreSocio.includes(palabra));
    return coincideNombre || coincideRut;
  });

  const stats = {
    total: socios.length,
    completos: socios.filter(s => s.documentos && Object.keys(s.documentos).length >= tiposDocumentos.length).length,
    incompletos: socios.length - socios.filter(s => s.documentos && Object.keys(s.documentos).length >= tiposDocumentos.length).length
  };

  if (loading) return (
    <div style={centerStyle}>
      <div className="spinner"></div>
      <p style={{ marginTop: '15px', fontWeight: '500' }}>Procesando en la nube...</p>
    </div>
  );

  if (!userInfo) return (
    <div style={loginBgStyle}>
      <div style={loginCardStyle}>
        <div style={{ fontSize: '60px', marginBottom: '20px' }}>🚜</div>
        <h1 style={{ color: '#1e293b', marginBottom: '10px', fontSize: '28px', fontWeight: '800' }}>LACIACOOP</h1>
        <a href="/.auth/login/google" style={loginButtonStyle}>Acceder con Google Workspace</a>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '40px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <img src="/logo_laciacoop.png" alt="Logo" style={{ width: '60px', height: 'auto' }} />
          <div>
            <h1 style={{ color: '#0f172a', margin: 0, fontSize: '32px', fontWeight: '800' }}>Gestión de Socios</h1>
            <p style={{ color: '#64748b', margin: '5px 0 0 0' }}>Conectado como: <strong>{userInfo.userDetails}</strong></p>
          </div>
        </div>
        <button onClick={() => window.location.href = "/.auth/logout?post_logout_redirect_uri=/"} style={logoutButtonStyle}>Cerrar Sesión</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: socioSeleccionado ? '400px 1fr' : '1fr', gap: '30px' }}>
        <div>
          <input type="text" placeholder="🔍 Buscar por nombre o RUT..." style={searchStyles} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          {!socioSeleccionado && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <StatCard title="Total" value={stats.total} color="#3b82f6" icon="👥" />
                <StatCard title="Al Día" value={stats.completos} color="#10b981" icon="✅" />
                <StatCard title="Pendiente" value={stats.incompletos} color="#f59e0b" icon="⚠️" />
              </div>
              <button onClick={handleImportCSV} style={importButtonStyle}>📥 IMPORTACIÓN MASIVA (CSV)</button>
            </>
          )}
          <div style={panelStyle}>
            <div style={{ maxHeight: 'calc(100vh - 350px)', overflowY: 'auto' }}>
              <table style={tableStyle}>
                <thead><tr style={thStyle}><th style={{ padding: '12px' }}>Socio</th><th style={{ padding: '12px' }}>RUT</th></tr></thead>
                <tbody>
                  {sociosFiltrados.map(s => (
                    <tr key={s.id} className="row-hover" onClick={() => setSocioSeleccionado(s)} style={{ ...trStyle, backgroundColor: socioSeleccionado?.id === s.id ? '#f1f5f9' : 'transparent' }}>
                      <td style={{ padding: '16px 12px', fontWeight: '600' }}>{s.nombre}</td>
                      <td style={{ padding: '16px 12px', color: '#64748b' }}>{s.rut}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {socioSeleccionado && (
          <div style={{ ...panelStyle, borderTop: '8px solid #3b82f6' }}>
            <div style={{ marginBottom: '25px', borderBottom: '1px solid #f1f5f9', paddingBottom: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '15px' }}>
                <div><label style={labelStyle}>Nombre Completo</label><input style={inputEditStyle} value={socioSeleccionado.nombre || ""} onChange={(e) => setSocioSeleccionado({...socioSeleccionado, nombre: e.target.value})} /></div>
                <div><label style={labelStyle}>RUT</label><input style={inputEditStyle} value={socioSeleccionado.rut || ""} onChange={(e) => setSocioSeleccionado({...socioSeleccionado, rut: e.target.value})} /></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button onClick={handleEliminarSocio} style={deleteSocioButtonStyle}>🗑️ Eliminar Socio</button>
                <button onClick={() => setSocioSeleccionado(null)} style={closeButtonStyle}>✕ Cerrar Ficha</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '40px' }}>
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                   <div><label style={labelStyle}>Estado de Socio</label><select style={inputEditStyle} value={socioSeleccionado.estado || "Activo"} onChange={(e) => setSocioSeleccionado({...socioSeleccionado, estado: e.target.value})}><option value="Activo">🟢 Activo</option><option value="Suspendido">🟡 Suspendido</option><option value="Retirado">🔴 Retirado</option></select></div>
                   <div><label style={labelStyle}>Teléfono</label><input style={inputEditStyle} value={socioSeleccionado.telefono || ""} onChange={(e) => setSocioSeleccionado({...socioSeleccionado, telefono: e.target.value})} /></div>
                   <div style={{ gridColumn: 'span 2' }}><label style={labelStyle}>Dirección</label><input style={inputEditStyle} value={socioSeleccionado.direccion || ""} onChange={(e) => setSocioSeleccionado({...socioSeleccionado, direccion: e.target.value})} /></div>
                </div>

                <h4 style={sectionHeaderStyle}>📂 CARPETA DOCUMENTAL DIGITAL</h4>
                <div style={{ backgroundColor: '#f8fafc', borderRadius: '16px', padding: '10px' }}>
                  {tiposDocumentos.map((doc, index) => {
                    const data = socioSeleccionado.documentos?.[doc];
                    return (
                      <div key={index} style={{ ...documentRowStyle, flexDirection: 'column', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                          <span style={{ fontSize: '14px', fontWeight: '600' }}>{doc}</span>
                          {(!data || !docsUnicos.includes(doc)) && (
                            <button style={uploadIconStyle} onClick={() => handleUpload(doc)}>➕ Añadir</button>
                          )}
                        </div>
                        <div style={{ marginTop: '5px', width: '100%' }}>
                          {Array.isArray(data) ? data.map((f, i) => (
                            <div key={i} style={fileRowStyle}>
                              <span style={{fontSize: '12px'}}>{f.name || `Archivo ${i+1}`}</span>
                              <div>
                                <button style={actionIconStyle} onClick={() => handleDownload(f.url)}>👁️</button>
                                <button style={{...actionIconStyle, color: '#ef4444'}} onClick={() => handleDelete(doc, i)}>🗑️</button>
                              </div>
                            </div>
                          )) : data ? (
                            <div style={fileRowStyle}>
                              <span style={{fontSize: '12px'}}>Archivo Único</span>
                              <div>
                                <button style={actionIconStyle} onClick={() => handleDownload(data.url)}>👁️</button>
                                <button style={{...actionIconStyle, color: '#ef4444'}} onClick={() => handleDelete(doc)}>🗑️</button>
                              </div>
                            </div>
                          ) : <small style={{color: '#94a3b8'}}>Sin archivos</small>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <h4 style={sectionHeaderStyle}>📝 OBSERVACIONES</h4>
                <textarea style={textareaStyle} value={socioSeleccionado.observaciones || ""} onChange={(e) => setSocioSeleccionado({...socioSeleccionado, observaciones: e.target.value})} />
                <button style={saveButtonStyle} onClick={() => handleGuardar().then(s => s && alert("✅ Guardado"))}>Guardar Cambios</button>
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{` .row-hover:hover { background-color: #f8fafc !important; cursor: pointer; } .spinner { border: 4px solid rgba(0,0,0,.05); width: 40px; height: 40px; border-radius: 50%; border-left-color: #3b82f6; animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } } `}</style>
    </div>
  );
}

const StatCard = ({ title, value, color, icon }) => (
  <div style={{ background: 'white', padding: '16px', borderRadius: '16px', border: '1px solid #f1f5f9', textAlign: 'center' }}>
    <div style={{ fontSize: '20px' }}>{icon}</div>
    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>{title}</div>
    <div style={{ fontSize: '20px', fontWeight: '800', color }}>{value}</div>
  </div>
);

// Estilos adicionales para los archivos múltiples
const fileRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '6px 10px', borderRadius: '8px', marginTop: '4px', border: '1px solid #edf2f7' };
const centerStyle = { display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh' };
const loginBgStyle = { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0f172a' };
const loginCardStyle = { backgroundColor: 'white', padding: '60px', borderRadius: '40px', textAlign: 'center' };
const loginButtonStyle = { display: 'block', background: '#0f172a', color: 'white', padding: '18px', borderRadius: '18px', textDecoration: 'none', fontWeight: '700' };
const logoutButtonStyle = { background: 'white', color: '#ef4444', border: '1px solid #fee2e2', padding: '10px 22px', borderRadius: '14px', cursor: 'pointer', fontWeight: '700' };
const searchStyles = { width: '100%', padding: '18px', borderRadius: '18px', border: '1px solid #e2e8f0', marginBottom: '20px', boxSizing: 'border-box' };
const panelStyle = { background: 'white', padding: '32px', borderRadius: '28px', border: '1px solid #f1f5f9' };
const tableStyle = { width: '100%', borderCollapse: 'collapse' };
const thStyle = { textAlign: 'left', borderBottom: '2px solid #f1f5f9', color: '#94a3b8', fontSize: '11px' };
const trStyle = { borderBottom: '1px solid #f1f5f9' };
const closeButtonStyle = { backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', cursor: 'pointer', fontWeight: '700' };
const deleteSocioButtonStyle = { backgroundColor: '#fee2e2', border: '1px solid #ef4444', borderRadius: '12px', color: '#ef4444', padding: '12px', cursor: 'pointer', fontWeight: '700' };
const sectionHeaderStyle = { fontSize: '12px', color: '#94a3b8', fontWeight: '700', marginBottom: '15px' };
const documentRowStyle = { padding: '12px 15px', borderBottom: '1px solid #edf2f7' };
const uploadIconStyle = { background: '#3b82f6', color: 'white', border: 'none', padding: '5px 12px', cursor: 'pointer', borderRadius: '8px', fontSize: '12px' };
const actionIconStyle = { background: 'white', border: '1px solid #e2e8f0', padding: '5px 8px', cursor: 'pointer', borderRadius: '6px', marginLeft: '4px' };
const textareaStyle = { width: '100%', height: '150px', borderRadius: '18px', border: '1px solid #e2e8f0', padding: '15px', boxSizing: 'border-box' };
const saveButtonStyle = { marginTop: '20px', width: '100%', padding: '18px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '18px', fontWeight: '700', cursor: 'pointer' };
const labelStyle = { display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '5px' };
const inputEditStyle = { width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', boxSizing: 'border-box' };
const importButtonStyle = { width: '100%', padding: '14px', background: 'white', border: '2px dashed #3b82f6', borderRadius: '16px', color: '#3b82f6', cursor: 'pointer', marginBottom: '30px', fontWeight: '700' };

export default App;