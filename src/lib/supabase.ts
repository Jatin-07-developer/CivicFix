import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// ─── Enums / Union Types ───────────────────────────────────────────────────────

export type IssueType =
  | 'Pothole'
  | 'Garbage'
  | 'Water Leak'
  | 'Streetlight'
  | 'Waterlogging'
  | 'Other';

export type ReportStatus =
  | 'Reported'
  | 'Acknowledged'
  | 'In Progress'
  | 'Resolved'
  | 'Verified';

export type Severity = 'Low' | 'Medium' | 'High';

export type UserRole =
  | 'municipal_staff'
  | 'ward_officer'
  | 'department_head'
  | 'elected_rep'
  | 'volunteer'
  | 'admin';

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  municipal_staff: 'Municipal Staff',
  ward_officer: 'Ward Officer',
  department_head: 'Department Head',
  elected_rep: 'Elected Representative',
  volunteer: 'Volunteer / NGO',
  admin: 'Admin',
};

// ─── Interfaces ────────────────────────────────────────────────────────────────

export interface Report {
  id: string;
  tracking_id: string;
  issue_type: IssueType;
  description: string | null;
  photo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  location_text: string | null;
  status: ReportStatus;
  severity: Severity;
  priority_score: number;
  department: string;
  duplicate_count: number;
  upvote_count: number;
  contact_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface StatusHistory {
  id: string;
  report_id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  note: string | null;
  created_at: string;
}

export interface Escalation {
  id: string;
  report_id: string;
  escalated_to: string;
  reason: string;
  escalated_by: string | null;
  created_at: string;
}

export interface DuplicateMatch {
  id: string;
  tracking_id: string;
  duplicate_count: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const ISSUE_TYPES: IssueType[] = [
  'Pothole',
  'Garbage',
  'Water Leak',
  'Streetlight',
  'Waterlogging',
  'Other',
];

export const STATUS_OPTIONS: ReportStatus[] = [
  'Reported',
  'Acknowledged',
  'In Progress',
  'Resolved',
  'Verified',
];

export const ISSUE_TYPE_COLORS: Record<IssueType, string> = {
  Pothole: '#f59e0b',
  Garbage: '#84cc16',
  'Water Leak': '#0ea5e9',
  Streetlight: '#eab308',
  Waterlogging: '#3b82f6',
  Other: '#6b7280',
};

export const STATUS_COLORS: Record<ReportStatus, string> = {
  Reported: '#6b7280',
  Acknowledged: '#0ea5e9',
  'In Progress': '#f59e0b',
  Resolved: '#22c55e',
  Verified: '#16a34a',
};

export const ISSUE_TYPE_ICONS: Record<IssueType, string> = {
  Pothole: '🚧',
  Garbage: '🗑️',
  'Water Leak': '💧',
  Streetlight: '💡',
  Waterlogging: '🌊',
  Other: '📍',
};

export const DEPARTMENTS: string[] = [
  'Roads Department',
  'Sanitation Department',
  'Water Department',
  'Electrical Department',
  'Drainage Department',
  'General Department',
];

export const SEVERITY_COLORS: Record<Severity, string> = {
  Low: '#22c55e',
  Medium: '#f59e0b',
  High: '#ef4444',
};

// ─── SLA Helpers ──────────────────────────────────────────────────────────────

/** SLA resolution deadline in days per severity */
export const SLA_DAYS: Record<Severity, number> = {
  Low: 30,
  Medium: 14,
  High: 7,
};

/** Returns the SLA deadline Date for a given report */
export function getSLADeadline(report: Pick<Report, 'created_at' | 'severity'>): Date {
  const created = new Date(report.created_at);
  const days = SLA_DAYS[report.severity] ?? 14;
  return new Date(created.getTime() + days * 24 * 60 * 60 * 1000);
}

/** Returns remaining hours until SLA breach (negative = already overdue) */
export function getSLAHoursRemaining(report: Pick<Report, 'created_at' | 'severity'>): number {
  const deadline = getSLADeadline(report);
  return (deadline.getTime() - Date.now()) / (1000 * 60 * 60);
}

/** Returns true if report has breached SLA */
export function isOverdue(report: Pick<Report, 'created_at' | 'severity' | 'status'>): boolean {
  if (report.status === 'Resolved' || report.status === 'Verified') return false;
  return getSLAHoursRemaining(report) < 0;
}

/** Human-readable SLA status label */
export function getSLALabel(report: Pick<Report, 'created_at' | 'severity' | 'status'>): string {
  if (report.status === 'Resolved' || report.status === 'Verified') return 'Resolved';
  const hours = getSLAHoursRemaining(report);
  if (hours < 0) {
    const days = Math.abs(Math.floor(hours / 24));
    return `${days}d overdue`;
  }
  if (hours < 24) return `${Math.floor(hours)}h left`;
  return `${Math.floor(hours / 24)}d left`;
}
