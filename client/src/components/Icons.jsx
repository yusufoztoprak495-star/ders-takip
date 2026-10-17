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

// Tema düğmesi: güneş (açık temaya geçmek için ay gösterilir, koyuya geçmek için güneş)
export const SunIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
    <path d="M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" />
  </Icon>
);

export const MoonIcon = () => (
  <Icon>
    <path d="M19.5 14.6A8 8 0 0 1 9.4 4.5a8 8 0 1 0 10.1 10.1Z" />
    <path d="M16.5 3.5v2.4M15.3 4.7h2.4" />
  </Icon>
);

// Ayarlar: iki sürgülü çizgi
export const SettingsIcon = () => (
  <Icon>
    <path d="M4 8h16" />
    <path d="M4 16h16" />
    <path d="M9 5v6" />
    <path d="M15 13v6" />
  </Icon>
);

// Ders programı: çizelge (üst bant ve hücre çizgileri)
export const TimetableIcon = () => (
  <Icon>
    <path d="M3.5 5.5h17v14h-17z" />
    <path d="M3.5 9.5h17" />
    <path d="M9 9.5v10" />
    <path d="M14.5 9.5v10" />
    <path d="M3.5 14.5h17" />
  </Icon>
);

// Haftalık program: halkalı ajanda sayfası ve tek blok
export const WeekIcon = () => (
  <Icon>
    <path d="M4.5 5.5h15v15h-15z" />
    <path d="M8.5 3v4" />
    <path d="M15.5 3v4" />
    <path d="M8 11h4v5.5H8z" />
  </Icon>
);

// Diğer: telefonda alt çubuğa sığmayan sayfaların paneli (üç nokta değil, dört küçük kare)
export const MoreIcon = () => (
  <Icon>
    <path d="M5 5h5v5H5z" />
    <path d="M14 5h5v5h-5z" />
    <path d="M5 14h5v5H5z" />
    <path d="M14 14h5v5h-5z" />
  </Icon>
);

// Denemeler: kenarı işaretli optik form (cevap kâğıdı)
export const ExamIcon = () => (
  <Icon>
    <path d="M5.5 3.5h13v17h-13z" />
    <circle cx="9.5" cy="8.5" r="1.4" />
    <circle cx="14.5" cy="8.5" r="1.4" />
    <circle cx="9.5" cy="13" r="1.4" />
    <circle cx="14.5" cy="13" r="1.4" />
    <path d="M8.5 17.5h7" />
  </Icon>
);
