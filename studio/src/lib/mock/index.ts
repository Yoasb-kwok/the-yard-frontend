/**
 * Demo mock entry point. Exports a single `isDemoMode()` check and
 * `handleDemoRequest()` for the api client to intercept.
 */

import { dispatch, type MockRequest } from './router';
import { resetDb } from './db';

export { resetDb as resetDemoDb };

const FORCE_KEY = 'demo_mode_override';

export function isDemoMode(): boolean {
  const envFlag = import.meta.env.VITE_DEMO_MODE;
  if (envFlag === 'true' || envFlag === '1') return true;
  if (typeof localStorage !== 'undefined') {
    const o = localStorage.getItem(FORCE_KEY);
    if (o === '1') return true;
    if (o === '0') return false;
  }
  return false;
}

export function setDemoModeOverride(value: boolean | null): void {
  if (typeof localStorage === 'undefined') return;
  if (value === null) localStorage.removeItem(FORCE_KEY);
  else localStorage.setItem(FORCE_KEY, value ? '1' : '0');
}

/** Strip /api prefix and split querystring. */
function normalizePath(endpoint: string): { path: string; query: Record<string, string> } {
  const [rawPath, rawQuery] = endpoint.split('?');
  let path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  if (path.startsWith('/api/')) path = path.slice(4);
  else if (path === '/api') path = '/';
  const query: Record<string, string> = {};
  if (rawQuery) {
    rawQuery.split('&').forEach((p) => {
      const [k, v] = p.split('=');
      if (k) query[decodeURIComponent(k)] = v ? decodeURIComponent(v) : '';
    });
  }
  return { path, query };
}

export async function handleDemoRequest(
  method: string,
  endpoint: string,
  body: unknown,
): Promise<unknown> {
  const { path, query } = normalizePath(endpoint);
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  const req: MockRequest = {
    method: method.toUpperCase() as MockRequest['method'],
    path,
    query,
    body,
    token,
  };
  return dispatch(req);
}
