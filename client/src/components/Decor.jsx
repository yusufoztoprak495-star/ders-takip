import { useLocation } from 'react-router-dom';
import {
  BookStack,
  Compass,
  CornerOrnament,
  Coffee,
  DeskLamp,
  Envelope,
  FountainPen,
  Globe,
  Hourglass,
  OpenNotebook,
  Paperclip,
  Pencil,
  Ruler,
  Seal,
} from './Doodles.jsx';

// Sayfaya göre motif düzeni. Her sayfa farklı bir altı motif alır, ama stil aynıdır:
// [sağ üst, sağ orta, sağ alt, sol üst, sol alt, sol menü altı]
const BY_PAGE = {
  '/': [DeskLamp, FountainPen, Globe, Coffee, Envelope, BookStack],
  '/pomodoro': [Hourglass, Coffee, Compass, DeskLamp, Seal, Pencil],
  '/gunluk': [OpenNotebook, FountainPen, Paperclip, Envelope, Hourglass, Seal],
  '/sorular': [Pencil, Ruler, Compass, BookStack, Paperclip, Globe],
  '/kaynaklar': [BookStack, DeskLamp, Seal, OpenNotebook, Coffee, FountainPen],
  '/konular': [Ruler, Globe, OpenNotebook, Compass, FountainPen, Envelope],
  '/ilerleme': [Compass, Hourglass, Coffee, Ruler, Seal, DeskLamp],
};

// Süsler yalnızca içerik kutusunun DIŞINDAKİ boş kenar boşluklarında durur: sabit konum ve CSS'te
// ekran genişliği/yüksekliği şartları (dar ekranda gizlenir) sayesinde veri, form ve grafiklerin
// üstüne binmez. Dört köşede ornament, kenar boşluklarında sayfaya özel motifler bulunur.
export default function Decor() {
  const { pathname } = useLocation();
  const key = pathname.startsWith('/ilerleme') ? '/ilerleme' : pathname;
  const [R1, R2, R3, L1, L2, S] = BY_PAGE[key] ?? BY_PAGE['/'];

  return (
    <div className="decor" aria-hidden="true">
      <span className="decor-item corner corner-tl">
        <CornerOrnament />
      </span>
      <span className="decor-item corner corner-tr">
        <CornerOrnament />
      </span>
      <span className="decor-item corner corner-bl">
        <CornerOrnament />
      </span>
      <span className="decor-item corner corner-br">
        <CornerOrnament />
      </span>

      <span className="decor-item slot slot-r1">
        <R1 size={76} />
      </span>
      <span className="decor-item slot slot-r2">
        <R2 size={76} />
      </span>
      <span className="decor-item slot slot-r3">
        <R3 size={76} />
      </span>
      <span className="decor-item slot slot-l1">
        <L1 size={64} />
      </span>
      <span className="decor-item slot slot-l2">
        <L2 size={64} />
      </span>
      <span className="decor-item slot slot-side">
        <S size={60} />
      </span>
    </div>
  );
}
