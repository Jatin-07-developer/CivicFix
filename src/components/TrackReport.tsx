import { useState } from 'react';
import { supabase, type Report, STATUS_COLORS, ISSUE_TYPE_ICONS, STATUS_OPTIONS } from '@/lib/supabase';

export function TrackReport() {
  const [trackingId, setTrackingId] = useState('');
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setReport(null);

    const trimmed = trackingId.trim().toUpperCase();
    if (!trimmed) {
      setError('Please enter a tracking ID.');
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const { data, error: queryError } = await supabase
        .from('reports')
        .select('*')
        .eq('tracking_id', trimmed)
        .maybeSingle();

      if (queryError) throw queryError;

      if (data) {
        setReport(data as Report);
      } else {
        setError('No report found with that tracking ID. Please check and try again.');
      }
    } catch {
      setError('Could not search for the report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const currentStatusIndex = report
    ? STATUS_OPTIONS.indexOf(report.status)
    : -1;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Track Your Report</h1>
        <p className="text-slate-500 mt-1">Enter your tracking ID to check the current status.</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          value={trackingId}
          onChange={(e) => setTrackingId(e.target.value)}
          placeholder="e.g. CF-AB12CD"
          className="flex-1 px-4 py-3 rounded-xl border border-slate-300 text-sm font-mono uppercase focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-colors disabled:opacity-60"
        >
          {loading ? 'Searching...' : 'Track'}
        </button>
      </form>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 mb-6">
          {error}
        </div>
      )}

      {report && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Status Banner */}
          <div
            className="px-6 py-4 flex items-center justify-between"
            style={{ backgroundColor: STATUS_COLORS[report.status] + '15' }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{ISSUE_TYPE_ICONS[report.issue_type]}</span>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">{report.issue_type}</p>
                <p className="font-mono text-sm font-semibold text-slate-700">{report.tracking_id}</p>
              </div>
            </div>
            <span
              className="px-3 py-1 rounded-full text-sm font-semibold"
              style={{
                backgroundColor: STATUS_COLORS[report.status],
                color: 'white',
              }}
            >
              {report.status}
            </span>
          </div>

          {/* Progress Tracker */}
          <div className="px-6 py-5 border-b border-slate-100">
            <div className="flex items-center justify-between">
              {STATUS_OPTIONS.map((status, idx) => (
                <div key={status} className="flex flex-col items-center flex-1 relative">
                  {idx < STATUS_OPTIONS.length - 1 && (
                    <div
                      className="absolute top-3 left-1/2 w-full h-0.5"
                      style={{
                        backgroundColor: idx < currentStatusIndex ? STATUS_COLORS[STATUS_OPTIONS[currentStatusIndex]] : '#e2e8f0',
                      }}
                    />
                  )}
                  <div
                    className="w-6 h-6 rounded-full border-2 flex items-center justify-center relative z-10 bg-white"
                    style={{
                      borderColor: idx <= currentStatusIndex ? STATUS_COLORS[STATUS_OPTIONS[currentStatusIndex]] : '#e2e8f0',
                      backgroundColor: idx < currentStatusIndex ? STATUS_COLORS[STATUS_OPTIONS[currentStatusIndex]] : 'white',
                    }}
                  >
                    {idx < currentStatusIndex && (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {idx === currentStatusIndex && (
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: STATUS_COLORS[STATUS_OPTIONS[currentStatusIndex]] }}
                      />
                    )}
                  </div>
                  <span
                    className="text-[10px] mt-1.5 text-center font-medium hidden sm:block"
                    style={{
                      color: idx <= currentStatusIndex ? STATUS_COLORS[STATUS_OPTIONS[currentStatusIndex]] : '#94a3b8',
                    }}
                  >
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="p-6 space-y-4">
            {report.photo_url && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Photo</p>
                <img
                  src={report.photo_url}
                  alt="Report"
                  className="w-full h-56 object-cover rounded-xl border border-slate-200"
                />
              </div>
            )}

            {report.description && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Description</p>
                <p className="text-sm text-slate-700">{report.description}</p>
              </div>
            )}

            {report.location_text && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Location</p>
                <p className="text-sm text-slate-700">{report.location_text}</p>
                {report.latitude && report.longitude && (
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">
                    {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-between pt-2 border-t border-slate-100">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Reported</p>
                <p className="text-sm text-slate-700">
                  {new Date(report.created_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Last Updated</p>
                <p className="text-sm text-slate-700">
                  {new Date(report.updated_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!report && !error && !loading && searched === false && (
        <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-slate-400 text-sm">Enter your tracking ID above to see your report status.</p>
        </div>
      )}
    </div>
  );
}
