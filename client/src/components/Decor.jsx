import { useLocation } from 'react-router-dom';
import { Book, Coffee, Note, Paperclip, Pencil, Ruler } from './Doodles.jsx';

// Sayfaya göre süs çizimleri: [sağ üst, sağ alt, sol menü altı].
// Süsler yalnızca içerik kutusunun DIŞINDAKİ boş kenar boşluklarında durur (CSS'te geniş ekran şartı
// ve sabit konum), bu yüzden veri, form ve grafiklerin üstüne binmez. Dar ekranda gizlenir.
const BY_PAGE = {
  '/': [Coffee, Pencil, Book],
  '/pomodoro': [Coffee, Note, Pencil],
  '/gunluk': [Note, Paperclip, Coffee],
  '/sorular': [Pencil, Ruler, Note],
  '/kaynaklar': [Book, Pencil, Paperclip],
  '/konular': [Ruler, Book, Pencil],
  '/ilerleme': [Ruler, Coffee, Paperclip],
};

export default function Decor() {
  const { pathname } = useLocation();
  const key = pathname.startsWith('/ilerleme') ? '/ilerleme' : pathname;
  const [TopRight, BottomRight, SideBottom] = BY_PAGE[key] ?? BY_PAGE['/'];

  return (
    <div className="decor" aria-hidden="true">
      <span className="decor-item decor-tr">
        <TopRight size={84} />
      </span>
      <span className="decor-item decor-br">
        <BottomRight size={84} />
      </span>
      <span className="decor-item decor-side">
        <SideBottom size={60} />
      </span>
    </div>
  );
}
