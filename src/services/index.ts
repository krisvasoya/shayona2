/**
 * Core Services Layer Placeholder
 * Handles Cloud Backend (Supabase), Local Sync, and Remote API operations.
 */

export interface ServiceResponse<T> {
  data: T | null;
  error: Error | null;
}
