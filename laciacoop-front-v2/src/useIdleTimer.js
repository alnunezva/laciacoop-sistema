import { useEffect } from 'react';

export const useIdleTimer = (onIdle, timeout = 15 * 60 * 1000) => {
  useEffect(() => {
    let timer;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(onIdle, timeout);
    };

    // Eventos que "despiertan" la sesión
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keypress', resetTimer);
    window.addEventListener('scroll', resetTimer);

    resetTimer(); // Iniciar al cargar

    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keypress', resetTimer);
      window.removeEventListener('scroll', resetTimer);
      clearTimeout(timer);
    };
  }, [onIdle, timeout]);
};