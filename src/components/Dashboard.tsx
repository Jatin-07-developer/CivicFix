import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { supabase, type Report, type IssueType, type Severity, ISSUE_TYPE_COLORS, ISSUE_TYPE_ICONS, STATUS_COLORS, SEVERITY_COLORS, DEPARTMENTS } from '@/lib/supabase';
import { createColoredIcon } from '@/lib/leaflet.css';

interface DashboardProps {
  initialView?: 'table' | 'map';
}

type SortBy = 'priority' | 'date';

export function Dashboard({ initialView = 'table' }: DashboardProps) {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'table' | 'map'>(initialView);
  const [filterType, setFilterType] = useState<IssueType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDept, setFilterDept] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('priority');

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load reports:', error);
    } else {
      setReports((data as Report[]) ?? []);
    }
    setLoading(false);
  };

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
          (r.description?.toLowerCase().includes(q) ?? false) ||
          r.department.toLowerCase().includes(q)
        );
      }
      return true;
    });

    if (sortBy === 'priority') {
      result.sort((a, b) => b.priority_score - a.priority_score);
    }

    return result;
  }, [reports, filterType, filterStatus, filterDept, search, sortBy]);

  const stats = useMemo(() => {
    const total = reports.length;
    const byStatus = {
      Reported: reports.filter((r) => r.status === 'Reported').length,
      Acknowledged: reports.filter((r) => r.status === 'Acknowledged').length,
      'In Progress': reports.filter((r) => r.status === 'In Progress').length,
      Resolved: reports.filter((r) => r.status === 'Resolved').length,
      Verified: reports.filter((r) => r.status === 'Verified').length,
    };
    const highPriority = reports.filter((r) => r.severity === 'High').length;
    return { total, byStatus, highPriority };
  }, [reports]);

  const mapReports = filtered.filter((r) => r.latitude !== null && r.longitude !== null);

  const switchView = (newView: 'table' | 'map') => {
    setView(newView);
    navigate(newView === 'map' ? '/dashboard/map' : '/dashboard', { replace: true });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
          <p className="text-xs text-slate-500 mt-0.5">Total Reports</p>
        </div>
        {(Object.keys(stats.byStatus) as (keyof typeof stats.byStatus)[]).map((status) => (
          <div key={status} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-2xl font-bold" style={{ color: STATUS_COLORS[status as keyof typeof STATUS_COLORS] }}>
              {stats.byStatus[status]}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{status}</p>
          </div>
        ))}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-2xl font-bold text-red-500">{stats.highPriority}</p>
          <p className="text-xs text-slate-500 mt-0.5">High Severity</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-800">All Reports</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <span>Sort:</span>
              <button
                onClick={() => setSortBy('priority')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  sortBy === 'priority' ? 'bg-teal-100 text-teal-700' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                Priority
              </button>
              <button
                onClick={() => setSortBy('date')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  sortBy === 'date' ? 'bg-teal-100 text-teal-700' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                Date
              </button>
            </div>
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => switchView('table')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  view === 'table' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                Table
              </button>
              <button
                onClick={() => switchView('map')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  view === 'map' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Map
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Search by ID, type, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-teal-500"
          />
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-teal-500 bg-white"
          >
            <option value="all">All Departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as IssueType | 'all')}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-teal-500 bg-white"
          >
            <option value="all">All Types</option>
            {(Object.keys(ISSUE_TYPE_COLORS) as IssueType[]).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-teal-500 bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="Reported">Reported</option>
            <option value="Acknowledged">Acknowledged</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Verified">Verified</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <svg className="w-8 h-8 mx-auto animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-slate-500 mt-3">Loading reports...</p>
        </div>
      ) : view === 'table' ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-400 text-sm">No reports found matching your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tracking ID</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Severity</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Priority</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Department</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Location</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Dupes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((report) => (
                    <tr
                      key={report.id}
                      onClick={() => navigate(`/dashboard/report/${report.id}`)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-sm font-medium text-teal-600">{report.tracking_id}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span>{ISSUE_TYPE_ICONS[report.issue_type]}</span>
                          <span className="text-sm text-slate-700">{report.issue_type}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: SEVERITY_COLORS[report.severity as Severity] + '20',
                            color: SEVERITY_COLORS[report.severity as Severity],
                          }}
                        >
                          {report.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-sm font-bold ${
                          report.priority_score >= 30 ? 'text-red-600' :
                          report.priority_score >= 20 ? 'text-amber-600' :
                          'text-slate-600'
                        }`}>
                          {report.priority_score}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-slate-600 font-medium">{report.department}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: STATUS_COLORS[report.status] + '20',
                            color: STATUS_COLORS[report.status],
                          }}
                        >
                          {report.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-sm text-slate-600 truncate max-w-[200px] block">
                          {report.location_text || (report.latitude ? `${report.latitude.toFixed(3)}, ${report.longitude?.toFixed(3)}` : '—')}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell whitespace-nowrap">
                        <span className="text-sm text-slate-600">
                          {new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {report.duplicate_count > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            {report.duplicate_count}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {mapReports.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-400 text-sm">No reports with location data to display on the map.</p>
            </div>
          ) : (
            <>
              {/* Legend */}
              <div className="flex flex-wrap gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50">
                {(Object.keys(ISSUE_TYPE_COLORS) as IssueType[]).map((type) => (
                  <div key={type} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ISSUE_TYPE_COLORS[type] }} />
                    <span className="text-xs text-slate-600">{type}</span>
                  </div>
                ))}
              </div>
              <MapContainer
                center={[mapReports[0]?.latitude ?? 20, mapReports[0]?.longitude ?? 0]}
                zoom={11}
                style={{ height: '500px', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap contributors'
                />
                {mapReports.map((report) => (
                  <Marker
                    key={report.id}
                    position={[report.latitude!, report.longitude!]}
                    icon={createColoredIcon(ISSUE_TYPE_COLORS[report.issue_type])}
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
                          <span className="text-[10px] font-bold text-slate-600">Priority: {report.priority_score}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mb-2">{report.department}</p>
                        {report.location_text && (
                          <p className="text-xs text-slate-500 mb-2">{report.location_text}</p>
                        )}
                        {report.photo_url && (
                          <img src={report.photo_url} alt="Report" className="w-full h-24 object-cover rounded mb-2" />
                        )}
                        <button
                          onClick={() => navigate(`/dashboard/report/${report.id}`)}
                          className="text-xs font-medium text-teal-600 hover:underline"
                        >
                          View Details →
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </>
          )}
        </div>
      )}
    </div>
  );
}
