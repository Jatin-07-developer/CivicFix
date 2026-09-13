import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  supabase,
  type Report,
  type ReportStatus,
  ISSUE_TYPE_ICONS,
  STATUS_COLORS,
  SEVERITY_COLORS,
  type Severity,
  DEPARTMENTS,
  isOverdue,
  getSLALabel,
  getSLAHoursRemaining,
  getSLADeadline,
} from '@/lib/supabase';

const KANBAN_COLS: ReportStatus[] = ['Reported', 'Acknowledged', 'In Progress', 'Resolved'];

function SLABar({ report }: { report: Report }) {
  const deadline = getSLADeadline(report);
  const created = new Date(report.created_at);
  const total = deadline.getTime() - created.getTime();
  const elapsed = Date.now() - created.getTime();
  const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
  const hours = getSLAHoursRemaining(report);
  const over = hours < 0;

  return (
    <div>
      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${over ? 'bg-red-500' : pct > 75 ? 'bg-amber-500' : 'bg-teal-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-[9px] mt-0.5 block font-semibold ${over ? 'text-red-400' : pct > 75 ? 'text-amber-400' : 'text-slate-500'}`}>
        {getSLALabel(report)}
      </span>
    </div>
  );
}

function StatusBadge({ status, onClick }: { status: ReportStatus; onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="text-[10px] px-2 py-0.5 rounded-full font-semibold transition-opacity hover:opacity-80"
      style={{ backgroundColor: STATUS_COLORS[status] + '20', color: STATUS_COLORS[status] }}
    >
      {status}
    </button>
  );
}

export function DepartmentQueue() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => { loadReports(); }, []);

  const loadReports = async () => {
    setLoading(true);
    const { data } = await supabase.from('reports').select('*').order('priority_score', { ascending: false });
    setReports((data as Report[]) ?? []);
    setLoading(false);
  };

  const advanceStatus = async (report: Report, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const order: ReportStatus[] = ['Reported', 'Acknowledged', 'In Progress', 'Resolved', 'Verified'];
    const idx = order.indexOf(report.status);
    if (idx === -1 || idx >= order.length - 1) return;
    const nextStatus = order[idx + 1];
    setUpdatingId(report.id);
    await supabase.from('reports').update({ status: nextStatus }).eq('id', report.id);
    setReports((prev) => prev.map((r) => r.id === report.id ? { ...r, status: nextStatus } : r));
    setUpdatingId(null);
  };

  const filtered = useMemo(() =>
    selectedDept === 'all' ? reports : reports.filter((r) => r.department === selectedDept),
    [reports, selectedDept]
  );

  const byStatus = useMemo(() => {
    const map: Record<ReportStatus, Report[]> = {
      Reported: [], Acknowledged: [], 'In Progress': [], Resolved: [], Verified: [],
    };
    filtered.forEach((r) => {
      if (map[r.status]) map[r.status].push(r);
    });
    return map;
  }, [filtered]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <svg className="w-8 h-8 animate-spin text-teal-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Department Queue</h1>
          <p className="text-sm text-slate-400 mt-0.5">Kanban view — click a card to advance its status</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-slate-300 text-sm focus:outline-none focus:border-teal-500"
            style={{ colorScheme: 'dark' }}
          >
            <option value="all">All Departments</option>
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <button onClick={loadReports} className="px-3 py-2 rounded-xl bg-white/8 border border-white/12 text-slate-400 text-sm hover:bg-white/15 transition-all">
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {KANBAN_COLS.map((col) => {
          const cards = byStatus[col] ?? [];
          const overdueCards = cards.filter(isOverdue);
          return (
            <div key={col} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              {/* Column header */}
              <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[col] }} />
                  <span className="text-sm font-semibold text-slate-200">{col}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {overdueCards.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-semibold">
                      {overdueCards.length} overdue
                    </span>
                  )}
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-slate-400 font-semibold">
                    {cards.length}
                  </span>
                </div>
              </div>

              {/* Cards */}
              <div className="p-3 space-y-2 max-h-[600px] overflow-y-auto">
                {cards.length === 0 ? (
                  <p className="text-center text-xs text-slate-600 py-6">No reports</p>
                ) : (
                  cards.map((report) => {
                    const over = isOverdue(report);
                    return (
                      <div
                        key={report.id}
                        onClick={() => navigate(`/staff/report/${report.id}`)}
                        className={`group relative p-3 rounded-xl border cursor-pointer transition-all ${
                          over
                            ? 'bg-red-500/8 border-red-500/30 hover:bg-red-500/15'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {over && (
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider">Overdue</span>
                          </div>
                        )}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm">{ISSUE_TYPE_ICONS[report.issue_type]}</span>
                              <span className="text-xs font-semibold text-slate-200">{report.issue_type}</span>
                            </div>
                            <span className="font-mono text-[9px] text-teal-400">{report.tracking_id}</span>
                          </div>
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0"
                            style={{ backgroundColor: SEVERITY_COLORS[report.severity as Severity] + '20', color: SEVERITY_COLORS[report.severity as Severity] }}
                          >
                            {report.severity}
                          </span>
                        </div>

                        <SLABar report={report} />

                        {report.location_text && (
                          <p className="text-[10px] text-slate-500 mt-2 truncate">{report.location_text}</p>
                        )}

                        {/* Advance button */}
                        {col !== 'Resolved' && (
                          <button
                            onClick={(e) => advanceStatus(report, e)}
                            disabled={updatingId === report.id}
                            className="mt-2.5 w-full py-1.5 rounded-lg bg-teal-500/15 text-teal-400 text-[10px] font-semibold hover:bg-teal-500/30 transition-all disabled:opacity-50 border border-teal-500/20"
                          >
                            {updatingId === report.id ? '...' : `→ Mark ${['Reported', 'Acknowledged', 'In Progress', 'Resolved'][['Reported', 'Acknowledged', 'In Progress', 'Resolved'].indexOf(col) + 1]}`}
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
