/**
 * Demo mode is disabled — all API traffic goes to the backend.
 * Kept as a stub so existing imports do not break.
 */

export function isDemoMode(): boolean {
  return false;
}

export function setDemoModeOverride(_value: boolean | null): void {
  // no-op
}

export function resetDemoDb(): void {
  try {
    localStorage.removeItem('demo_db_v1');
    localStorage.removeItem('demo_mode_override');
  } catch {
    // ignore
  }
}
