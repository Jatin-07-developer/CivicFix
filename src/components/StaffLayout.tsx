import { NavLink as RouterNavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

export function StaffLayout({ children }: { children: React.ReactNode }) {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navItems = [
    { to: '/dashboard', label: 'Reports', active: location.pathname === '/dashboard' },
    {
      to: '/dashboard/map',
      label: 'Map View',
      active: location.pathname === '/dashboard/map',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="sticky top-0 z-50 bg-slate-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-md">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.256.512a2.25 2.25 0 002.15 1.287h4.382a2.25 2.25 0 002.15-1.287l.256-.512M12 11a8.5 8.5 0 01-7.5 8.45M12 11V4m0 7h7m-7 0H5" />
                </svg>
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight">CivicFix</span>
                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-medium">
                  Staff
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {navItems.map((item) => (
                <RouterNavLink
                  key={item.to}
                  to={item.to}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    item.active
                      ? 'bg-white/10 text-white'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </RouterNavLink>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden sm:block text-xs text-slate-400 truncate max-w-[180px]">
                {session?.user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
