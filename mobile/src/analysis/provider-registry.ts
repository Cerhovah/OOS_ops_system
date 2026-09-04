import { SupabaseAnalysisTransport } from './supabase-transport';
import type { AnalysisTransport } from './types';

/** Provider/model routing is server-owned; UI does not select model IDs. */
export function resolveAnalysisTransport(): AnalysisTransport {
  return new SupabaseAnalysisTransport();
}
