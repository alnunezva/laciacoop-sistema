import React, { useEffect, useState } from 'react';
import { useIdleTimer } from './useIdleTimer';

function App() {
  const [userInfo, setUserInfo] = useState(null);
  const [socios, setSocios] = useState([]);

  // Función para cerrar sesión (Azure Logout)
  const logout = () => {
    window.location.href = "/.auth/logout?post_logout_redirect_uri=/";
  };

  // Activar el temporizador de 15 minutos
  useIdleTimer(logout, 15 * 60 * 1000);

  useEffect(() => {
    // 1. Verificar si el usuario está logueado en Azure
    fetch('/.auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.clientPrincipal) {
          setUserInfo(data.clientPrincipal);
        }
      });
  }, []);

  useEffect(() => {
    if (userInfo) {
      fetch('/api/getSocios')
        .then(res => res.json())
        .then(data => setSocios(data))
        .catch(err => console.error("Error:", err));
    }
  }, [userInfo]);

  // PANTALLA DE LOGIN (SSO GOOGLE)
  if (!userInfo) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#1a365d' }}>
        <h1 style={{ color: 'white' }}>🚜 LACIACOOP SISTEMA</h1>
        <p style={{ color: '#bdc3c7' }}>Acceso exclusivo para personal autorizado</p>
        <a href="/.auth/login/google" style={{
          backgroundColor: 'white', padding: '15px 25px', borderRadius: '5px', 
          textDecoration: 'none', color: '#1a365d', fontWeight: 'bold', display: 'flex', alignItems: 'center'
        }}>
          <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="G" style={{ width: '20px', marginRight: '10px' }} />
          Iniciar sesión con Google Workspace
        </a>
      </div>
    );
  }

  // PANTALLA DE LA TABLA (USUARIO LOGUEADO)
  return (
    <div style={{ padding: '40px', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h2>Bienvenido, {userInfo.userDetails} 🧑‍🌾</h2>
        <button onClick={logout} style={{ backgroundColor: '#e74c3c', color: 'white', border: 'none', padding: '10px', borderRadius: '5px' }}>
          Cerrar Sesión
        </button>
      </div>
      
      <table style={{ width: '100%', marginTop: '20px', backgroundColor: 'white', borderRadius: '10px' }}>
        {/* Tu tabla de socios aquí igual que antes */}
      </table>
    </div>
  );
}

export default App;