import { useEffect } from 'react';
import { Link, Navigate, NavLink, Route, Routes } from 'react-router-dom';
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
import Decor from './components/Decor.jsx';
import { useTheme } from './hooks/useTheme.js';

import {
  HomeIcon,
  MoonIcon,
  LogIcon,
  ProgressIcon,
  QuestionsIcon,
  ResourcesIcon,
  SettingsIcon,
  SunIcon,
  TimerIcon,
  TopicsIcon,
} from './components/Icons.jsx';

// Menü öğeleri: her yeni sayfa eklendiğinde buraya bir satır ve aşağıya bir <Route> eklenir
const NAV_ITEMS = [
  { to: '/', label: 'Ana Sayfa', short: 'Ana', Icon: HomeIcon },
  { to: '/pomodoro', label: 'Pomodoro', short: 'Sayaç', Icon: TimerIcon },
  { to: '/gunluk', label: 'Çalışma Günlüğü', short: 'Günlük', Icon: LogIcon },
  // questions: true olanlar yalnızca sınav hedeflerinde (YKS, DGS) görünür
  { to: '/sorular', label: 'Soru Kaydı', short: 'Soru', Icon: QuestionsIcon, questions: true },
  { to: '/kaynaklar', label: 'Kaynaklar', short: 'Kaynak', Icon: ResourcesIcon, questions: true },
  { to: '/konular', label: 'Dersler ve Konular', short: 'Dersler', Icon: TopicsIcon },
  { to: '/ilerleme', label: 'İlerleme', short: 'İlerleme', Icon: ProgressIcon },
  { to: '/ayarlar', label: 'Ayarlar', short: 'Ayarlar', Icon: SettingsIcon },
];

// Menü bağlantıları: seçili hedefte olmayan sayfalar listelenmez
function NavLinks() {
  const { track } = useTrack();
  const exam = tracksQuestions(track);
  return NAV_ITEMS.filter((item) => exam || !item.questions).map(({ to, label, short, Icon }) => (
    <NavLink key={to} to={to} end={to === '/'} title={label}>
      <Icon />
      <span className="nav-label">{label}</span>
      <span className="nav-short">{short}</span>
    </NavLink>
  ));
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
  if (!track) return null;
  // Üniversitede soru ve kitap sayfaları yok: eski bağlantıyla gelinirse ana sayfaya dönülür
  const exam = tracksQuestions(track);
  const examOnly = (element) => (exam ? element : <Navigate to="/" replace />);
  return (
    <Routes key={track}>
      <Route path="/" element={<Home />} />
      <Route path="/pomodoro" element={<Pomodoro />} />
      <Route path="/gunluk" element={<StudyLog />} />
      <Route path="/sorular" element={examOnly(<Questions />)} />
      <Route path="/kaynaklar" element={examOnly(<Resources />)} />
      <Route path="/konular" element={<Topics />} />
      <Route path="/ilerleme" element={<Progress />} />
      <Route path="/ilerleme/ders/:subjectId" element={<ProgressSubject />} />
      <Route path="/ilerleme/ders/:subjectId/konu/:topicId" element={<ProgressTopic />} />
      <Route path="/ayarlar" element={<Settings />} />
    </Routes>
  );
}

export default function App() {
  const { theme, toggle } = useTheme();
  // Açılışta kalıcı depolama izni istenir (sonuç Ayarlar sayfasında gösterilir)
  useEffect(() => {
    requestPersistence();
  }, []);
  const goingLight = theme === 'dark';
  const toggleLabel = goingLight ? 'Açık temaya geç' : 'Koyu temaya geç';
  return (
    <BackupProvider>
    <PomodoroProvider>
    <TrackProvider>
      <nav className="nav" aria-label="Ana menü">
        <div className="brand-row">
          <Brand />
          <button
            type="button"
            className="theme-toggle"
            onClick={toggle}
            aria-label={toggleLabel}
            title={toggleLabel}
          >
            {goingLight ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
        <NavLinks />
        <NavTimer />
      </nav>
      <Decor />
      <main className="page">
        <Pages />
      </main>
    </TrackProvider>
    </PomodoroProvider>
    </BackupProvider>
  );
}
