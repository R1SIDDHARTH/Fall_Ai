// src/main.tsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Add a console log to verify the application is initializing
console.log('Application initializing...')

// Update document title
document.title = "Live-Care";

// Update favicon
const updateFavicon = () => {
  const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
  link.type = 'image/png';
  link.rel = 'shortcut icon';
  link.href = 'https://sigmawire.net/i/03/rX52Hy.jpeg';
  document.getElementsByTagName('head')[0].appendChild(link);
};

// Execute favicon update
updateFavicon();

// Use the newer React 18 API with StrictMode for better development experience
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)