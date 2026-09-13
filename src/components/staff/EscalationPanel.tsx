import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  supabase,
  type Report,
  type ReportStatus,
  ISSUE_TYPE_ICONS,
  SEVERITY_COLORS,
  type Severity,
  isOverdue,
  getSLALabel,
  getSLAHoursRemaining,
} from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

type EscalationTarget = 'Department Head' | 'Ward Officer' | 'Admin';

export function EscalationPanel() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [escalatingId, setEscalatingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  useEffect(() => { loadOverdue(); }, []);

  const loadOverdue = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('reports')
      .select('*')
      .not('status', 'in', '("Resolved","Verified")')
      .order('priority_score', { ascending: false });
    const overdueList = ((data as Report[]) ?? []).filter(isOverdue);
    setReports(overdueList);
    setLoading(false);
  };

  const handleEscalate = async (report: Report, target: EscalationTarget) => {
    setEscalatingId(report.id);
    const hours = Math.abs(getSLAHoursRemaining(report));
    const days = Math.floor(hours / 24);
    await supabase.from('escalations').insert({
      report_id: report.id,
      escalated_to: target,
      reason: `SLA breached by ${days} day${days !== 1 ? 's' : ''}. Automatic escalation from staff portal.`,
      escalated_by: session?.user?.email ?? 'system',
    });
    setSuccessId(report.id);
    setEscalatingId(null);
    setTimeout(() => setSuccessId(null), 3000);
  };

  const handleAcknowledge = async (report: Report) => {
    setUpdatingId(report.id);
    await supabase.from('reports').update({ status: 'Acknowledged' as ReportStatus }).eq('id', report.id);
    setReports((prev) => prev.filter((r) => r.id !== report.id));
    setUpdatingId(null);
  };

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Escalations</h1>
          <p className="text-sm text-slate-400 mt-0.5">Reports that have breached their SLA window</p>
        </div>
        {reports.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/15 border border-red-500/30">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-semibold text-red-400">{reports.length} overdue</span>
          </div>
        )}
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25">
        <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className="text-sm font-semibold text-amber-300">About SLA Escalations</p>
          <p className="text-xs text-amber-400/70 mt-0.5 leading-relaxed">
            Reports are flagged overdue when they exceed their SLA: High severity = 7 days, Medium = 14 days, Low = 30 days.
            Use Escalate to formally notify a higher authority and log the event for audit.
          </p>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-16 text-center">
          <div className="text-4xl mb-4">🎉</div>
          <h3 className="text-lg font-semibold text-white mb-2">All Clear!</h3>
          <p className="text-sm text-slate-400">No reports have breached their SLA window. Great work!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const hours = Math.abs(getSLAHoursRemaining(report));
            const days = Math.floor(hours / 24);
            const isEscalating = escalatingId === report.id;
            const isUpdating = updatingId === report.id;
            const didEscalate = successId === report.id;

            return (
              <div
                key={report.id}
                className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 hover:bg-red-500/10 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Report info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                      <span className="text-base">{ISSUE_TYPE_ICONS[report.issue_type]}</span>
                      <h3 className="text-sm font-bold text-white">{report.issue_type}</h3>
                      <span className="font-mono text-xs text-teal-400">{report.tracking_id}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{ backgroundColor: SEVERITY_COLORS[report.severity as Severity] + '20', color: SEVERITY_COLORS[report.severity as Severity] }}
                      >
                        {report.severity}
                      </span>
                      <span className="text-xs text-red-400 font-semibold">
                        ⏰ {days}d {Math.floor(hours % 24)}h overdue
                      </span>
                      <span className="text-xs text-slate-500">{report.department}</span>
                    </div>
                    {report.location_text && (
                      <p className="text-xs text-slate-500 mt-1.5">📍 {report.location_text}</p>
                    )}
                    {report.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{report.description}</p>
                    )}
                    {didEscalate && (
                      <p className="mt-2 text-xs text-teal-400 font-semibold">✓ Escalation logged successfully</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 flex-shrink-0 min-w-[200px]">
                    <button
                      onClick={() => navigate(`/staff/report/${report.id}`)}
                      className="px-4 py-2 rounded-xl bg-white/10 text-slate-300 text-xs font-medium hover:bg-white/20 transition-all border border-white/10 text-center"
                    >
                      View Report →
                    </button>
                    <button
                      onClick={() => handleAcknowledge(report)}
                      disabled={isUpdating}
                      className="px-4 py-2 rounded-xl bg-teal-500/20 text-teal-300 text-xs font-semibold hover:bg-teal-500/30 transition-all border border-teal-500/25 disabled:opacity-50"
                    >
                      {isUpdating ? 'Saving...' : '✓ Acknowledge Now'}
                    </button>
                    <div className="grid grid-cols-3 gap-1">
                      {(['Department Head', 'Ward Officer', 'Admin'] as EscalationTarget[]).map((t) => (
                        <button
                          key={t}
                          onClick={() => handleEscalate(report, t)}
                          disabled={isEscalating || !!didEscalate}
                          className="px-1.5 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-[9px] font-semibold hover:bg-red-500/30 transition-all border border-red-500/20 disabled:opacity-50 text-center"
                        >
                          {isEscalating ? '...' : t.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                    <p className="text-[9px] text-slate-600 text-center">Escalate to →</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
