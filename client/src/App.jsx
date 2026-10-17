import { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { BackupProvider } from './context/BackupContext.jsx';
import { PomodoroProvider, usePomodoro } from './context/PomodoroContext.jsx';
import { TrackProvider, useTrack } from './context/TrackContext.jsx';
import { trackInfo, tracksQuestions } from './lib/tracks.js';
import { formatTime } from './lib/pomodoro.js';
import { requestPersistence } from './lib/persistence.js';
import Settings from './pages/Settings.jsx';
import Home from './pages/Home.jsx';
import Pomodoro from './pages/Pomodoro.jsx';
import StudyLog from './pages/StudyLog.jsx';
import Questions from './pages/Questions.jsx';
import Resources from './pages/Resources.jsx';
import Topics from './pages/Topics.jsx';
import Progress from './pages/Progress.jsx';
import ProgressSubject from './pages/ProgressSubject.jsx';
import ProgressTopic from './pages/ProgressTopic.jsx';
import ClassSchedule from './pages/ClassSchedule.jsx';
import WeeklyPlan from './pages/WeeklyPlan.jsx';
import Exams from './pages/Exams.jsx';
import Backdrop from './components/Backdrop.jsx';
import ThemePicker from './components/ThemePicker.jsx';
import { useTheme } from './hooks/useTheme.js';

import {
  HomeIcon,
  ExamIcon,
  LogIcon,
  ProgressIcon,
  QuestionsIcon,
  ResourcesIcon,
  SettingsIcon,
  MoreIcon,
  TimerIcon,
  TimetableIcon,
  TopicsIcon,
  WeekIcon,
} from './components/Icons.jsx';

// Menü öğeleri: her yeni sayfa eklendiğinde buraya bir satır ve aşağıya bir <Route> eklenir
const NAV_ITEMS = [
  { to: '/', label: 'Ana Sayfa', short: 'Ana', Icon: HomeIcon, primary: true },
  { to: '/pomodoro', label: 'Pomodoro', short: 'Sayaç', Icon: TimerIcon, primary: true },
  { to: '/gunluk', label: 'Çalışma Günlüğü', short: 'Günlük', Icon: LogIcon },
  // questions: true olanlar yalnızca sınav hedeflerinde (YKS, DGS) görünür
  { to: '/sorular', label: 'Soru Kaydı', short: 'Soru', Icon: QuestionsIcon, questions: true },
  { to: '/kaynaklar', label: 'Kaynaklar', short: 'Kaynak', Icon: ResourcesIcon, questions: true },
  { to: '/denemeler', label: 'Denemeler', short: 'Deneme', Icon: ExamIcon, questions: true },
  { to: '/konular', label: 'Dersler ve Konular', short: 'Dersler', Icon: TopicsIcon },
  { to: '/ders-programi', label: 'Ders Programı', short: 'Program', Icon: TimetableIcon },
  { to: '/haftalik', label: 'Haftalık Program', short: 'Hafta', Icon: WeekIcon, primary: true },
  { to: '/ilerleme', label: 'İlerleme', short: 'İlerleme', Icon: ProgressIcon, primary: true },
  { to: '/ayarlar', label: 'Ayarlar', short: 'Ayarlar', Icon: SettingsIcon },
];

// Seçili hedefte görünen menü öğeleri (üniversitede soru ve kitap sayfaları yok)
function useNavItems() {
  const { track } = useTrack();
  const exam = tracksQuestions(track);
  return NAV_ITEMS.filter((item) => exam || !item.questions);
}

function NavItem({ to, label, short, Icon, primary }) {
  return (
    <NavLink to={to} end={to === '/'} title={label} className={primary ? 'nav-item' : 'nav-item secondary'}>
      <Icon />
      <span className="nav-label">{label}</span>
      <span className="nav-short">{short}</span>
    </NavLink>
  );
}

// Menü bağlantıları. Masaüstünde hepsi sol şeritte alt alta durur. Telefonda alt çubuğa yalnızca
// en sık kullanılan dördü sığar (on tanesi yan yana sıkışıp adları kesiliyordu); geri kalanı "Diğer"
// düğmesinin açtığı panelde iki sütun hâlinde durur.
function NavLinks() {
  const items = useNavItems();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const secondary = items.filter((item) => !item.primary);
  // Panel açıkken bir sayfaya geçilince kapanır; Esc ile de kapanır
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  const inSecondary = secondary.some((item) => item.to !== '/' && pathname.startsWith(item.to));

  return (
    <>
      {items.map((item) => (
        <NavItem key={item.to} {...item} />
      ))}
      <button
        type="button"
        className={inSecondary ? 'nav-more active' : 'nav-more'}
        aria-expanded={open}
        aria-controls="nav-sheet"
        onClick={() => setOpen((o) => !o)}
      >
        <MoreIcon />
        <span className="nav-short">Diğer</span>
      </button>
      {open && (
        <>
          <button type="button" className="nav-scrim" aria-label="Menüyü kapat" onClick={() => setOpen(false)} />
          <div id="nav-sheet" className="nav-sheet">
            {secondary.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'}>
                <item.Icon />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </>
      )}
    </>
  );
}

// Sayaç çalışırken başka sayfadayken de kalan süreyi menüde gösterir
function NavTimer() {
  const { phase, remaining } = usePomodoro();
  if (!phase) return null;
  return (
    <Link to="/pomodoro" className="nav-timer">
      {phase.kind === 'work' ? 'Çalışma' : 'Mola'} {formatTime(remaining)}
    </Link>
  );
}

// Menüdeki uygulama adı ve altında seçili hedef
function Brand() {
  const { track } = useTrack();
  return (
    <span className="brand">
      Ders Takip
      {track && <span className="brand-track">{trackInfo(track).title}</span>}
    </span>
  );
}

// Sayfalar seçili hedefe göre veri çeker. Hedef değişince `key` değişir ve tüm sayfa
// yeniden kurulur: her sayfa kendi verisini yeni hedef için baştan yükler.
function Pages() {
  const { track } = useTrack();
  const { pathname } = useLocation();
  if (!track) return null;
  // Üniversitede soru ve kitap sayfaları yok: eski bağlantıyla gelinirse ana sayfaya dönülür
  const exam = tracksQuestions(track);
  const examOnly = (element) => (exam ? element : <Navigate to="/" replace />);
  return (
    // Sayfa değişince kap yeniden kurulur ve kısa bir giriş hareketiyle gelir (route.css)
    <div className="route" key={pathname}>
      <Routes key={track}>
        <Route path="/" element={<Home />} />
        <Route path="/pomodoro" element={<Pomodoro />} />
        <Route path="/gunluk" element={<StudyLog />} />
        <Route path="/sorular" element={examOnly(<Questions />)} />
        <Route path="/kaynaklar" element={examOnly(<Resources />)} />
        <Route path="/denemeler" element={examOnly(<Exams />)} />
        <Route path="/konular" element={<Topics />} />
        <Route path="/ders-programi" element={<ClassSchedule />} />
        <Route path="/haftalik" element={<WeeklyPlan />} />
        <Route path="/ilerleme" element={<Progress />} />
        <Route path="/ilerleme/ders/:subjectId" element={<ProgressSubject />} />
        <Route path="/ilerleme/ders/:subjectId/konu/:topicId" element={<ProgressTopic />} />
        <Route path="/ayarlar" element={<Settings />} />
      </Routes>
    </div>
  );
}

export default function App() {
  const { theme, choose } = useTheme();
  // Açılışta kalıcı depolama izni istenir (sonuç Ayarlar sayfasında gösterilir)
  useEffect(() => {
    requestPersistence();
  }, []);
  return (
    <BackupProvider>
    <PomodoroProvider>
    <TrackProvider>
      <nav className="nav" aria-label="Ana menü">
        <div className="brand-row">
          <Brand />
          <ThemePicker theme={theme} onChoose={choose} />
        </div>
        <NavLinks />
        <NavTimer />
      </nav>
      <Backdrop theme={theme} />
      <main className="page">
        <Pages />
      </main>
    </TrackProvider>
    </PomodoroProvider>
    </BackupProvider>
  );
}
