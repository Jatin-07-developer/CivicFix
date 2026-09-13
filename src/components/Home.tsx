import { useNavigate } from 'react-router-dom';

export function Home() {
  const navigate = useNavigate();

  return (
    <div>
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-teal-600 via-cyan-600 to-teal-700">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-white text-sm mb-6">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Community-Powered Civic Reporting
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-4">
              Report Issues. <br />Fix Your Community.
            </h1>
            <p className="text-lg text-teal-50 mb-8 leading-relaxed">
              Spot a pothole, a broken streetlight, or a water leak? Report it in seconds
              and track it until it's resolved.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate('/report')}
                className="px-8 py-3.5 rounded-xl bg-white text-teal-700 font-semibold text-lg hover:bg-teal-50 transition-colors shadow-lg hover:shadow-xl"
              >
                Report an Issue
              </button>
              <button
                onClick={() => navigate('/track')}
                className="px-8 py-3.5 rounded-xl bg-teal-500/30 backdrop-blur-sm border border-white/30 text-white font-semibold text-lg hover:bg-teal-500/40 transition-colors"
              >
                Track a Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-slate-800 text-center mb-2">How It Works</h2>
        <p className="text-slate-500 text-center mb-10">Three simple steps from reporting to resolution</p>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              num: '1',
              icon: '📸',
              title: 'Report the Issue',
              desc: 'Snap a photo, pick the type, and your GPS location is captured automatically. No account needed.',
              color: 'bg-teal-50 text-teal-600',
            },
            {
              num: '2',
              icon: '🔍',
              title: 'Get a Tracking ID',
              desc: "Receive a unique tracking ID instantly. Use it anytime to check your report's progress.",
              color: 'bg-blue-50 text-blue-600',
            },
            {
              num: '3',
              icon: '✅',
              title: 'Track to Resolution',
              desc: 'Watch your report move through Reported, Acknowledged, In Progress, Resolved, and Verified.',
              color: 'bg-green-50 text-green-600',
            },
          ].map((step) => (
            <div key={step.num} className="relative bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
              <div className={`w-12 h-12 rounded-xl ${step.color} flex items-center justify-center text-2xl mb-4`}>
                {step.icon}
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">{step.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
              <span className="absolute top-6 right-6 text-5xl font-bold text-slate-100">{step.num}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Issue Types */}
      <div className="bg-slate-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-800 text-center mb-10">Issue Types We Handle</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { icon: '🚧', label: 'Pothole', color: 'bg-amber-50 border-amber-200' },
              { icon: '🗑️', label: 'Garbage', color: 'bg-lime-50 border-lime-200' },
              { icon: '💧', label: 'Water Leak', color: 'bg-sky-50 border-sky-200' },
              { icon: '💡', label: 'Streetlight', color: 'bg-yellow-50 border-yellow-200' },
              { icon: '🌊', label: 'Waterlogging', color: 'bg-blue-50 border-blue-200' },
              { icon: '📍', label: 'Other', color: 'bg-slate-50 border-slate-200' },
            ].map((type) => (
              <div
                key={type.label}
                className={`flex flex-col items-center gap-2 p-6 rounded-2xl border-2 ${type.color}`}
              >
                <span className="text-3xl">{type.icon}</span>
                <span className="text-sm font-medium text-slate-700">{type.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Staff CTA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-slate-800 rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'radial-gradient(circle at 50% 50%, white 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }} />
          <div className="relative">
            <h2 className="text-2xl font-bold text-white mb-3">Municipal Staff?</h2>
            <p className="text-slate-300 mb-6 max-w-md mx-auto">
              Sign in to access the dashboard, manage all reports, update statuses, and view issues on the map.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-3.5 rounded-xl bg-teal-500 text-white font-semibold text-lg hover:bg-teal-400 transition-colors"
            >
              Staff Portal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
