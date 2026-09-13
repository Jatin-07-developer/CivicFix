import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '@/lib/theme';

const CITIZEN_LINKS = [
  { to: '/report', label: 'Report Issue' },
  { to: '/track', label: 'Track Report' },
];

function ThemeToggle() {
  const { theme, toggleTheme, isAutoTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode${isAutoTheme ? ' (currently auto)' : ''}`}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all group
        bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700
        hover:border-teal-400 dark:hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-950"
    >
      {/* Sun icon */}
      <svg
        className={`w-4 h-4 transition-all duration-300 ${
          isDark ? 'text-slate-500 scale-75 opacity-50' : 'text-amber-500 scale-100'
        }`}
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m8.66-9H21M3 12H2m15.36-6.36l-.7.7M7.34 17.66l-.7.7M17.66 17.66l-.7-.7M7.34 6.34l-.7-.7M12 8a4 4 0 100 8 4 4 0 000-8z" />
      </svg>

      {/* Divider */}
      <span className="w-px h-3 bg-slate-300 dark:bg-slate-600" />

      {/* Moon icon */}
      <svg
        className={`w-4 h-4 transition-all duration-300 ${
          isDark ? 'text-teal-400 scale-100' : 'text-slate-400 scale-75 opacity-50'
        }`}
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>

      {/* Auto badge */}
      {isAutoTheme && (
        <span className="absolute -top-1.5 -right-1.5 text-[8px] font-bold px-1 py-0.5 rounded-full bg-teal-500 text-white leading-none">
          auto
        </span>
      )}
    </button>
  );
}

export function CitizenHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-slate-900/50 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-md group-hover:scale-105 group-hover:shadow-teal-500/30 transition-all duration-200">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="hidden sm:block">
              <span className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">CivicFix</span>
              <div className="text-[9px] font-semibold text-teal-500 uppercase tracking-widest -mt-0.5">Civic Platform</div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {CITIZEN_LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  location.pathname === item.to
                    ? 'bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right side controls */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            <Link
              to="/login"
              className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 transition-all shadow-sm hover:shadow-teal-500/25"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.062-.18-2.087-.51-3.031" />
              </svg>
              Staff Portal
            </Link>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {mobileOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
            {CITIZEN_LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  location.pathname === item.to
                    ? 'bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {item.label}
              </Link>
            ))}
            <button
              onClick={() => { navigate('/login'); setMobileOpen(false); }}
              className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 transition-colors"
            >
              Staff Portal →
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
