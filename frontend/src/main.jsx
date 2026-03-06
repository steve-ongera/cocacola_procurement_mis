// main.jsx  –  Vite entry point
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Bootstrap Icons CDN is loaded via index.html
// All app styles are imported via App.jsx → global_styles.css

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);