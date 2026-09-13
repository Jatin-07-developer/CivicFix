import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase, type Report, STATUS_COLORS, ISSUE_TYPE_ICONS, STATUS_OPTIONS, SEVERITY_COLORS, type Severity } from '@/lib/supabase';

export function TrackReport() {
  const [searchParams] = useSearchParams();
  const [trackingId, setTrackingId] = useState(searchParams.get('id') ?? '');
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  // Auto-search if URL has ?id=CF-XXXXX
  useEffect(() => {
    const id = searchParams.get('id');
    if (id?.trim()) {
      doSearch(id.trim().toUpperCase());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doSearch = async (id: string) => {
    if (!id) return;
    setError(null);
    setReport(null);
    setLoading(true);
    setSearched(true);
    try {
      const { data, error: queryError } = await supabase
        .from('reports').select('*').eq('tracking_id', id).maybeSingle();
      if (queryError) throw queryError;
      if (data) setReport(data as Report);
      else setError('No report found with that tracking ID. Please check and try again.');
    } catch {
      setError('Could not search for the report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = trackingId.trim().toUpperCase();
    if (!trimmed) { setError('Please enter a tracking ID.'); return; }
    doSearch(trimmed);
  };

  const currentStatusIndex = report ? STATUS_OPTIONS.indexOf(report.status) : -1;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 text-xs font-semibold mb-4">
          🔍 Track Status
        </div>
        <h1 className="text-3xl font-black text-slate-800 dark:text-white">Track Your Report</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Enter your CivicFix tracking ID to see real-time status updates.</p>
      </div>

      {/* Search form */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          value={trackingId}
          onChange={(e) => setTrackingId(e.target.value)}
          placeholder="e.g. CF-AB12CD"
          className="flex-1 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm font-mono uppercase focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-900 transition-all"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-semibold hover:from-teal-500 hover:to-cyan-500 transition-all shadow-md hover:shadow-teal-500/25 disabled:opacity-60 whitespace-nowrap"
        >
          {loading ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : 'Track'}
        </button>
      </form>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-400 mb-6">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </div>
      )}

      {report && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* Status Banner */}
          <div
            className="px-6 py-5 flex items-center justify-between"
            style={{ backgroundColor: STATUS_COLORS[report.status] + '18' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: STATUS_COLORS[report.status] + '20' }}>
                {ISSUE_TYPE_ICONS[report.issue_type]}
              </div>
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide font-semibold">{report.issue_type}</p>
                <p className="font-mono text-sm font-bold text-slate-700 dark:text-slate-200">{report.tracking_id}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span
                className="px-3 py-1.5 rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: STATUS_COLORS[report.status] }}
              >
                {report.status}
              </span>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{ backgroundColor: SEVERITY_COLORS[report.severity as Severity] + '20', color: SEVERITY_COLORS[report.severity as Severity] }}
              >
                {report.severity} Priority
              </span>
            </div>
          </div>

          {/* Progress tracker */}
          <div className="px-6 py-6 border-b border-slate-100 dark:border-slate-800">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-5">Progress</p>
            <div className="flex items-center">
              {STATUS_OPTIONS.map((status, idx) => (
                <div key={status} className="flex-1 flex flex-col items-center relative">
                  {/* Connector line */}
                  {idx < STATUS_OPTIONS.length - 1 && (
                    <div
                      className="absolute top-3.5 left-1/2 w-full h-0.5 -z-0"
                      style={{
                        backgroundColor: idx < currentStatusIndex
                          ? STATUS_COLORS[STATUS_OPTIONS[currentStatusIndex]]
                          : '#e2e8f0',
                      }}
                    />
                  )}
                  {/* Dot */}
                  <div
                    className="w-7 h-7 rounded-full border-2 flex items-center justify-center relative z-10 transition-all"
                    style={{
                      borderColor: idx <= currentStatusIndex ? STATUS_COLORS[STATUS_OPTIONS[currentStatusIndex]] : '#e2e8f0',
                      backgroundColor: idx < currentStatusIndex ? STATUS_COLORS[STATUS_OPTIONS[currentStatusIndex]] : idx === currentStatusIndex ? 'white' : 'white',
                    }}
                  >
                    {idx < currentStatusIndex && (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {idx === currentStatusIndex && (
                      <div
                        className="w-3 h-3 rounded-full animate-pulse"
                        style={{ backgroundColor: STATUS_COLORS[STATUS_OPTIONS[currentStatusIndex]] }}
                      />
                    )}
                  </div>
                  <span
                    className="text-[9px] sm:text-[10px] mt-2 text-center font-semibold hidden sm:block"
                    style={{ color: idx <= currentStatusIndex ? STATUS_COLORS[STATUS_OPTIONS[currentStatusIndex]] : '#94a3b8' }}
                  >
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="p-6 space-y-5">
            {report.photo_url && (
              <div>
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Photo</p>
                <img src={report.photo_url} alt="Report" className="w-full h-56 object-cover rounded-xl border border-slate-200 dark:border-slate-700" />
              </div>
            )}
            {report.description && (
              <div>
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Description</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{report.description}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              {[
                { label: 'Department', value: report.department },
                { label: 'Priority Score', value: String(report.priority_score) },
                { label: 'Reported On', value: new Date(report.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) },
                { label: 'Last Updated', value: new Date(report.updated_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{item.label}</p>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{item.value}</p>
                </div>
              ))}
            </div>
            {report.location_text && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm">
                <span className="text-base flex-shrink-0">📍</span>
                <p className="text-slate-600 dark:text-slate-300">{report.location_text}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {!report && !error && !loading && searched === false && (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-16 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Enter your CivicFix tracking ID above to check your report's status in real time.</p>
          <p className="text-slate-400 dark:text-slate-600 text-xs mt-2">Format: CF-XXXXXX (shown when you submitted your report)</p>
        </div>
      )}
    </div>
  );
}
