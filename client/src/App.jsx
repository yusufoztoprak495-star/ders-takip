import { Link, NavLink, Route, Routes } from 'react-router-dom';
import { PomodoroProvider, usePomodoro } from './context/PomodoroContext.jsx';
import { formatTime } from './lib/pomodoro.js';
import Home from './pages/Home.jsx';
import Pomodoro from './pages/Pomodoro.jsx';
import StudyLog from './pages/StudyLog.jsx';
import Questions from './pages/Questions.jsx';
import Resources from './pages/Resources.jsx';
import Topics from './pages/Topics.jsx';
import Progress from './pages/Progress.jsx';

import {
  HomeIcon,
  LogIcon,
  ProgressIcon,
  QuestionsIcon,
  ResourcesIcon,
  TimerIcon,
  TopicsIcon,
} from './components/Icons.jsx';

// Menü öğeleri: her yeni sayfa eklendiğinde buraya bir satır ve aşağıya bir <Route> eklenir
const NAV_ITEMS = [
  { to: '/', label: 'Ana Sayfa', short: 'Ana', Icon: HomeIcon },
  { to: '/pomodoro', label: 'Pomodoro', short: 'Pomodoro', Icon: TimerIcon },
  { to: '/gunluk', label: 'Çalışma Günlüğü', short: 'Günlük', Icon: LogIcon },
  { to: '/sorular', label: 'Soru Kaydı', short: 'Soru', Icon: QuestionsIcon },
  { to: '/kaynaklar', label: 'Kaynaklar', short: 'Kaynak', Icon: ResourcesIcon },
  { to: '/konular', label: 'Konular', short: 'Konu', Icon: TopicsIcon },
  { to: '/ilerleme', label: 'İlerleme', short: 'İlerleme', Icon: ProgressIcon },
];

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

export default function App() {
  return (
    <PomodoroProvider>
      <nav className="nav" aria-label="Ana menü">
        <span className="brand">Ders Takip</span>
        {NAV_ITEMS.map(({ to, label, short, Icon }) => (
          <NavLink key={to} to={to} end title={label}>
            <Icon />
            <span className="nav-label">{label}</span>
            <span className="nav-short">{short}</span>
          </NavLink>
        ))}
        <NavTimer />
      </nav>
      <main className="page">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/pomodoro" element={<Pomodoro />} />
          <Route path="/gunluk" element={<StudyLog />} />
          <Route path="/sorular" element={<Questions />} />
          <Route path="/kaynaklar" element={<Resources />} />
          <Route path="/konular" element={<Topics />} />
          <Route path="/ilerleme" element={<Progress />} />
        </Routes>
      </main>
    </PomodoroProvider>
  );
}
