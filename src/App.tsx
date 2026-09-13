import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/auth';
import { CitizenHeader } from '@/components/CitizenHeader';
import { StaffLayout } from '@/components/StaffLayout';
import { Home } from '@/components/Home';
import { ReportForm } from '@/components/ReportForm';
import { TrackReport } from '@/components/TrackReport';
import { StaffLogin } from '@/components/StaffLogin';
import { Dashboard } from '@/components/Dashboard';
import { ReportDetail } from '@/components/ReportDetail';

function CitizenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <CitizenHeader />
      <main className="flex-1">{children}</main>
      <footer className="bg-white border-t border-slate-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-slate-400">
            CivicFix — Community-powered civic issue reporting
          </p>
        </div>
      </footer>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
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
      {/* Citizen routes */}
      <Route
        path="/"
        element={
          <CitizenLayout>
            <Home />
          </CitizenLayout>
        }
      />
      <Route
        path="/report"
        element={
          <CitizenLayout>
            <ReportForm />
          </CitizenLayout>
        }
      />
      <Route
        path="/track"
        element={
          <CitizenLayout>
            <TrackReport />
          </CitizenLayout>
        }
      />
      <Route
        path="/login"
        element={
          <CitizenLayout>
            <StaffLogin />
          </CitizenLayout>
        }
      />

      {/* Staff routes — separate layout, protected */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard initialView="table" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/map"
        element={
          <ProtectedRoute>
            <Dashboard initialView="map" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/report/:reportId"
        element={
          <ProtectedRoute>
            <ReportDetail />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
