// Uygulamaya özel çizilmiş menü ikonları.
// Hepsi 24x24 alanda, aynı ince çizgi kalınlığında ve köşeli uçlarla çizilir.
function Icon({ children }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

// Ana sayfa: tek çizgiyle çatılı pencere
export const HomeIcon = () => (
  <Icon>
    <path d="M3.5 11 12 4l8.5 7" />
    <path d="M6 9.5V20h12V9.5" />
    <path d="M10 20v-5.5h4V20" />
  </Icon>
);

// Pomodoro: kadran ve tek çentik
export const TimerIcon = () => (
  <Icon>
    <circle cx="12" cy="13" r="7.5" />
    <path d="M12 13V8.5" />
    <path d="M9.5 3.5h5" />
    <path d="M12 3.5v2" />
  </Icon>
);

// Çalışma günlüğü: satırlı sayfa ve işaret
export const LogIcon = () => (
  <Icon>
    <path d="M5.5 3.5h13v17h-13z" />
    <path d="M9 8.5h6" />
    <path d="M9 12h6" />
    <path d="M9 15.5h3" />
  </Icon>
);

// Soru kaydı: çetele (dört çizgi ve çapraz)
export const QuestionsIcon = () => (
  <Icon>
    <path d="M6 5v14" />
    <path d="M10 5v14" />
    <path d="M14 5v14" />
    <path d="M18 5v14" />
    <path d="M3.5 16 20.5 8" />
  </Icon>
);

// Kaynaklar: yan yana duran iki kitap
export const ResourcesIcon = () => (
  <Icon>
    <path d="M4.5 4.5h6v15h-6z" />
    <path d="M10.5 6.5h6l3 13h-6z" />
    <path d="M4.5 8.5h6" />
  </Icon>
);

// Konular: üç basamaklı liste
export const TopicsIcon = () => (
  <Icon>
    <path d="M4 6h16" />
    <path d="M8 12h12" />
    <path d="M12 18h8" />
    <path d="M4 12h1" />
    <path d="M8 18h1" />
  </Icon>
);

// İlerleme: yükselen çizgi ve eksen
export const ProgressIcon = () => (
  <Icon>
    <path d="M4 4v16h16" />
    <path d="m7.5 15 4-4.5 3 2.5 5-6" />
  </Icon>
);
