import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Retira apenas caches legados de demonstracao deste navegador.
try {
  localStorage.removeItem('papelito-circular:demo:v1');
  localStorage.removeItem('papelito-circular:perfil-simulado');
} catch { /* armazenamento indisponivel */ }

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
);
