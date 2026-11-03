// src/core/app.js - Punto de entrada del cliente (referenciado por index.html)
import { StrictMode, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  createElement(StrictMode, null, createElement(App))
);

