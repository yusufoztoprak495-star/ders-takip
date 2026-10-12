import { Link, NavLink, Route, Routes } from 'react-router-dom';
import { PomodoroProvider, usePomodoro } from './context/PomodoroContext.jsx';
import { formatTime } from './lib/pomodoro.js';
import Home from './pages/Home.jsx';
import Pomodoro from './pages/Pomodoro.jsx';

// Menü öğeleri: her yeni sayfa eklendiğinde buraya bir satır ve aşağıya bir <Route> eklenir
const NAV_ITEMS = [
  { to: '/', label: 'Ana Sayfa' },
  { to: '/pomodoro', label: 'Pomodoro' },
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
      <nav className="nav">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end>
            {item.label}
          </NavLink>
        ))}
        <NavTimer />
      </nav>
      <main className="page">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/pomodoro" element={<Pomodoro />} />
        </Routes>
      </main>
    </PomodoroProvider>
  );
}
