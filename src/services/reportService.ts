import { supabase, isSupabaseConfigured } from './supabase';
import { sanitizeText } from '../utils/security';

export type IssueType =
  | 'playback_error'   // 404 / Video Rusak / Layar Hitam
  | 'subtitle_error'   // Subtitle Rusak / Hilang / Tidak Sinkron
  | 'audio_sync'       // Suara Rusak / Bisu / Tidak Pas
  | 'slow_buffer'      // Buffering Parah / Macet
  | 'wrong_content'    // Episode atau Film Salah
  | 'other';           // Masalah lainnya

export type ReportStatus = 'open' | 'investigating' | 'resolved' | 'rejected';

export interface StreamReport {
  id: string;
  mediaId: string;
  tmdbId?: number;
  mediaTitle: string;
  mediaType: 'movie' | 'series' | 'anime' | 'drama';
  seasonNumber?: number;
  episodeNumber?: number;
  serverId: string;
  serverName: string;
  issueType: IssueType;
  description?: string;
  reportedBy: string;
  userEmail?: string;
  userId?: string;
  status: ReportStatus;
  createdAt: string;
  resolvedAt?: string;
  adminNotes?: string;
}

const LOCAL_STORAGE_KEY = 'cinestream_cached_stream_reports';

export const SUPABASE_STREAM_REPORTS_SQL = `-- 1. Buat Tabel Laporan Masalah Stream
CREATE TABLE IF NOT EXISTS public.stream_reports (
  id TEXT PRIMARY KEY,
  media_id TEXT NOT NULL,
  tmdb_id BIGINT,
  media_title TEXT NOT NULL,
  media_type TEXT NOT NULL,
  season_number INT,
  episode_number INT,
  server_id TEXT NOT NULL,
  server_name TEXT NOT NULL,
  issue_type TEXT NOT NULL,
  description TEXT,
  reported_by TEXT NOT NULL,
  user_email TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  admin_notes TEXT
);

-- 2. Buat Index untuk performa
CREATE INDEX IF NOT EXISTS idx_stream_reports_created ON public.stream_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stream_reports_status ON public.stream_reports(status);

-- 3. Aktifkan Row Level Security (RLS)
ALTER TABLE public.stream_reports ENABLE ROW LEVEL SECURITY;

-- 4. Kebijakan INSERT: Siapa saja (Pengunjung / Pengguna) bisa melapor
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'stream_reports' AND policyname = 'Anyone can submit stream reports'
  ) THEN
    CREATE POLICY "Anyone can submit stream reports"
      ON public.stream_reports
      FOR INSERT
      TO public
      WITH CHECK (true);
  END IF;
END $$;

-- 5. Kebijakan SELECT: Pengunjung & Admin bisa membaca
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'stream_reports' AND policyname = 'Anyone can view stream reports'
  ) THEN
    CREATE POLICY "Anyone can view stream reports"
      ON public.stream_reports
      FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;

-- 6. Kebijakan UPDATE & DELETE: Khusus Admin Terverifikasi
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'stream_reports' AND policyname = 'Admin can update stream reports'
  ) THEN
    CREATE POLICY "Admin can update stream reports"
      ON public.stream_reports
      FOR UPDATE
      TO authenticated
      USING (
        auth.jwt() ->> 'email' IN ('renaldy.maulana.rm@gmail.com')
      );
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'stream_reports' AND policyname = 'Admin can delete stream reports'
  ) THEN
    CREATE POLICY "Admin can delete stream reports"
      ON public.stream_reports
      FOR DELETE
      TO authenticated
      USING (
        auth.jwt() ->> 'email' IN ('renaldy.maulana.rm@gmail.com')
      );
  END IF;
END $$;`;

// Helper: Get local reports from localStorage
export function getLocalReports(): StreamReport[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// Helper: Save local reports to localStorage
export function saveLocalReports(reports: StreamReport[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(reports.slice(0, 100)));
  } catch (e) {
    console.warn('Failed to cache stream reports to localStorage:', e);
  }
}

/**
 * Submit a new stream issue report
 */
export async function submitStreamReport(
  payload: Omit<StreamReport, 'id' | 'status' | 'createdAt'>
): Promise<{ success: boolean; report: StreamReport; error?: string }> {
  const newReport: StreamReport = {
    ...payload,
    id: `rep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    mediaTitle: sanitizeText(payload.mediaTitle),
    description: payload.description ? sanitizeText(payload.description) : undefined,
    reportedBy: sanitizeText(payload.reportedBy || 'Guest'),
    status: 'open',
    createdAt: new Date().toISOString(),
  };

  // Always save to local storage immediately
  const localList = getLocalReports();
  saveLocalReports([newReport, ...localList]);

  // Attempt to insert to Supabase
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('stream_reports').insert({
        id: newReport.id,
        media_id: newReport.mediaId,
        tmdb_id: newReport.tmdbId || null,
        media_title: newReport.mediaTitle,
        media_type: newReport.mediaType,
        season_number: newReport.seasonNumber ?? null,
        episode_number: newReport.episodeNumber ?? null,
        server_id: newReport.serverId,
        server_name: newReport.serverName,
        issue_type: newReport.issueType,
        description: newReport.description || null,
        reported_by: newReport.reportedBy,
        user_email: newReport.userEmail || null,
        user_id: newReport.userId || null,
        status: newReport.status,
        created_at: newReport.createdAt,
      });

      if (error) {
        console.warn('[ReportService] Cloud insert error, fallback to local storage:', error.message);
        return { success: true, report: newReport };
      }

      return { success: true, report: newReport };
    } catch (err: any) {
      console.warn('[ReportService] Exception submitting to cloud:', err);
      return { success: true, report: newReport };
    }
  }

  return { success: true, report: newReport };
}

/**
 * Fetch all stream issue reports (Admin view)
 */
export async function fetchStreamReports(): Promise<StreamReport[]> {
  const local = getLocalReports();

  if (!isSupabaseConfigured) {
    return local;
  }

  try {
    const { data, error } = await supabase
      .from('stream_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.warn('[ReportService] Error fetching cloud reports, fallback to local:', error.message);
      return local;
    }

    if (!data || data.length === 0) {
      return local;
    }

    const cloudReports: StreamReport[] = data.map((row) => ({
      id: row.id,
      mediaId: row.media_id,
      tmdbId: row.tmdb_id ? Number(row.tmdb_id) : undefined,
      mediaTitle: row.media_title,
      mediaType: row.media_type as any,
      seasonNumber: row.season_number ?? undefined,
      episodeNumber: row.episode_number ?? undefined,
      serverId: row.server_id,
      serverName: row.server_name,
      issueType: row.issue_type as IssueType,
      description: row.description || undefined,
      reportedBy: row.reported_by,
      userEmail: row.user_email || undefined,
      userId: row.user_id || undefined,
      status: row.status as ReportStatus,
      createdAt: row.created_at,
      resolvedAt: row.resolved_at || undefined,
      adminNotes: row.admin_notes || undefined,
    }));

    // Merge any local-only reports not present in cloud
    const cloudIds = new Set(cloudReports.map((c) => c.id));
    const merged = [...cloudReports, ...local.filter((l) => !cloudIds.has(l.id))];

    // Sync merged back to local storage
    saveLocalReports(merged);
    return merged;
  } catch (err) {
    console.warn('[ReportService] Exception fetching cloud reports:', err);
    return local;
  }
}

/**
 * Update report status (Admin action)
 */
export async function updateReportStatus(
  reportId: string,
  status: ReportStatus,
  adminNotes?: string
): Promise<boolean> {
  const now = new Date().toISOString();
  const resolvedAt = status === 'resolved' || status === 'rejected' ? now : null;

  // Update local storage
  const local = getLocalReports();
  const updatedLocal = local.map((r) =>
    r.id === reportId
      ? {
          ...r,
          status,
          resolvedAt: resolvedAt || undefined,
          adminNotes: adminNotes ?? r.adminNotes,
        }
      : r
  );
  saveLocalReports(updatedLocal);

  if (!isSupabaseConfigured) {
    return true;
  }

  try {
    const { error } = await supabase
      .from('stream_reports')
      .update({
        status,
        resolved_at: resolvedAt,
        admin_notes: adminNotes ?? null,
      })
      .eq('id', reportId);

    if (error) {
      console.warn('[ReportService] Failed to update cloud report status:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[ReportService] Exception updating cloud report status:', err);
    return false;
  }
}

/**
 * Delete a report (Admin action)
 */
export async function deleteStreamReport(reportId: string): Promise<boolean> {
  // Delete from local storage
  const local = getLocalReports();
  saveLocalReports(local.filter((r) => r.id !== reportId));

  if (!isSupabaseConfigured) {
    return true;
  }

  try {
    const { error } = await supabase.from('stream_reports').delete().eq('id', reportId);
    if (error) {
      console.warn('[ReportService] Failed to delete cloud report:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[ReportService] Exception deleting cloud report:', err);
    return false;
  }
}
