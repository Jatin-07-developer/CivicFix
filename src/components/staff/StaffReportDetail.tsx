import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import {
  supabase,
  type Report,
  type ReportStatus,
  type StatusHistory,
  type Escalation,
  STATUS_OPTIONS,
  STATUS_COLORS,
  SEVERITY_COLORS,
  ISSUE_TYPE_ICONS,
  ISSUE_TYPE_COLORS,
  type Severity,
  isOverdue,
  getSLALabel,
} from '@/lib/supabase';
import { createColoredIcon } from '@/lib/leaflet.css';
import { useAuth } from '@/lib/auth';

export function StaffReportDetail() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();

  const [report, setReport] = useState<Report | null>(null);
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState<ReportStatus>('Reported');
  const [note, setNote] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (reportId) loadAll(); }, [reportId]);

  const loadAll = async () => {
    if (!reportId) return;
    setLoading(true);
    const [rRes, hRes, eRes] = await Promise.all([
      supabase.from('reports').select('*').eq('id', reportId).maybeSingle(),
      supabase.from('status_history').select('*').eq('report_id', reportId).order('created_at', { ascending: true }),
      supabase.from('escalations').select('*').eq('report_id', reportId).order('created_at', { ascending: true }),
    ]);

    if (rRes.data) {
      const r = rRes.data as Report;
      setReport(r);
      setNewStatus(r.status);
    } else {
      setError('Report not found.');
    }
    setHistory((hRes.data as StatusHistory[]) ?? []);
    setEscalations((eRes.data as Escalation[]) ?? []);
    setLoading(false);
  };

  const handleStatusUpdate = async () => {
    if (!report || newStatus === report.status) return;
    setUpdating(true);
    setError(null);

    const { data, error: err } = await supabase
      .from('reports')
      .update({ status: newStatus })
      .eq('id', report.id)
      .select('*')
      .maybeSingle();

    if (err) {
      setError('Failed to update status: ' + err.message);
    } else if (data) {
      const updated = data as Report;
      setReport(updated);
      // Refresh history
      const hRes = await supabase.from('status_history').select('*').eq('report_id', reportId).order('created_at', { ascending: true });
      setHistory((hRes.data as StatusHistory[]) ?? []);
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
    }
    setUpdating(false);
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

  if (error || !report) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
        <p className="text-slate-400 mb-4">{error ?? 'Report not found.'}</p>
        <button onClick={() => navigate('/staff')} className="px-6 py-3 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-500">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const over = isOverdue(report);
  const slaLabel = getSLALabel(report);

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* Overdue banner */}
      {over && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/15 border border-red-500/30">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
          <p className="text-sm font-semibold text-red-300">SLA Breached — {slaLabel}. Immediate action required.</p>
        </div>
      )}

      {/* Header card */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{ISSUE_TYPE_ICONS[report.issue_type]}</span>
              <h1 className="text-xl font-bold text-white">{report.issue_type}</h1>
            </div>
            <span className="font-mono text-sm text-teal-400">{report.tracking_id}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="px-3 py-1.5 rounded-full text-xs font-bold"
              style={{ backgroundColor: SEVERITY_COLORS[report.severity as Severity] + '20', color: SEVERITY_COLORS[report.severity as Severity] }}
            >
              {report.severity} Severity
            </span>
            <span
              className="px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ backgroundColor: STATUS_COLORS[report.status] + '20', color: STATUS_COLORS[report.status] }}
            >
              {report.status}
            </span>
            <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-white/10 text-slate-300">
              Score: {report.priority_score}
            </span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/8">
          {[
            { label: 'Department', value: report.department },
            { label: 'SLA Status', value: slaLabel, danger: over },
            { label: 'Reported', value: new Date(report.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
            { label: 'Last Updated', value: new Date(report.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{item.label}</p>
              <p className={`text-sm font-medium ${item.danger ? 'text-red-400' : 'text-slate-200'}`}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Left: Photo + Description + Map */}
        <div className="space-y-4">
          {report.photo_url && (
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <img src={report.photo_url} alt="Issue photo" className="w-full h-56 object-cover" />
            </div>
          )}
          {report.description && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Description</p>
              <p className="text-sm text-slate-300 leading-relaxed">{report.description}</p>
            </div>
          )}
          {report.latitude && report.longitude && (
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-4 pt-3 pb-2">Location</p>
              {report.location_text && (
                <p className="text-sm text-slate-300 px-4 pb-2">{report.location_text}</p>
              )}
              <MapContainer
                center={[report.latitude, report.longitude]}
                zoom={15}
                style={{ height: '200px', width: '100%' }}
                scrollWheelZoom={false}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap contributors'
                />
                <Marker
                  position={[report.latitude, report.longitude]}
                  icon={createColoredIcon(ISSUE_TYPE_COLORS[report.issue_type])}
                />
              </MapContainer>
            </div>
          )}
        </div>

        {/* Right: Status update + Timeline + Escalations */}
        <div className="space-y-4">
          {/* Status update */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Update Status</p>
            <div className="relative mb-3">
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as ReportStatus)}
                disabled={updating}
                className="w-full appearance-none px-4 py-3 pr-10 rounded-xl bg-white/10 border border-white/15 text-white text-sm focus:outline-none focus:border-teal-500 disabled:opacity-60"
                style={{ colorScheme: 'dark', borderLeftColor: STATUS_COLORS[newStatus], borderLeftWidth: '3px' }}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s} style={{ background: '#1e293b' }}>{s}</option>
                ))}
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {updateSuccess && (
              <div className="mb-3 p-3 rounded-xl bg-teal-500/15 border border-teal-500/30 text-sm text-teal-300 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Status updated and logged to history.
              </div>
            )}
            {error && (
              <div className="mb-3 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-sm text-red-300">{error}</div>
            )}
            <button
              onClick={handleStatusUpdate}
              disabled={updating || newStatus === report.status}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-sm font-semibold hover:from-teal-400 hover:to-cyan-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {updating ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </>
              ) : 'Save Status'}
            </button>
          </div>

          {/* Status Timeline */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Status Timeline</p>
            {history.length === 0 ? (
              <p className="text-xs text-slate-600">No history recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {history.map((h, idx) => (
                  <div key={h.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: STATUS_COLORS[h.new_status as ReportStatus] ?? '#6b7280' }}
                      />
                      {idx < history.length - 1 && (
                        <div className="w-px flex-1 bg-white/10 mt-1 mb-1 min-h-[12px]" />
                      )}
                    </div>
                    <div className="pb-2 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-slate-200">{h.new_status}</span>
                        {h.old_status && (
                          <span className="text-[10px] text-slate-600">from {h.old_status}</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {new Date(h.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        {h.changed_by && ` · ${h.changed_by}`}
                      </p>
                      {h.note && <p className="text-[10px] text-slate-400 mt-0.5 italic">{h.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Escalation log */}
          {escalations.length > 0 && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4">
              <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-3">Escalation Log</p>
              <div className="space-y-3">
                {escalations.map((esc) => (
                  <div key={esc.id} className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 mt-1.5" />
                    <div>
                      <p className="text-xs font-semibold text-red-300">Escalated to {esc.escalated_to}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{esc.reason}</p>
                      <p className="text-[10px] text-slate-600 mt-0.5">
                        {new Date(esc.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        {esc.escalated_by && ` · ${esc.escalated_by}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
