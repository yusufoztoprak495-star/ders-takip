import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// HashRouter: adresler #/ ile başlar, sunucunun sayfa yönlendirmesi yapmasına gerek kalmaz
import { HashRouter } from 'react-router-dom';
// Yazı tipleri projeye gömülü (internetten çekilmez, çevrimdışı da çalışır)
import '@fontsource-variable/newsreader';
import '@fontsource-variable/hanken-grotesk';
import App from './App.jsx';
import './index.css';
import './progress.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
