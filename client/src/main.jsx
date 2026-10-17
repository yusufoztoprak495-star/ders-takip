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
import './schedule.css';
import './motion.css';
import './features.css';
import './theme.css';
import './themes.css';
import './backdrop.css';

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
    // Güvenlik politikası betik adreslerini yalnızca "Trusted Types" kalıbından geçerse kabul eder.
    // Bu kalıp tek bir adrese izin verir: uygulamanın kendi servis çalışanı. Başka her adres reddedilir.
    const policy = window.trustedTypes?.createPolicy('ders-takip', {
      createScriptURL: (url) => {
        if (url === './sw.js') return url;
        throw new TypeError('İzin verilmeyen betik adresi');
      },
    });
    navigator.serviceWorker.register(policy ? policy.createScriptURL('./sw.js') : './sw.js').catch(() => {});
  });
}
