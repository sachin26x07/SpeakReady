import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Headphones, Mic, GraduationCap,
  MessageSquare, FileText, Brain, BookMarked,
  BarChart2, Settings, Shield, Menu, X, Zap, Sun, Moon
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  to: string;
  section?: string;
}

const navItems: NavItem[] = [
  { icon: <LayoutDashboard size={18} />, label: 'Dashboard', to: '/', section: 'main' },
  { icon: <Zap size={18} />, label: 'Daily Practice', to: '/daily', section: 'main' },
  { icon: <BookOpen size={18} />, label: 'Reading Aloud', to: '/reading', section: 'practice' },
  { icon: <Headphones size={18} />, label: 'Listening', to: '/listening', section: 'practice' },
  { icon: <Mic size={18} />, label: 'Listen & Repeat', to: '/repeat', section: 'practice' },
  { icon: <GraduationCap size={18} />, label: 'Grammar', to: '/grammar', section: 'practice' },
  { icon: <MessageSquare size={18} />, label: 'Speaking', to: '/speaking', section: 'practice' },
  { icon: <FileText size={18} />, label: 'Resume Interview', to: '/interview', section: 'practice' },
  { icon: <Brain size={18} />, label: 'Mock Assessment', to: '/mock', section: 'more' },
  { icon: <BookMarked size={18} />, label: 'Vocabulary', to: '/vocabulary', section: 'more' },
  { icon: <BarChart2 size={18} />, label: 'Progress', to: '/progress', section: 'more' },
  { icon: <Settings size={18} />, label: 'AI Settings', to: '/settings', section: 'config' },
  { icon: <Shield size={18} />, label: 'Privacy & Data', to: '/privacy', section: 'config' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const { settings, updateSettings } = useSettings();
  const location = useLocation();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.darkMode ? 'dark' : 'light');
  }, [settings.darkMode]);

  useEffect(() => {
    setMobileDrawerOpen(false);
    setSidebarCollapsed(true);
  }, [location.pathname]);

  const toggleSidebar = () => {
    if (window.innerWidth <= 768) {
      setMobileDrawerOpen(prev => !prev);
    } else {
      setSidebarCollapsed(prev => !prev);
    }
  };

  const handleNavClick = () => {
    setMobileDrawerOpen(false);
    setSidebarCollapsed(true);
  };

  const sections: Record<string, string> = {
    main: 'Overview',
    practice: 'Practice Modules',
    more: 'More',
    config: 'Configuration',
  };

  const groupedItems = navItems.reduce((acc, item) => {
    const sec = item.section || 'main';
    if (!acc[sec]) acc[sec] = [];
    acc[sec].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  return (
    <div className="app-shell">
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${mobileDrawerOpen ? 'visible' : ''}`}
        onClick={() => setMobileDrawerOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileDrawerOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="sidebar-logo-icon">
              <Mic size={20} color="white" />
            </div>
            <div className="sidebar-logo-text">
              <div className="sidebar-logo-name">SpeakReady AI</div>
              <div className="sidebar-logo-tagline">Speak Confidently</div>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-icon"
            onClick={toggleSidebar}
            style={{ color: 'var(--text-sidebar)', padding: 6 }}
            title="Close menu"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {Object.entries(groupedItems).map(([section, items]) => (
            <div key={section}>
              <div className="sidebar-section-label">{sections[section]}</div>
              {items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={handleNavClick}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            className="nav-item"
            onClick={() => updateSettings({ darkMode: !settings.darkMode })}
          >
            <span className="nav-icon">
              {settings.darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </span>
            {settings.darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <header className="top-bar">
          <div className="flex items-center gap-md">
            <button
              className="btn btn-ghost btn-icon"
              onClick={toggleSidebar}
              title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
              aria-label="Toggle navigation menu"
            >
              <Menu size={20} />
            </button>
            <div>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 16 }}>
                {navItems.find(n => n.to === location.pathname)?.label || 'SpeakReady AI'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-sm">
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {settings.provider === 'gemini' ? '🤖 Gemini' : '⚡ Groq'}
            </span>
          </div>
        </header>

        <main className="page-content fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
