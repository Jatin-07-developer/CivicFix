import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { type UserRole, USER_ROLE_LABELS } from '@/lib/supabase';

const ROLE_OPTIONS: { value: UserRole; label: string; desc: string }[] = [
  { value: 'municipal_staff', label: 'Municipal Staff', desc: 'Manage department reports & update statuses' },
  { value: 'ward_officer', label: 'Ward Officer', desc: 'Oversee your ward, handle escalations' },
  { value: 'department_head', label: 'Department Head', desc: 'Full department view & performance metrics' },
  { value: 'admin', label: 'Admin', desc: 'City-level oversight, all features' },
  { value: 'elected_rep', label: 'Elected Representative', desc: 'Read-only constituency dashboard' },
];

export function StaffLogin() {
  const { session, signIn, signUp, signOut } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('municipal_staff');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Already logged in state
  if (session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950">
        <div className="w-full max-w-sm mx-auto px-6">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 text-center shadow-2xl">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center mb-5 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.062-.18-2.087-.51-3.031" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Welcome back</h2>
            <p className="text-sm text-slate-400 mb-6">{session.user.email}</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate('/staff')}
                className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold hover:from-teal-400 hover:to-cyan-400 transition-all shadow-lg"
              >
                Go to Staff Portal
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full px-6 py-3 rounded-xl bg-white/10 text-slate-300 font-medium hover:bg-white/20 transition-colors"
              >
                Back to Citizen View
              </button>
              <button
                onClick={async () => { await signOut(); }}
                className="w-full mt-1 text-sm text-slate-500 hover:text-slate-300 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error);
        } else {
          navigate('/staff');
        }
      } else {
        const { error } = await signUp(email, password, role);
        if (error) {
          setError(error);
        } else {
          setSuccessMsg('Account created! Check your email to confirm, then sign in.');
          setMode('login');
        }
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950">
      {/* ── Left Panel (branding) ── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] flex-col justify-between p-12 relative overflow-hidden">
        {/* Background grid decoration */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)',
          backgroundSize: '36px 36px',
        }} />
        {/* Glow blobs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-xl">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">CivicFix</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
            The Staff Portal<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">
              for Accountable Cities
            </span>
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed max-w-md">
            Manage civic reports, track SLA compliance, escalate overdue issues, and view real-time performance scorecards — all in one place.
          </p>
        </div>

        {/* Feature highlights */}
        <div className="relative space-y-4">
          {[
            { icon: '📋', title: 'Department Queues', desc: 'Kanban-style task management per department' },
            { icon: '⚡', title: 'SLA Enforcement', desc: 'Auto-flag and escalate overdue tickets' },
            { icon: '📊', title: 'Performance Scorecards', desc: 'Live department and ward-level metrics' },
          ].map((f) => (
            <div key={f.title} className="flex items-center gap-4">
              <span className="text-2xl flex-shrink-0">{f.icon}</span>
              <div>
                <p className="text-sm font-semibold text-white">{f.title}</p>
                <p className="text-xs text-slate-500">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Panel (form) ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 lg:py-0">
        <div className="w-full max-w-md">
          {/* Mobile-only logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">CivicFix</span>
          </div>

          {/* Card */}
          <div className="bg-white/8 backdrop-blur-2xl border border-white/15 rounded-3xl p-8 shadow-2xl">
            {/* Header */}
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-white mb-1">
                {mode === 'login' ? 'Sign in to your account' : 'Create a staff account'}
              </h2>
              <p className="text-sm text-slate-400">
                {mode === 'login'
                  ? 'Access the CivicFix municipal staff portal'
                  : 'Get access to manage civic issue reports'}
              </p>
            </div>

            {/* Mode Toggle */}
            <div className="flex bg-white/10 rounded-xl p-1 mb-6">
              {(['login', 'signup'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(null); setSuccessMsg(null); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    mode === m
                      ? 'bg-white/20 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {m === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="officer@municipal.gov.in"
                  autoComplete="email"
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/15 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500 focus:bg-white/15 focus:ring-1 focus:ring-teal-500/50 transition-all"
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="At least 6 characters"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    className="w-full px-4 py-3 pr-11 rounded-xl bg-white/10 border border-white/15 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500 focus:bg-white/15 focus:ring-1 focus:ring-teal-500/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Role selector — only on signup */}
              {mode === 'signup' && (
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-slate-300 mb-1.5">
                    Your Role
                  </label>
                  <div className="relative">
                    <select
                      id="role"
                      value={role}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                      className="w-full appearance-none px-4 py-3 pr-10 rounded-xl bg-white/10 border border-white/15 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 transition-all cursor-pointer"
                      style={{ colorScheme: 'dark' }}
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r.value} value={r.value} style={{ background: '#1e293b' }}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5">
                    {ROLE_OPTIONS.find((r) => r.value === role)?.desc}
                  </p>
                </div>
              )}

              {/* Error / Success messages */}
              {error && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-500/15 border border-red-500/30">
                  <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}
              {successMsg && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-teal-500/15 border border-teal-500/30">
                  <svg className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-teal-300">{successMsg}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold text-sm hover:from-teal-400 hover:to-cyan-400 transition-all shadow-lg shadow-teal-500/25 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Please wait...
                  </>
                ) : mode === 'login' ? 'Sign In to Portal' : 'Create Staff Account'}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back to public site
              </button>
              <span className="text-xs text-slate-600">Municipal use only</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
