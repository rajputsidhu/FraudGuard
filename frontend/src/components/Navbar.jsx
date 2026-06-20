import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck, Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';

const Navbar = () => {
  const location = useLocation();
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', next);
      return next;
    });
  };

  return (
    <nav className="navbar">
      <div className="nav-left">
        <ShieldCheck color="var(--primary)" size={28} />
        <span className="nav-brand">FraudGuard</span>
      </div>
      
      <div className="nav-center">
        <Link 
          to="/" 
          className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
        >
          Dashboard
        </Link>
        <Link 
          to="/live-monitor" 
          className={`nav-link ${location.pathname === '/live-monitor' ? 'active' : ''}`}
        >
          Live Monitor
        </Link>
        <Link 
          to="/model-stats" 
          className={`nav-link ${location.pathname === '/model-stats' ? 'active' : ''}`}
        >
          Model Stats
        </Link>
        <Link 
          to="/batch-upload" 
          className={`nav-link ${location.pathname === '/batch-upload' ? 'active' : ''}`}
        >
          Batch Upload
        </Link>
      </div>
      
      <div className="nav-right">
        <button 
          onClick={toggleTheme} 
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="nav-theme-btn"
          style={{ 
            transform: hovered ? 'scale(1.08)' : 'scale(1)'
          }} 
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? (
            <Sun size={18} color="var(--primary)" />
          ) : (
            <Moon size={18} color="var(--primary)" />
          )}
        </button>
        <div className="nav-status-badge">
          <span className="nav-status-dot"></span>
          Model Active
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
