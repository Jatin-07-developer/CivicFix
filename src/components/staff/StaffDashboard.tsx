import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  supabase,
  type Report,
  type IssueType,
  type Severity,
  ISSUE_TYPE_COLORS,
  ISSUE_TYPE_ICONS,
  STATUS_COLORS,
  SEVERITY_COLORS,
  DEPARTMENTS,
  isOverdue,
  getSLALabel,
} from '@/lib/supabase';

type SortBy = 'priority' | 'date';

export function StaffDashboard() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<IssueType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDept, setFilterDept] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('priority');

  useEffect(() => { loadReports(); }, []);

  const loadReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setReports((data as Report[]) ?? []);
    setLoading(false);
  };

  const stats = useMemo(() => {
    const total = reports.length;
    const open = reports.filter((r) => r.status !== 'Resolved' && r.status !== 'Verified').length;
    const overdue = reports.filter((r) => isOverdue(r)).length;
    const highPriority = reports.filter((r) => r.severity === 'High').length;
    const resolvedToday = reports.filter((r) => {
      if (r.status !== 'Resolved' && r.status !== 'Verified') return false;
      const d = new Date(r.updated_at);
      const today = new Date();
      return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
    }).length;
    const byDept: Record<string, number> = {};
    DEPARTMENTS.forEach((d) => { byDept[d] = reports.filter((r) => r.department === d && r.status !== 'Resolved' && r.status !== 'Verified').length; });
    return { total, open, overdue, highPriority, resolvedToday, byDept };
  }, [reports]);

  const filtered = useMemo(() => {
    const result = reports.filter((r) => {
      if (filterType !== 'all' && r.issue_type !== filterType) return false;
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (filterDept !== 'all' && r.department !== filterDept) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          r.tracking_id.toLowerCase().includes(q) ||
          r.issue_type.toLowerCase().includes(q) ||
          (r.location_text?.toLowerCase().includes(q) ?? false) ||
          (r.description?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });

    // Pin overdue first, then sort
    result.sort((a, b) => {
      const aOv = isOverdue(a) ? 1 : 0;
      const bOv = isOverdue(b) ? 1 : 0;
      if (aOv !== bOv) return bOv - aOv;
      if (sortBy === 'priority') return b.priority_score - a.priority_score;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return result;
  }, [reports, filterType, filterStatus, filterDept, search, sortBy]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">Live overview of all civic reports</p>
        </div>
        <button
          onClick={loadReports}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/8 border border-white/12 text-slate-300 text-sm font-medium hover:bg-white/15 transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Reports', value: stats.total, color: 'text-white', bg: 'bg-white/8', icon: '📋' },
          { label: 'Open Issues', value: stats.open, color: 'text-blue-400', bg: 'bg-blue-500/10', icon: '🔵' },
          { label: 'Overdue', value: stats.overdue, color: 'text-red-400', bg: 'bg-red-500/10', icon: '🔴' },
          { label: 'High Priority', value: stats.highPriority, color: 'text-amber-400', bg: 'bg-amber-500/10', icon: '⚡' },
          { label: 'Resolved Today', value: stats.resolvedToday, color: 'text-teal-400', bg: 'bg-teal-500/10', icon: '✅' },
        ].map((stat) => (
          <div key={stat.label} className={`${stat.bg} border border-white/10 rounded-2xl p-4`}>
            <div className="text-xl mb-1">{stat.icon}</div>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Department breakdown */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Open Issues by Department</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {DEPARTMENTS.map((dept) => {
            const count = stats.byDept[dept] ?? 0;
            const maxCount = Math.max(...Object.values(stats.byDept), 1);
            const pct = (count / maxCount) * 100;
            return (
              <div key={dept} className="flex flex-col gap-1.5">
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-lg font-bold text-white">{count}</span>
                <span className="text-[10px] text-slate-500 leading-tight">{dept.replace(' Department', '')}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters + Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/8 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search by ID, type, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500"
          />
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-slate-300 text-sm focus:outline-none focus:border-teal-500"
            style={{ colorScheme: 'dark' }}
          >
            <option value="all">All Departments</option>
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-slate-300 text-sm focus:outline-none focus:border-teal-500"
            style={{ colorScheme: 'dark' }}
          >
            <option value="all">All Statuses</option>
            <option value="Reported">Reported</option>
            <option value="Acknowledged">Acknowledged</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Verified">Verified</option>
          </select>
          <div className="flex items-center gap-1 bg-white/10 rounded-xl px-1 py-1">
            {(['priority', 'date'] as SortBy[]).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  sortBy === s ? 'bg-teal-500/30 text-teal-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s === 'priority' ? 'Priority' : 'Date'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <svg className="w-8 h-8 mx-auto animate-spin text-teal-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-slate-500 mt-3">Loading reports...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-500 text-sm">No reports match your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/8">
                  {['ID', 'Type', 'Severity', 'Score', 'Department', 'Status', 'SLA', 'Date'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((report) => {
                  const over = isOverdue(report);
                  const slaLabel = getSLALabel(report);
                  return (
                    <tr
                      key={report.id}
                      onClick={() => navigate(`/staff/report/${report.id}`)}
                      className={`cursor-pointer transition-colors ${
                        over ? 'bg-red-500/5 hover:bg-red-500/10' : 'hover:bg-white/5'
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {over && (
                            <span className="inline-flex items-center justify-center w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                          )}
                          <span className="font-mono text-xs font-semibold text-teal-400">{report.tracking_id}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">{ISSUE_TYPE_ICONS[report.issue_type]}</span>
                          <span className="text-sm text-slate-300">{report.issue_type}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: SEVERITY_COLORS[report.severity as Severity] + '25', color: SEVERITY_COLORS[report.severity as Severity] }}
                        >
                          {report.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-sm font-bold ${
                          report.priority_score >= 30 ? 'text-red-400' :
                          report.priority_score >= 20 ? 'text-amber-400' : 'text-slate-400'
                        }`}>
                          {report.priority_score}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ISSUE_TYPE_COLORS[report.issue_type] }} />
                          <span className="text-xs text-slate-400">{report.department.replace(' Department', '')}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: STATUS_COLORS[report.status] + '20', color: STATUS_COLORS[report.status] }}
                        >
                          {report.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-xs font-semibold ${
                          over ? 'text-red-400' : slaLabel.includes('h left') ? 'text-amber-400' : 'text-slate-500'
                        }`}>
                          {slaLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                        {new Date(report.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
