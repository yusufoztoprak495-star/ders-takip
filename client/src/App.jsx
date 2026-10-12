import { NavLink, Route, Routes } from 'react-router-dom';
import Home from './pages/Home.jsx';

// Menü öğeleri: her yeni sayfa eklendiğinde buraya bir satır ve aşağıya bir <Route> eklenir
const NAV_ITEMS = [{ to: '/', label: 'Ana Sayfa' }];

export default function App() {
  return (
    <>
      <nav className="nav">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <main className="page">
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </main>
    </>
  );
}
