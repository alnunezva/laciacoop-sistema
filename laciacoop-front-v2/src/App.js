// Cambia tu fetch por esto:
useEffect(() => {
  fetch('/api/getSocios') // Azure Static Web Apps unirá el front y el back automáticamente
    .then(res => res.json())
    .then(data => setSocios(data))
    .catch(err => console.error("Error:", err));
}, []);