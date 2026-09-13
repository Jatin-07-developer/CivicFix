import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

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
  created_at: string;
  updated_at: string;
}

export interface DuplicateMatch {
  id: string;
  tracking_id: string;
  duplicate_count: number;
}

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
