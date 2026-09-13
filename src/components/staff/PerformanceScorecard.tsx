import { useEffect, useState, useMemo } from 'react';
import {
  supabase,
  type Report,
  DEPARTMENTS,
  isOverdue,
  getSLAHoursRemaining,
  SLA_DAYS,
  type Severity,
} from '@/lib/supabase';

interface DeptStats {
  department: string;
  total: number;
  open: number;
  resolved: number;
  overdue: number;
  avgResolutionHours: number | null;
  slaCompliancePct: number;
  highCount: number;
}

interface WardHealth {
  ward: string;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  color: string;
  open: number;
  resolved: number;
  avgDays: number;
}

function gradeColor(grade: string): string {
  return { A: '#22c55e', B: '#84cc16', C: '#f59e0b', D: '#f97316', F: '#ef4444' }[grade] ?? '#6b7280';
}

function scoreToGrade(score: number): WardHealth['grade'] {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

/** Compute avg resolution time (hours) from resolved reports */
function avgResolutionHours(reports: Report[]): number | null {
  const resolved = reports.filter((r) => r.status === 'Resolved' || r.status === 'Verified');
  if (resolved.length === 0) return null;
  const totalHours = resolved.reduce((sum, r) => {
    const hrs = (new Date(r.updated_at).getTime() - new Date(r.created_at).getTime()) / 3600000;
    return sum + hrs;
  }, 0);
  return totalHours / resolved.length;
}

export function PerformanceScorecard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('reports').select('*').then(({ data }) => {
      setReports((data as Report[]) ?? []);
      setLoading(false);
    });
  }, []);

  const deptStats: DeptStats[] = useMemo(() => {
    return DEPARTMENTS.map((dept) => {
      const dReports = reports.filter((r) => r.department === dept);
      const open = dReports.filter((r) => r.status !== 'Resolved' && r.status !== 'Verified').length;
      const resolved = dReports.filter((r) => r.status === 'Resolved' || r.status === 'Verified').length;
      const overdue = dReports.filter((r) => isOverdue(r)).length;
      const avgHrs = avgResolutionHours(dReports);
      // SLA compliance: % of resolved within SLA
      const resolvedList = dReports.filter((r) => r.status === 'Resolved' || r.status === 'Verified');
      const withinSLA = resolvedList.filter((r) => {
        const slaHrs = SLA_DAYS[r.severity as Severity] * 24;
        const actual = (new Date(r.updated_at).getTime() - new Date(r.created_at).getTime()) / 3600000;
        return actual <= slaHrs;
      }).length;
      const slaCompliancePct = resolvedList.length > 0 ? Math.round((withinSLA / resolvedList.length) * 100) : 100;
      return {
        department: dept,
        total: dReports.length,
        open,
        resolved,
        overdue,
        avgResolutionHours: avgHrs,
        slaCompliancePct,
        highCount: dReports.filter((r) => r.severity === 'High').length,
      };
    }).sort((a, b) => b.slaCompliancePct - a.slaCompliancePct);
  }, [reports]);

  // Synthetic wards from report location_text prefixes (demo data)
  const wardHealth: WardHealth[] = useMemo(() => {
    const MOCK_WARDS = ['Ward 1', 'Ward 2', 'Ward 3', 'Ward 4', 'Ward 5', 'Ward 6'];
    return MOCK_WARDS.map((ward, i) => {
      // In production this would join a wards table; demo uses modulo bucketing
      const wardReports = reports.filter((_, idx) => idx % MOCK_WARDS.length === i);
      const open = wardReports.filter((r) => r.status !== 'Resolved' && r.status !== 'Verified').length;
      const res = wardReports.filter((r) => r.status === 'Resolved' || r.status === 'Verified').length;
      const total = wardReports.length;
      const overdue = wardReports.filter(isOverdue).length;
      const avgHrs = avgResolutionHours(wardReports) ?? 0;
      const avgDays = Math.round(avgHrs / 24);
      // Score: resolution rate * 40 + SLA compliance * 40 + no-overdue bonus * 20
      const resRate = total > 0 ? res / total : 1;
      const overdueRate = total > 0 ? overdue / total : 0;
      const score = Math.round(resRate * 40 + (1 - overdueRate) * 40 + (avgDays < 7 ? 20 : avgDays < 14 ? 10 : 0));
      const cappedScore = Math.min(100, Math.max(0, score));
      const grade = scoreToGrade(cappedScore);
      return { ward, score: cappedScore, grade, color: gradeColor(grade), open, resolved: res, avgDays };
    });
  }, [reports]);

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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Performance Scorecards</h1>
        <p className="text-sm text-slate-400 mt-0.5">Department & ward accountability metrics — publicly visible</p>
      </div>

      {/* Department leaderboard */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/8">
          <h2 className="text-base font-semibold text-white">Department Leaderboard</h2>
          <p className="text-xs text-slate-500 mt-0.5">Ranked by SLA compliance. Best first.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/8">
                {['Rank', 'Department', 'Total', 'Open', 'Resolved', 'Overdue', 'Avg Resolution', 'SLA Compliance'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {deptStats.map((dept, i) => {
                const slaColor = dept.slaCompliancePct >= 80 ? '#22c55e' : dept.slaCompliancePct >= 60 ? '#f59e0b' : '#ef4444';
                return (
                  <tr key={dept.department} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`text-sm font-bold ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-700' : 'text-slate-600'}`}>
                        #{i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-medium text-slate-200">{dept.department.replace(' Department', '')}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">{dept.total}</td>
                    <td className="px-4 py-3 text-sm text-blue-400">{dept.open}</td>
                    <td className="px-4 py-3 text-sm text-teal-400">{dept.resolved}</td>
                    <td className="px-4 py-3">
                      {dept.overdue > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                          {dept.overdue}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">
                      {dept.avgResolutionHours !== null
                        ? `${Math.round(dept.avgResolutionHours / 24)}d avg`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${dept.slaCompliancePct}%`, backgroundColor: slaColor }}
                          />
                        </div>
                        <span className="text-xs font-bold" style={{ color: slaColor }}>
                          {dept.slaCompliancePct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ward Civic Health Scores */}
      <div>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-white">Ward Civic Health Scores</h2>
          <p className="text-xs text-slate-500 mt-0.5">Composite score: resolution rate + SLA compliance + speed</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {wardHealth.map((ward) => (
            <div key={ward.ward} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
              {/* Grade circle */}
              <div
                className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center text-xl font-bold text-white shadow-lg"
                style={{ backgroundColor: ward.color + '30', border: `2px solid ${ward.color}50` }}
              >
                <span style={{ color: ward.color }}>{ward.grade}</span>
              </div>
              <p className="text-xs font-semibold text-slate-200 mb-1">{ward.ward}</p>
              <p className="text-2xl font-bold text-white">{ward.score}</p>
              <p className="text-[10px] text-slate-600 mb-3">/100</p>
              <div className="space-y-1 text-left">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Open</span>
                  <span className="text-blue-400">{ward.open}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Resolved</span>
                  <span className="text-teal-400">{ward.resolved}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Avg</span>
                  <span className="text-slate-400">{ward.avgDays}d</span>
                </div>
              </div>
              {/* Score bar */}
              <div className="mt-3 h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${ward.score}%`, backgroundColor: ward.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 px-4 py-3 bg-white/5 border border-white/10 rounded-xl">
        <p className="text-xs text-slate-500 w-full">Civic Health Grade Key:</p>
        {(['A', 'B', 'C', 'D', 'F'] as const).map((g) => (
          <div key={g} className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: gradeColor(g) }} />
            <span className="text-xs text-slate-400">
              {g} — {g === 'A' ? '≥85' : g === 'B' ? '70–84' : g === 'C' ? '55–69' : g === 'D' ? '40–54' : '<40'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
