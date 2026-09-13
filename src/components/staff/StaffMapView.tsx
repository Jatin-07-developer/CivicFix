import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import {
  supabase,
  type Report,
  type IssueType,
  ISSUE_TYPE_COLORS,
  ISSUE_TYPE_ICONS,
  STATUS_COLORS,
  SEVERITY_COLORS,
  type Severity,
  isOverdue,
} from '@/lib/supabase';
import { createColoredIcon } from '@/lib/leaflet.css';

export function StaffMapView() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<IssueType | 'all'>('all');

  useEffect(() => {
    supabase.from('reports').select('*').then(({ data }) => {
      setReports((data as Report[]) ?? []);
      setLoading(false);
    });
  }, []);

  const mapReports = useMemo(() =>
    reports.filter(
      (r) => r.latitude !== null && r.longitude !== null &&
      (filterType === 'all' || r.issue_type === filterType)
    ),
    [reports, filterType]
  );

  const center: [number, number] = mapReports.length > 0
    ? [mapReports[0].latitude!, mapReports[0].longitude!]
    : [20.5937, 78.9629]; // India center fallback

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Map View</h1>
          <p className="text-sm text-slate-400 mt-0.5">All geo-tagged reports — click a pin for details</p>
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as IssueType | 'all')}
          className="px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-slate-300 text-sm focus:outline-none focus:border-teal-500"
          style={{ colorScheme: 'dark' }}
        >
          <option value="all">All Types</option>
          {(Object.keys(ISSUE_TYPE_COLORS) as IssueType[]).map((t) => (
            <option key={t} value={t}>{ISSUE_TYPE_ICONS[t]} {t}</option>
          ))}
        </select>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-xl">
        {(Object.keys(ISSUE_TYPE_COLORS) as IssueType[]).map((type) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ISSUE_TYPE_COLORS[type] }} />
            <span className="text-xs text-slate-400">{ISSUE_TYPE_ICONS[type]} {type}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 bg-white/5 border border-white/10 rounded-2xl">
          <svg className="w-8 h-8 animate-spin text-teal-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          {mapReports.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-500 text-sm">No geo-tagged reports to display.</p>
            </div>
          ) : (
            <MapContainer center={center} zoom={12} style={{ height: '560px', width: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />
              {mapReports.map((report) => (
                <Marker
                  key={report.id}
                  position={[report.latitude!, report.longitude!]}
                  icon={createColoredIcon(
                    isOverdue(report) ? '#ef4444' : ISSUE_TYPE_COLORS[report.issue_type]
                  )}
                >
                  <Popup>
                    <div className="min-w-[200px]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs font-bold text-teal-600">{report.tracking_id}</span>
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{ backgroundColor: STATUS_COLORS[report.status] + '20', color: STATUS_COLORS[report.status] }}
                        >
                          {report.status}
                        </span>
                      </div>
                      {isOverdue(report) && (
                        <div className="mb-2 text-[10px] font-bold text-red-600">⚠ SLA BREACHED</div>
                      )}
                      <p className="text-sm font-medium text-slate-700 mb-1">
                        {ISSUE_TYPE_ICONS[report.issue_type]} {report.issue_type}
                      </p>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{ backgroundColor: SEVERITY_COLORS[report.severity as Severity] + '20', color: SEVERITY_COLORS[report.severity as Severity] }}
                        >
                          {report.severity}
                        </span>
                        <span className="text-[10px] font-bold text-slate-600">Score: {report.priority_score}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mb-2">{report.department}</p>
                      {report.location_text && (
                        <p className="text-xs text-slate-500 mb-2">{report.location_text}</p>
                      )}
                      {report.photo_url && (
                        <img src={report.photo_url} alt="Report" className="w-full h-24 object-cover rounded mb-2" />
                      )}
                      <button
                        onClick={() => navigate(`/staff/report/${report.id}`)}
                        className="text-xs font-medium text-teal-600 hover:underline"
                      >
                        View Details →
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>
      )}
    </div>
  );
}
