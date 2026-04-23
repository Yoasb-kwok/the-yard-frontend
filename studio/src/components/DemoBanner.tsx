import { useState } from 'react';
import { AlertTriangle, RotateCcw, X, LogIn } from 'lucide-react';
import { isDemoMode, resetDemoDb } from '../lib/mock';
import { api } from '../lib/api';

/**
 * Fixed banner shown at the bottom of the viewport when running in demo mode.
 * Lets users reset seed data and see the credentials list for login.
 */
export default function DemoBanner() {
  const [collapsed, setCollapsed] = useState(false);
  const [showCreds, setShowCreds] = useState(false);
  const [resetting, setResetting] = useState(false);

  if (!isDemoMode()) return null;
  if (collapsed) {
    return (
      <button
        className="fixed bottom-4 right-4 z-[70] rounded-full bg-amber-500 px-3 py-2 text-xs font-semibold text-white shadow-lg hover:bg-amber-600"
        onClick={() => setCollapsed(false)}
        title="Show demo banner"
      >
        DEMO
      </button>
    );
  }

  async function handleReset() {
    const confirmed = window.confirm('重置所有 demo 資料？你新增 / 修改過的項目都會被清除。');
    if (!confirmed) return;
    setResetting(true);
    resetDemoDb();
    // Clear auth so next login uses fresh seed
    localStorage.removeItem('token');
    localStorage.removeItem('auth_session');
    setTimeout(() => window.location.reload(), 150);
  }

  async function quickLogin(email: string, target: '/admin' | '/dashboard') {
    try {
      const res = await api.post<{ token?: string; user?: any }>('user/login', {
        loginIdentifier: email,
        password: 'demo1234',
        rememberMe: true,
      });
      if (!res.success || !res.token || !res.user) {
        throw new Error('Login failed');
      }
      localStorage.setItem('token', res.token);
      const me = await api.get<any>('auth/me');
      const profiles = (me as any).profiles ?? (me as any).data?.profiles ?? [];
      const userObj = {
        id: String(res.user.id ?? res.user.ID),
        email: res.user.email ?? email,
        mobile: res.user.mobile ?? null,
      };
      localStorage.setItem(
        'auth_session',
        JSON.stringify({
          user: userObj,
          profiles,
          activeProfileId: profiles[0]?.id ?? null,
          session: { user: userObj },
        }),
      );
      window.location.href = target;
    } catch (e) {
      console.error(e);
      window.alert('Quick login failed.');
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] border-t border-amber-300 bg-amber-50/95 backdrop-blur shadow-lg">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-2 text-sm text-amber-900">
        <AlertTriangle className="h-4 w-4 flex-none" />
        <span className="font-semibold">Demo Mode</span>
        <span className="hidden sm:inline">
          資料存於你的瀏覽器 · 不會同步到伺服器
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            className="inline-flex items-center gap-1 rounded border border-amber-400 bg-white px-2 py-1 text-xs font-medium hover:bg-amber-100"
            onClick={() => setShowCreds((v) => !v)}
          >
            <LogIn className="h-3 w-3" /> 登入帳號
          </button>
          <button
            className="inline-flex items-center gap-1 rounded border border-amber-400 bg-white px-2 py-1 text-xs font-medium hover:bg-amber-100 disabled:opacity-50"
            onClick={handleReset}
            disabled={resetting}
          >
            <RotateCcw className="h-3 w-3" /> 重置資料
          </button>
          <button
            className="rounded p-1 hover:bg-amber-200"
            onClick={() => setCollapsed(true)}
            title="收起"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
      {showCreds && (
        <div className="border-t border-amber-200 bg-amber-100/80 px-4 py-2 text-xs text-amber-900 space-y-2">
          <div className="mx-auto max-w-7xl flex flex-wrap gap-x-6 gap-y-1">
            <span>
              <b>管理員</b>： <code>admin@demo.com</code> / <code>demo1234</code>
            </span>
            <span>
              <b>學員</b>： <code>student@demo.com</code> / <code>demo1234</code>
            </span>
            <span>
              <b>家長學員</b>： <code>parent@demo.com</code> / <code>demo1234</code>
            </span>
            <span>
              <b>忘記密碼 OTP</b>：固定 <code>123456</code>
            </span>
          </div>
          <div className="mx-auto max-w-7xl flex flex-wrap gap-2">
            <span className="font-semibold">一鍵登入：</span>
            <button
              className="rounded border border-amber-500 bg-white px-2 py-0.5 hover:bg-amber-200"
              onClick={() => quickLogin('admin@demo.com', '/admin')}
            >
              管理員 → /admin
            </button>
            <button
              className="rounded border border-amber-500 bg-white px-2 py-0.5 hover:bg-amber-200"
              onClick={() => quickLogin('student@demo.com', '/dashboard')}
            >
              學員 → /dashboard
            </button>
            <button
              className="rounded border border-amber-500 bg-white px-2 py-0.5 hover:bg-amber-200"
              onClick={() => quickLogin('parent@demo.com', '/dashboard')}
            >
              家長 → /dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
