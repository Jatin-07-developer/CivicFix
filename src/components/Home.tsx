import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, type Report, ISSUE_TYPE_ICONS, STATUS_COLORS, type ReportStatus } from '@/lib/supabase';

// ── Animated counter hook ──────────────────────────────────────────────────
function useCountUp(target: number, duration = 1500) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = Date.now();
          const tick = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return { count, ref };
}

// ── Stat card ──────────────────────────────────────────────────────────────
function StatCard({ icon, value, label, suffix = '', color }: {
  icon: string; value: number; label: string; suffix?: string; color: string;
}) {
  const { count, ref } = useCountUp(value);
  return (
    <div ref={ref} className={`relative overflow-hidden rounded-2xl border p-6 transition-all hover:scale-105 hover:shadow-lg ${color}`}>
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-white">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">{label}</div>
    </div>
  );
}

// ── Recent activity ticker item ────────────────────────────────────────────
function TickerItem({ report }: { report: Report }) {
  const timeAgo = (() => {
    const diff = Date.now() - new Date(report.created_at).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  })();

  return (
    <div className="inline-flex items-center gap-2 mx-6 px-4 py-2 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex-shrink-0">
      <span className="text-base">{ISSUE_TYPE_ICONS[report.issue_type]}</span>
      <span className="text-sm text-slate-700 dark:text-slate-200 font-medium">{report.issue_type}</span>
      <span
        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
        style={{ backgroundColor: STATUS_COLORS[report.status] + '20', color: STATUS_COLORS[report.status] }}
      >
        {report.status}
      </span>
      <span className="text-xs text-slate-400">{timeAgo}</span>
    </div>
  );
}

// ── Issue type card ────────────────────────────────────────────────────────
const ISSUE_DETAIL = [
  { icon: '🚧', label: 'Pothole', desc: 'Road damage & surface defects', color: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800', badge: 'Roads' },
  { icon: '🗑️', label: 'Garbage', desc: 'Overflowing bins & illegal dumps', color: 'bg-lime-50 dark:bg-lime-950/30 border-lime-200 dark:border-lime-800', badge: 'Sanitation' },
  { icon: '💧', label: 'Water Leak', desc: 'Pipe bursts & water wastage', color: 'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800', badge: 'Water' },
  { icon: '💡', label: 'Streetlight', desc: 'Broken or non-functional lights', color: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800', badge: 'Electrical' },
  { icon: '🌊', label: 'Waterlogging', desc: 'Flooding & drainage blockage', color: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800', badge: 'Drainage' },
  { icon: '⚡', label: 'Downed Wire', desc: 'Fallen electrical infrastructure', color: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800', badge: 'Electrical' },
];

// ── Feature card ───────────────────────────────────────────────────────────
const FEATURES = [
  { icon: '🤖', title: 'AI Classification', desc: 'Vision AI auto-detects issue type and severity from your photo — no manual categorisation.' },
  { icon: '🗺️', title: 'Live Map', desc: 'See every open issue in your city pinned on an interactive real-time map.' },
  { icon: '🔁', title: 'Duplicate Grouping', desc: 'Same issue? Reports within 100m are merged so departments see one consolidated ticket.' },
  { icon: '⏱️', title: 'SLA Enforcement', desc: 'Every ticket has an automatic clock. Overdue issues escalate to senior officers.' },
  { icon: '🏆', title: 'Ward Scorecards', desc: 'Public performance leaderboard — department resolution rates hold officials accountable.' },
  { icon: '🔔', title: 'Status Updates', desc: 'Get notified by email when your report moves from Reported → In Progress → Resolved.' },
];

// ── Timeline step ──────────────────────────────────────────────────────────
const HOW_IT_WORKS = [
  {
    num: '01', icon: '📸', title: 'Snap & Submit',
    desc: 'Take a photo of the issue. Your GPS location is captured automatically. Add an optional note and hit submit — no account required.',
    cta: 'Start reporting',
    color: 'from-teal-500 to-cyan-500',
  },
  {
    num: '02', icon: '🤖', title: 'AI Processes It',
    desc: 'Our vision AI classifies the issue, assigns severity, and auto-routes it to the right municipal department within seconds.',
    color: 'from-blue-500 to-indigo-500',
  },
  {
    num: '03', icon: '🆔', title: 'Get a Tracking ID',
    desc: 'Receive a unique CivicFix ID (e.g. CF-AB12CD) instantly. Use it to track your report\'s journey from Reported → Resolved.',
    color: 'from-violet-500 to-purple-500',
  },
  {
    num: '04', icon: '✅', title: 'Verified & Closed',
    desc: 'Staff upload a "resolved" photo. You confirm it\'s fixed. The issue is officially closed and counted in your ward\'s health score.',
    color: 'from-green-500 to-emerald-500',
  },
];

// ── Testimonial ─────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    text: "I reported a pothole near my building and it was fixed within 5 days. I couldn't believe it — I could track every status update in real time.",
    name: 'Priya Menon',
    role: 'Resident, Bangalore',
    avatar: '👩',
  },
  {
    text: "Our NGO uses CivicFix to coordinate cleanup drives. The volunteer claim feature means we can resolve small issues without waiting for the municipality.",
    name: 'Rohan Desai',
    role: 'NGO Coordinator, Pune',
    avatar: '👨',
  },
  {
    text: "As a ward councillor, the public scorecard keeps my office honest. Citizens can see exactly how we're performing against SLA targets.",
    name: 'Sunita Krishnan',
    role: 'Ward Councillor',
    avatar: '👩‍💼',
  },
];

export function Home() {
  const navigate = useNavigate();
  const [recentReports, setRecentReports] = useState<Report[]>([]);
  const [stats, setStats] = useState({ total: 0, resolved: 0, departments: 6, cities: 1 });

  useEffect(() => {
    // Fetch live stats
    Promise.all([
      supabase.from('reports').select('*', { count: 'exact', head: true }),
      supabase.from('reports').select('*', { count: 'exact', head: true }).in('status', ['Resolved', 'Verified']),
      supabase.from('reports').select('id, issue_type, status, created_at').order('created_at', { ascending: false }).limit(20),
    ]).then(([totalRes, resolvedRes, recentRes]) => {
      setStats({
        total: totalRes.count ?? 0,
        resolved: resolvedRes.count ?? 0,
        departments: 6,
        cities: 1,
      });
      setRecentReports((recentRes.data as Report[]) ?? []);
    });
  }, []);

  return (
    <div className="overflow-x-hidden">

      {/* ═══ HERO ════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden bg-gradient-to-br from-teal-600 via-cyan-600 to-slate-800 dark:from-slate-950 dark:via-teal-950 dark:to-slate-950">
        {/* Animated mesh background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 opacity-20 dark:opacity-10" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }} />
          {/* Glow blobs */}
          <div className="absolute top-1/4 left-1/5 w-80 h-80 bg-teal-400/30 dark:bg-teal-500/20 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-1/4 right-1/5 w-64 h-64 bg-cyan-400/25 dark:bg-cyan-500/15 rounded-full blur-3xl animate-float-delayed" />
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-blue-400/10 dark:bg-blue-500/10 rounded-full blur-3xl animate-float-slow" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Copy */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 dark:bg-white/8 backdrop-blur-sm text-white text-sm font-medium mb-6 border border-white/20">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Live platform · Free forever
              </div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6">
                Report it.
                <br />
                <span className="shimmer-text">Fix it.</span>
                <br />
                <span className="opacity-80">Track it.</span>
              </h1>
              <p className="text-lg sm:text-xl text-white/80 dark:text-teal-100/70 mb-8 leading-relaxed max-w-lg">
                Spot a pothole, broken streetlight, or water leak? Report it in 30 seconds.
                AI routes it to the right department. You track it until it's fixed.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => navigate('/report')}
                  className="group px-8 py-4 rounded-2xl bg-white text-teal-700 font-bold text-lg hover:bg-teal-50 transition-all shadow-xl hover:shadow-2xl hover:scale-105 flex items-center justify-center gap-2"
                >
                  <span className="text-xl">📸</span>
                  Report an Issue
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
                <button
                  onClick={() => navigate('/track')}
                  className="px-8 py-4 rounded-2xl bg-white/10 dark:bg-white/5 backdrop-blur-sm border border-white/25 text-white font-semibold text-lg hover:bg-white/20 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                >
                  <span className="text-xl">🔍</span>
                  Track a Report
                </button>
              </div>

              {/* Trust signals */}
              <div className="flex items-center gap-6 mt-8">
                {[
                  { val: stats.total > 0 ? `${stats.total}+` : '∞', label: 'Issues reported' },
                  { val: stats.resolved > 0 ? `${stats.resolved}+` : '—', label: 'Resolved' },
                  { val: '0₹', label: 'Cost to citizens' },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="text-2xl font-black text-white">{s.val}</div>
                    <div className="text-xs text-white/60">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Floating mock card */}
            <div className="hidden lg:block">
              <div className="relative">
                {/* Main card */}
                <div className="glass-card rounded-3xl p-6 shadow-2xl animate-float">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white text-lg">🚧</div>
                    <div>
                      <div className="text-white font-semibold text-sm">Pothole Reported</div>
                      <div className="font-mono text-xs text-teal-300">CF-A3B7F2</div>
                    </div>
                    <span className="ml-auto text-xs px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-300 font-semibold">In Progress</span>
                  </div>
                  {/* Progress bar */}
                  <div className="space-y-2 mb-4">
                    {['Reported', 'Acknowledged', 'In Progress', 'Resolved'].map((s, i) => (
                      <div key={s} className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center ${i <= 2 ? 'bg-teal-400' : 'bg-white/20'}`}>
                          {i <= 2 && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        <span className={`text-xs font-medium ${i <= 2 ? 'text-white' : 'text-white/30'}`}>{s}</span>
                        {i === 2 && <span className="ml-auto text-[10px] text-amber-300 font-bold animate-pulse">← Now</span>}
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-white/50">Roads Department · SLA: 5d left</div>
                </div>

                {/* Floating mini cards */}
                <div className="absolute -top-6 -right-6 glass-card rounded-2xl p-3 shadow-lg animate-float-delayed">
                  <div className="text-2xl font-black text-white">12</div>
                  <div className="text-[10px] text-white/60">Nearby reports</div>
                </div>
                <div className="absolute -bottom-4 -left-4 glass-card rounded-2xl p-3 shadow-lg animate-float-slow">
                  <div className="flex items-center gap-2">
                    <span className="text-green-400 text-lg">✓</span>
                    <div>
                      <div className="text-white text-xs font-semibold">Resolved in 4d</div>
                      <div className="text-white/50 text-[10px]">Ward 7 · High score</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-50 dark:from-slate-950 to-transparent" />
      </section>

      {/* ═══ LIVE ACTIVITY TICKER ═══════════════════════════════════════════ */}
      {recentReports.length > 0 && (
        <section className="py-5 bg-white dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 pl-4 sm:pl-8 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">Live</span>
            </div>
            <div className="ticker-wrap flex-1">
              <div className="ticker-track">
                {[...recentReports, ...recentReports].map((r, i) => (
                  <TickerItem key={`${r.id}-${i}`} report={r} />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══ LIVE STATS ══════════════════════════════════════════════════════ */}
      <section className="py-20 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 text-sm font-semibold mb-4">
              📊 Real-time Impact
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-white mb-3">
              Every Report Counts
            </h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Live numbers from the CivicFix platform — updated in real time.
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard icon="📋" value={Math.max(stats.total, 1)} label="Issues Reported" color="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800" />
            <StatCard icon="✅" value={Math.max(stats.resolved, 0)} label="Resolved" color="bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900" />
            <StatCard icon="🏢" value={stats.departments} label="Departments Active" color="bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900" />
            <StatCard icon="🌆" value={stats.cities} label="Cities Live" suffix="+" color="bg-violet-50 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-900" />
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ════════════════════════════════════════════════════ */}
      <section className="py-20 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-semibold mb-4">
              ⚡ Simple Process
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-white mb-3">How CivicFix Works</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto">From a single photo to a resolved issue — completely transparent, every step of the way.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.num} className="relative group">
                {/* Connector line */}
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-[60%] w-[80%] h-px bg-gradient-to-r from-slate-200 dark:from-slate-700 to-transparent z-0" />
                )}
                <div className="relative bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-lg dark:hover:shadow-teal-900/20 transition-all group-hover:-translate-y-1">
                  {/* Step number */}
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center text-xl shadow-lg mb-4`}>
                    {step.icon}
                  </div>
                  <span className="text-5xl font-black text-slate-100 dark:text-slate-700 absolute top-4 right-5 select-none">{step.num}</span>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{step.desc}</p>
                  {step.cta && (
                    <button
                      onClick={() => navigate('/report')}
                      className="mt-4 text-sm font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
                    >
                      {step.cta} →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ ISSUE TYPES ═════════════════════════════════════════════════════ */}
      <section className="py-20 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-sm font-semibold mb-4">
              🗂️ What We Handle
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-white mb-3">Issue Types</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">AI automatically identifies and routes each type to the right department.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {ISSUE_DETAIL.map((type) => (
              <button
                key={type.label}
                onClick={() => navigate('/report')}
                className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 ${type.color} hover:scale-105 hover:shadow-lg transition-all group text-left`}
              >
                <span className="text-3xl group-hover:scale-110 transition-transform">{type.icon}</span>
                <div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100 text-center">{type.label}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 text-center leading-tight mt-0.5">{type.desc}</div>
                </div>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/60 dark:bg-black/30 text-slate-500 dark:text-slate-400">
                  → {type.badge}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES GRID ═══════════════════════════════════════════════════ */}
      <section className="py-20 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 text-sm font-semibold mb-4">
              🚀 Platform Features
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-white mb-3">Built for Accountability</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
              CivicFix is more than a reporting tool — it's a full accountability platform designed so no issue can quietly disappear.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group relative bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-xl dark:hover:shadow-teal-900/20 transition-all hover:-translate-y-1"
              >
                <div className="text-3xl mb-4 group-hover:scale-110 transition-transform inline-block">{f.icon}</div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-b-2xl scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TESTIMONIALS ════════════════════════════════════════════════════ */}
      <section className="py-20 bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-700 dark:from-slate-900 dark:via-teal-950 dark:to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)',
          backgroundSize: '36px 36px',
        }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">What Citizens Say</h2>
            <p className="text-white/70 max-w-md mx-auto">Real stories from residents, volunteers, and elected officials.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="glass-card rounded-2xl p-6">
                <div className="text-3xl mb-4">{t.avatar}</div>
                <p className="text-white/90 text-sm leading-relaxed mb-4 italic">"{t.text}"</p>
                <div>
                  <div className="text-sm font-bold text-white">{t.name}</div>
                  <div className="text-xs text-white/60">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ DARK MODE INFO STRIP ════════════════════════════════════════════ */}
      <section className="py-8 bg-slate-100 dark:bg-slate-800 border-y border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌙</span>
            <div>
              <p className="text-sm font-bold text-slate-700 dark:text-white">Automatic Night Mode</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">CivicFix switches to dark mode after 6 PM and back to light at 6 AM, following your local time.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
            <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m8.66-9H21M3 12H2m15.36-6.36l-.7.7M7.34 17.66l-.7.7M17.66 17.66l-.7-.7M7.34 6.34l-.7-.7M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
            <span>6 AM – 6 PM: Light</span>
            <span className="text-slate-300 dark:text-slate-600 mx-1">·</span>
            <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            <span>6 PM – 6 AM: Dark</span>
            <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 dark:bg-teal-500/30 text-teal-600 dark:text-teal-400 font-semibold">Toggle with the ☀/🌙 button in nav</span>
          </div>
        </div>
      </section>

      {/* ═══ DUAL CTA ════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-6">
          {/* Citizen CTA */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-500 to-cyan-600 p-8 sm:p-10">
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: 'radial-gradient(circle at 50% 50%, white 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }} />
            <div className="relative">
              <div className="text-4xl mb-4">🏙️</div>
              <h3 className="text-2xl font-black text-white mb-3">See a Problem?</h3>
              <p className="text-white/80 mb-6 leading-relaxed">
                Report it in under 30 seconds. No account required. Your city will look better because of you.
              </p>
              <button
                onClick={() => navigate('/report')}
                className="px-6 py-3 rounded-xl bg-white text-teal-700 font-bold hover:bg-teal-50 transition-all shadow-lg hover:shadow-xl hover:scale-105"
              >
                Report Now — It's Free
              </button>
            </div>
          </div>

          {/* Staff CTA */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-800 dark:to-slate-950 border border-slate-700 p-8 sm:p-10">
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: 'radial-gradient(circle at 50% 50%, white 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }} />
            <div className="relative">
              <div className="text-4xl mb-4">🏛️</div>
              <h3 className="text-2xl font-black text-white mb-3">Municipal Staff?</h3>
              <p className="text-slate-300 mb-6 leading-relaxed">
                Access the full staff portal — department queues, SLA dashboards, escalation alerts, and public performance scorecards.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold hover:from-teal-400 hover:to-cyan-400 transition-all shadow-lg hover:scale-105"
              >
                Staff Portal →
              </button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
