import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// HashRouter: adresler #/ ile başlar, sunucunun sayfa yönlendirmesi yapmasına gerek kalmaz
import { HashRouter } from 'react-router-dom';
// Yazı tipleri projeye gömülü (internetten çekilmez, çevrimdışı da çalışır)
import '@fontsource-variable/figtree';
import '@fontsource-variable/cormorant-garamond';
import App from './App.jsx';
import './index.css';
import './progress.css';
import './decor.css';
import './luxe.css';
import './tracks.css';
import './theme.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);

// Servis çalışanı: uygulamanın kurulabilmesi ve çevrimdışı açılması için (yalnızca derlenmiş hâlde)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
