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

  useEffect(() => {
    fetch('/.auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.clientPrincipal) setUserInfo(data.clientPrincipal);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch('/api/getSocios')
      .then(res => res.json())
      .then(data => setSocios(Array.isArray(data) ? data : []))
      .catch(err => console.error("Error API:", err));
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
          socioActualizado.documentos[docType] = { status: "Cargado", url: result.url };

          const guardadoExitoso = await handleGuardar(socioActualizado);
          if (guardadoExitoso) {
            setSocioSeleccionado(socioActualizado);
            alert(`✅ ${docType} cargado y vinculado de forma segura.`);
          }
        }
      } catch (error) {
        alert("❌ Error al subir el archivo.");
      }
    };
    input.click();
  };

  const handleDownload = async (docType) => {
    try {
      const docInfo = socioSeleccionado.documentos[docType];
      const blobPath = docInfo.url.split('/documentos-socios/')[1].split('?')[0];
      const response = await fetch(`/api/getDocUrl?blobPath=${encodeURIComponent(blobPath)}`);
      const data = await response.json();
      if (data.url) window.open(data.url, '_blank');
    } catch (error) {
      alert("❌ Error: No se pudo generar el acceso seguro al documento.");
    }
  };

  const handleDelete = async (docType) => {
    if (!window.confirm(`¿Está seguro de eliminar el documento: ${docType}?`)) return;
    try {
      const docInfo = socioSeleccionado.documentos[docType];
      const urlSinToken = docInfo.url.split('?')[0];
      const fullFileName = decodeURIComponent(urlSinToken.split('/').pop());
      const fileName = fullFileName.substring(docType.length + 1);
      const response = await fetch(`/api/deleteDoc?socioId=${socioSeleccionado.id}&docType=${encodeURIComponent(docType)}&fileName=${encodeURIComponent(fileName)}`, { method: 'DELETE' });
      if (response.ok) {
        const socioActualizado = { ...socioSeleccionado };
        delete socioActualizado.documentos[docType];
        const guardadoExitoso = await handleGuardar(socioActualizado);
        if (guardadoExitoso) {
          setSocioSeleccionado(socioActualizado);
          alert("🗑️ Documento eliminado de la nube y ficha actualizada.");
        }
      }
    } catch (error) {
      alert("❌ Error al intentar eliminar.");
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
              observaciones: `Carga inicial masiva: ${new Date().toLocaleDateString()}`,
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

  // --- LÓGICA DE BÚSQUEDA INTELIGENTE ÚNICA ---
  const sociosFiltrados = socios.filter(s => {
    const limpiar = (texto) => {
      if (!texto) return "";
      return texto
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[.-]/g, ""); 
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

  // --- ESTADÍSTICAS CORREGIDAS ---
  const totalSocios = socios.length;
  const sociosCompletos = socios.filter(s => {
    if (!s.documentos) return false;
    const cantidadCargados = Object.values(s.documentos).filter(d => d.status === "Cargado").length;
    return cantidadCargados === tiposDocumentos.length;
  }).length;

  const stats = {
    total: totalSocios,
    completos: sociosCompletos,
    incompletos: totalSocios - sociosCompletos
  };

  const logout = () => {
    window.location.href = "/.auth/logout?post_logout_redirect_uri=/";
  };

  if (loading) return (
    <div style={centerStyle}>
      <div className="spinner"></div>
      <p style={{ marginTop: '15px', fontWeight: '500' }}>Iniciando entorno seguro...</p>
    </div>
  );

  if (!userInfo) return (
    <div style={loginBgStyle}>
      <div style={loginCardStyle}>
        <div style={{ fontSize: '60px', marginBottom: '20px' }}>🚜</div>
        <h1 style={{ color: '#1e293b', marginBottom: '10px', fontSize: '28px', fontWeight: '800' }}>LACIACOOP</h1>
        <p style={{ color: '#64748b', marginBottom: '30px', lineHeight: '1.6' }}>
          Sistema de Gestión Documental.<br/>Ingrese con su cuenta institucional.
        </p>
        <a href="/.auth/login/google" style={loginButtonStyle}>
          <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="G" style={{ width: '20px', marginRight: '12px' }} />
          Acceder con Google Workspace
        </a>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '40px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ 
            width: '65px', 
            height: '65px', 
            backgroundColor: 'white', 
            borderRadius: '18px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden'
          }}>
            <img 
              src="/logo_laciacoop.png" 
              alt="Logo Corporativo LACIACOOP" 
              style={{ width: '85%', height: 'auto', objectFit: 'contain' }} 
            />
          </div>

          <div>
            <h1 style={{ color: '#0f172a', margin: 0, fontSize: '32px', fontWeight: '800', letterSpacing: '-0.5px' }}>Gestión de Socios</h1>
            <p style={{ color: '#64748b', margin: '5px 0 0 0', display: 'flex', alignItems: 'center' }}>
              <span style={{ width: '10px', height: '10px', backgroundColor: '#10b981', borderRadius: '50%', marginRight: '10px' }}></span>
              Conectado como: <strong style={{ marginLeft: '5px', color: '#334155' }}>{userInfo.userDetails}</strong>
            </p>
          </div>
        </div>
        <button onClick={logout} style={logoutButtonStyle}>Cerrar Sesión</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: socioSeleccionado ? '400px 1fr' : '1fr', gap: '30px', transition: 'all 0.4s ease' }}>
        
        <div>
          <div style={{ position: 'relative', marginBottom: '24px' }}>
            <input 
              type="text" 
              placeholder="🔍 Buscar por nombre o RUT..." 
              style={searchStyles}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {!socioSeleccionado && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <StatCard title="Total" value={stats.total} color="#3b82f6" icon="👥" />
                <StatCard title="Al Día" value={stats.completos} color="#10b981" icon="✅" />
                <StatCard title="Documento pendiente" value={stats.incompletos} color="#f59e0b" icon="⚠️" />
              </div>
              <button onClick={handleImportCSV} style={importButtonStyle}>📥 IMPORTACIÓN MASIVA (CSV)</button>
            </>
          )}

          <div style={panelStyle}>
            <div style={{ maxHeight: 'calc(100vh - 350px)', overflowY: 'auto', paddingRight: '5px' }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={thStyle}>
                    <th style={{ padding: '12px' }}>Socio</th>
                    <th style={{ padding: '12px' }}>RUT</th>
                  </tr>
                </thead>
                <tbody>
                  {sociosFiltrados.map(s => (
                    <tr 
                      key={s.id} 
                      className="row-hover" 
                      onClick={() => setSocioSeleccionado(s)}
                      style={{ ...trStyle, backgroundColor: socioSeleccionado?.id === s.id ? '#f1f5f9' : 'transparent' }}
                    >
                      <td style={{ padding: '16px 12px', fontWeight: '600', color: '#1e293b' }}>{s.nombre}</td>
                      <td style={{ padding: '16px 12px', color: '#64748b', fontSize: '13px' }}>{s.rut}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {socioSeleccionado && (
          <div style={{ ...panelStyle, borderTop: '8px solid #3b82f6', animation: 'slideIn 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
              <div style={{ width: '100%' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px' }}>
                   <div>
                    <label style={labelStyle}>Nombre Completo</label>
                    <input style={inputEditStyle} value={socioSeleccionado.nombre || ""} onChange={(e) => setSocioSeleccionado({...socioSeleccionado, nombre: e.target.value})} />
                   </div>
                   <div>
                    <label style={labelStyle}>RUT</label>
                    <input style={inputEditStyle} value={socioSeleccionado.rut || ""} onChange={(e) => setSocioSeleccionado({...socioSeleccionado, rut: e.target.value})} />
                   </div>
                   <div>
                    <label style={labelStyle}>Estado</label>
                    <select style={inputEditStyle} value={socioSeleccionado.estado || "Activo"} onChange={(e) => setSocioSeleccionado({...socioSeleccionado, estado: e.target.value})}>
                        <option value="Activo">🟢 Activo</option>
                        <option value="Suspendido">🟡 Suspendido</option>
                        <option value="Retirado">🔴 Retirado</option>
                    </select>
                   </div>
                   <button onClick={handleEliminarSocio} style={deleteSocioButtonStyle}>🗑️ Eliminar Socio</button>
                   <button onClick={() => setSocioSeleccionado(null)} style={closeButtonStyle}>✕ Cerrar Ficha</button>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '40px' }}>
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                   <div>
                    <label style={labelStyle}>Dirección</label>
                    <input style={inputEditStyle} value={socioSeleccionado.direccion || ""} onChange={(e) => setSocioSeleccionado({...socioSeleccionado, direccion: e.target.value})} />
                   </div>
                   <div>
                    <label style={labelStyle}>Teléfono</label>
                    <input style={inputEditStyle} value={socioSeleccionado.telefono || ""} onChange={(e) => setSocioSeleccionado({...socioSeleccionado, telefono: e.target.value})} />
                   </div>
                   <div>
                    <label style={labelStyle}>Correo Electrónico</label>
                    <input style={inputEditStyle} value={socioSeleccionado.email || ""} onChange={(e) => setSocioSeleccionado({...socioSeleccionado, email: e.target.value})} />
                   </div>
                   <div>
                    <label style={labelStyle}>Fecha Incorporación</label>
                    <input type="date" style={inputEditStyle} value={socioSeleccionado.fechaIncorporacion || ""} onChange={(e) => setSocioSeleccionado({...socioSeleccionado, fechaIncorporacion: e.target.value})} />
                   </div>
                </div>

                <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f1f5f9', borderRadius: '12px' }}>
                    <label style={labelStyle}>Contratos Asociados (Separe por comas)</label>
                    <input placeholder="Ej: Contrato 2024-A, Anexo Agua..." style={inputEditStyle} value={socioSeleccionado.contratos ? socioSeleccionado.contratos.join(', ') : ""} onChange={(e) => {
                        const lista = e.target.value.split(',').map(item => item.trim());
                        setSocioSeleccionado({...socioSeleccionado, contratos: lista});
                    }} />
                </div>

                <h4 style={sectionHeaderStyle}>📂 CARPETA DOCUMENTAL DIGITAL</h4>
                <div style={{ backgroundColor: '#f8fafc', borderRadius: '16px', padding: '10px' }}>
                  {tiposDocumentos.map((doc, index) => {
                    const status = socioSeleccionado.documentos?.[doc]?.status || "No cargado";
                    return (
                      <div key={index} style={documentRowStyle}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '14px', fontWeight: '500', color: '#334155' }}>{doc}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ 
                            ...statusBadgeStyle, 
                            backgroundColor: status === "Cargado" ? '#dcfce7' : '#fee2e2',
                            color: status === "Cargado" ? '#166534' : '#991b1b'
                          }}>
                            {status}
                          </span>
                          {status === "Cargado" ? (
                            <>
                              <button style={actionIconStyle} onClick={() => handleDownload(doc)} title="Ver documento">👁️</button>
                              <button style={{...actionIconStyle, color: '#ef4444'}} onClick={() => handleDelete(doc)} title="Eliminar">🗑️</button>
                            </>
                          ) : (
                            <button style={uploadIconStyle} onClick={() => handleUpload(doc)} title="Subir documento">📁</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '30px' }}>
                <h4 style={sectionHeaderStyle}>📝 OBSERVACIONES ADMINISTRATIVAS</h4>
                <textarea 
                  placeholder="Escriba aquí el historial de versiones..." 
                  style={textareaStyle}
                  value={socioSeleccionado.observaciones || ""}
                  onChange={(e) => setSocioSeleccionado({...socioSeleccionado, observaciones: e.target.value})}
                />
                
                <div style={infoBoxStyle}>
                  <p style={{ margin: '0 0 10px 0', fontSize: '13px' }}><strong>Estado de Cuenta:</strong> Sin deudas</p>
                  <p style={{ margin: '0', fontSize: '13px' }}><strong>Última Factibilidad:</strong> Emitida 12/03/2024</p>
                </div>

                <button style={saveButtonStyle} onClick={() => {
                  handleGuardar().then(success => success && alert("✅ Cambios guardados en la nube de LACIACOOP"));
                }}>
                  Guardar Cambios en Ficha
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      <style>{`
        .row-hover:hover { background-color: #f8fafc !important; cursor: pointer; }
        .spinner { border: 4px solid rgba(0,0,0,.05); width: 40px; height: 40px; border-radius: 50%; border-left-color: #3b82f6; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </div>
  );
}

const StatCard = ({ title, value, color, icon }) => (
  <div style={{ background: 'white', padding: '16px', borderRadius: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9', textAlign: 'center' }}>
    <div style={{ fontSize: '20px', marginBottom: '5px' }}>{icon}</div>
    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>{title}</div>
    <div style={{ fontSize: '20px', fontWeight: '800', color: color }}>{value}</div>
  </div>
);
const handleEliminarSocio = async () => {
    if (!socioSeleccionado) return;
    
    const confirmacion = window.confirm(
      `⚠️ ¿ESTÁ SEGURO? Esta acción eliminará a ${socioSeleccionado.nombre} y TODOS sus datos de forma permanente.`
    );

    if (!confirmacion) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/deleteSocio?id=${socioSeleccionado.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Actualizamos la lista local quitando al socio
        setSocios(socios.filter(s => s.id !== socioSeleccionado.id));
        setSocioSeleccionado(null);
        alert("🗑️ Socio eliminado con éxito.");
      } else {
        alert("❌ No se pudo eliminar el socio.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("❌ Error de conexión.");
    } finally {
      setLoading(false);
    }
  };

const centerStyle = { display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f8fafc' };
const loginBgStyle = { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' };
const loginCardStyle = { backgroundColor: 'white', padding: '60px', borderRadius: '40px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', maxWidth: '500px' };
const loginButtonStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', color: 'white', padding: '18px 30px', borderRadius: '18px', textDecoration: 'none', fontWeight: '700', fontSize: '16px' };
const logoutButtonStyle = { backgroundColor: 'white', color: '#ef4444', border: '1.5px solid #fee2e2', padding: '10px 22px', borderRadius: '14px', fontWeight: '700', cursor: 'pointer' };
const searchStyles = { width: '100%', padding: '18px 25px', borderRadius: '18px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', fontSize: '16px', outline: 'none', backgroundColor: 'white' };
const panelStyle = { background: 'white', padding: '32px', borderRadius: '28px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9' };
const tableStyle = { width: '100%', borderCollapse: 'collapse' };
const thStyle = { textAlign: 'left', borderBottom: '2px solid #f1f5f9', color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em' };
const trStyle = { borderBottom: '1px solid #f1f5f9', transition: 'all 0.2s ease' };
const closeButtonStyle = { backgroundColor: '#f1f5f9', border: 'none', padding: '8px 16px', borderRadius: '10px', color: '#475569', fontWeight: '700', cursor: 'pointer', height: 'fit-content', alignSelf: 'end' };
const sectionHeaderStyle = { fontSize: '12px', color: '#94a3b8', fontWeight: '700', letterSpacing: '0.05em', marginBottom: '15px' };
const documentRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', borderBottom: '1px solid #edf2f7' };
const statusBadgeStyle = { padding: '5px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' };
const uploadIconStyle = { background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px', cursor: 'pointer', fontSize: '16px' };
const actionIconStyle = { background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const textareaStyle = { width: '100%', height: '180px', borderRadius: '18px', border: '1px solid #e2e8f0', padding: '15px', fontSize: '14px', resize: 'none', backgroundColor: '#fcfcfc', outline: 'none' };
const infoBoxStyle = { marginTop: '20px', padding: '20px', backgroundColor: '#eff6ff', borderRadius: '18px', color: '#1e40af', border: '1px solid #dbeafe' };
const saveButtonStyle = { marginTop: '20px', width: '100%', padding: '18px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '18px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)' };
const labelStyle = { display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '5px', marginLeft: '2px' };
const inputEditStyle = { width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#1e293b', outline: 'none', backgroundColor: 'white', boxSizing: 'border-box' };
const importButtonStyle = { width: '100%', padding: '14px', backgroundColor: '#ffffff', border: '2px dashed #3b82f6', borderRadius: '16px', color: '#3b82f6', fontWeight: '800', fontSize: '13px', cursor: 'pointer', marginBottom: '30px', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' };
const deleteSocioButtonStyle = { backgroundColor: '#fee2e2', border: '1px solid #ef4444', padding: '8px 16px', borderRadius: '10px', color: '#ef4444', fontWeight: '700', cursor: 'pointer', height: 'fit-content', alignSelf: 'end' 
};
export default App;