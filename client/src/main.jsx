import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// HashRouter: adresler #/ ile başlar, sunucunun sayfa yönlendirmesi yapmasına gerek kalmaz
import { HashRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
