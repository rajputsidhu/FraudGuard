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
    <nav style={styles.navbar}>
      <div style={styles.left}>
        <ShieldCheck color="var(--primary)" size={28} />
        <span style={styles.brand}>FraudGuard</span>
      </div>
      
      <div style={styles.center}>
        <Link to="/" style={{ ...styles.link, ...(location.pathname === '/' ? styles.activeLink : {}) }}>Dashboard</Link>
        <Link to="/live-monitor" style={{ ...styles.link, ...(location.pathname === '/live-monitor' ? styles.activeLink : {}) }}>Live Monitor</Link>
        <Link to="/model-stats" style={{ ...styles.link, ...(location.pathname === '/model-stats' ? styles.activeLink : {}) }}>Model Stats</Link>
        <Link to="/batch-upload" style={{ ...styles.link, ...(location.pathname === '/batch-upload' ? styles.activeLink : {}) }}>Batch Upload</Link>
      </div>
      
      <div style={styles.right}>
        <button 
          onClick={toggleTheme} 
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{ 
            ...styles.themeBtn, 
            backgroundColor: hovered ? 'var(--bg-hover)' : 'rgba(255, 255, 255, 0.03)',
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
        <div style={styles.statusBadge}>
          <span style={styles.statusDot}></span>
          Model Active
        </div>
      </div>
    </nav>
  );
};

const styles = {
  navbar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '60px',
    backgroundColor: 'var(--bg-card)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    zIndex: 1000,
    transition: 'background-color 0.4s ease, border-color 0.4s ease',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  brand: {
    color: 'var(--primary)',
    fontWeight: 600,
    fontSize: '20px',
    transition: 'color 0.4s ease',
  },
  center: {
    display: 'flex',
    gap: '24px',
  },
  link: {
    color: 'var(--text-secondary)',
    fontWeight: 500,
    fontSize: '14px',
    padding: '8px 4px',
    textDecoration: 'none',
    borderBottom: '2px solid transparent',
    transition: 'color 0.2s, border-color 0.2s',
  },
  activeLink: {
    color: 'var(--primary)',
    fontWeight: 600,
    borderBottom: '2px solid var(--primary)',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
  },
  themeBtn: {
    border: '1px solid var(--border)',
    borderRadius: '50%',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '16px',
    cursor: 'pointer',
    outline: 'none',
    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'var(--success-light)',
    color: 'var(--success)',
    padding: '6px 12px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 500,
    transition: 'background-color 0.4s ease, color 0.4s ease',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    backgroundColor: 'var(--success)',
    borderRadius: '50%',
    transition: 'background-color 0.4s ease',
  }
};

export default Navbar;
