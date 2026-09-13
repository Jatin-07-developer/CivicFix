import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { supabase, type Report, type ReportStatus, STATUS_OPTIONS, STATUS_COLORS, ISSUE_TYPE_ICONS, ISSUE_TYPE_COLORS } from '@/lib/supabase';
import { createColoredIcon } from '@/lib/leaflet.css';

export function ReportDetail() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState<ReportStatus>('Reported');
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (reportId) loadReport();
  }, [reportId]);

  const loadReport = async () => {
    if (!reportId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .maybeSingle();

    if (error) {
      setError('Failed to load report.');
    } else if (data) {
      setReport(data as Report);
      setNewStatus((data as Report).status);
    } else {
      setError('Report not found.');
    }
    setLoading(false);
  };

  const handleStatusUpdate = async () => {
    if (!report || newStatus === report.status) return;

    setUpdating(true);
    setUpdateSuccess(false);
    setError(null);

    const { data, error } = await supabase
      .from('reports')
      .update({ status: newStatus })
      .eq('id', report.id)
      .select('*')
      .maybeSingle();

    if (error) {
      setError('Failed to update status: ' + error.message);
    } else if (data) {
      setReport(data as Report);
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
    }
    setUpdating(false);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <svg className="w-8 h-8 mx-auto animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-slate-500 mt-3">Loading report...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <p className="text-slate-500 mb-4">{error ?? 'Report not found.'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Dashboard
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{ISSUE_TYPE_ICONS[report.issue_type]}</span>
                <h1 className="text-xl font-bold text-slate-800">{report.issue_type}</h1>
              </div>
              <p className="font-mono text-sm text-teal-600 font-semibold">{report.tracking_id}</p>
            </div>
            <span
              className="px-3 py-1.5 rounded-full text-sm font-semibold"
              style={{
                backgroundColor: STATUS_COLORS[report.status] + '20',
                color: STATUS_COLORS[report.status],
              }}
            >
              {report.status}
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-0">
          {/* Left: Photo & Description */}
          <div className="p-6 space-y-4 border-b md:border-b-0 md:border-r border-slate-100">
            {report.photo_url && (
              <img
                src={report.photo_url}
                alt="Report"
                className="w-full h-56 object-cover rounded-xl border border-slate-200"
              />
            )}

            {report.description && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Description</p>
                <p className="text-sm text-slate-700 leading-relaxed">{report.description}</p>
              </div>
            )}

            <div className="flex gap-4 pt-2 border-t border-slate-100">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Reported</p>
                <p className="text-sm text-slate-700">
                  {new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
                <p className="text-xs text-slate-400">
                  {new Date(report.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Last Updated</p>
                <p className="text-sm text-slate-700">
                  {new Date(report.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Location & Status Update */}
          <div className="p-6 space-y-4">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Location</p>
              {report.location_text && (
                <p className="text-sm text-slate-700 mb-1">{report.location_text}</p>
              )}
              {report.latitude && report.longitude && (
                <p className="text-xs text-slate-400 font-mono mb-3">
                  {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
                </p>
              )}
              {report.latitude && report.longitude && (
                <div className="rounded-xl overflow-hidden border border-slate-200">
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

            {/* Status Update with Dropdown */}
            <div className="pt-4 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Update Status</p>

              <div className="relative">
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as ReportStatus)}
                  disabled={updating}
                  className="w-full appearance-none px-4 py-3 pr-10 rounded-xl border-2 border-slate-200 text-sm font-medium text-slate-700 bg-white focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 disabled:opacity-60 cursor-pointer"
                  style={{
                    borderLeftColor: STATUS_COLORS[newStatus],
                    borderLeftWidth: '4px',
                  }}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
                <svg
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                <span>Current:</span>
                <span
                  className="px-2 py-0.5 rounded-full font-semibold"
                  style={{ backgroundColor: STATUS_COLORS[report.status] + '20', color: STATUS_COLORS[report.status] }}
                >
                  {report.status}
                </span>
              </div>

              {updateSuccess && (
                <div className="mt-3 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Status updated successfully!
                </div>
              )}

              {error && (
                <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                onClick={handleStatusUpdate}
                disabled={updating || newStatus === report.status}
                className="w-full mt-3 px-4 py-3 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {updating ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Updating...
                  </>
                ) : (
                  'Save Status'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
