import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@/lib/theme';
import { AuthProvider, useAuth } from '@/lib/auth';
import { CitizenHeader } from '@/components/CitizenHeader';
import { StaffLayout } from '@/components/StaffLayout';
import { Home } from '@/components/Home';
import { ReportForm } from '@/components/ReportForm';
import { TrackReport } from '@/components/TrackReport';
import { StaffLogin } from '@/components/StaffLogin';
import { StaffDashboard } from '@/components/staff/StaffDashboard';
import { DepartmentQueue } from '@/components/staff/DepartmentQueue';
import { EscalationPanel } from '@/components/staff/EscalationPanel';
import { PerformanceScorecard } from '@/components/staff/PerformanceScorecard';
import { StaffMapView } from '@/components/staff/StaffMapView';
import { StaffReportDetail } from '@/components/staff/StaffReportDetail';

// ── Citizen public layout ────────────────────────────────────────────────────
function CitizenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-300">
      <CitizenHeader />
      <main className="flex-1">{children}</main>
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">CivicFix</span>
            </div>
            <p className="text-sm text-slate-400 dark:text-slate-500">
              Community-powered civic issue reporting · Free &amp; open-source
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-600">
              <span>🔒 No data sold</span>
              <span>🌍 Open data</span>
              <span>⚡ Free forever</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Staff protected route wrapper ─────────────────────────────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <svg className="w-8 h-8 animate-spin text-teal-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <StaffLayout>{children}</StaffLayout>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* ── Citizen routes (with public header/footer) ── */}
      <Route path="/" element={<CitizenLayout><Home /></CitizenLayout>} />
      <Route path="/report" element={<CitizenLayout><ReportForm /></CitizenLayout>} />
      <Route path="/track" element={<CitizenLayout><TrackReport /></CitizenLayout>} />

      {/* ── Login page — standalone, NO layout wrapper ── */}
      <Route path="/login" element={<StaffLogin />} />

      {/* ── Staff portal routes (protected, dark sidebar layout) ── */}
      <Route path="/staff" element={<ProtectedRoute><StaffDashboard /></ProtectedRoute>} />
      <Route path="/staff/queue" element={<ProtectedRoute><DepartmentQueue /></ProtectedRoute>} />
      <Route path="/staff/map" element={<ProtectedRoute><StaffMapView /></ProtectedRoute>} />
      <Route path="/staff/escalations" element={<ProtectedRoute><EscalationPanel /></ProtectedRoute>} />
      <Route path="/staff/scorecards" element={<ProtectedRoute><PerformanceScorecard /></ProtectedRoute>} />
      <Route path="/staff/report/:reportId" element={<ProtectedRoute><StaffReportDetail /></ProtectedRoute>} />

      {/* ── Legacy dashboard redirects ── */}
      <Route path="/dashboard" element={<Navigate to="/staff" replace />} />
      <Route path="/dashboard/map" element={<Navigate to="/staff/map" replace />} />
      <Route path="/dashboard/report/:reportId" element={<Navigate to="/staff" replace />} />

      {/* ── Fallback ── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
