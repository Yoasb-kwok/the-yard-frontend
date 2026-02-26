import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { KeyRound, Mail, Phone } from 'lucide-react';

export interface AccountSecurityCardProps {
  email: string | null;
  mobile: string | null;
  onAccountUpdated?: (email?: string, mobile?: string) => void;
}

function getMobileParts(mobile: string | null): { countryCode: string; number: string } {
  if (!mobile) return { countryCode: '', number: '' };
  if (mobile.startsWith('852')) return { countryCode: '+852', number: mobile.substring(3) };
  if (mobile.startsWith('853')) return { countryCode: '+853', number: mobile.substring(3) };
  if (mobile.startsWith('86')) return { countryCode: '+86', number: mobile.substring(2) };
  return { countryCode: '+852', number: mobile };
}

export default function AccountSecurityCard({ email, mobile, onAccountUpdated }: AccountSecurityCardProps) {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [passwordModal, setPasswordModal] = useState(false);
  const [emailModal, setEmailModal] = useState(false);
  const [mobileModal, setMobileModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState(email || '');
  const [countryCode, setCountryCode] = useState('852');
  const [newMobile, setNewMobile] = useState(getMobileParts(mobile).number);
  const [emailStep, setEmailStep] = useState(1);
  const [mobileStep, setMobileStep] = useState(1);
  const [emailOtp, setEmailOtp] = useState('');
  const [mobileOtp, setMobileOtp] = useState('');
  const [emailDevOtp, setEmailDevOtp] = useState<string | null>(null);
  const [mobileDevOtp, setMobileDevOtp] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError(t('register.passwordMismatch'));
      return;
    }
    if (newPassword.length < 6) {
      setError(t('register.passwordMin'));
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/user/change-password', { currentPassword, newPassword });
      if (res.success) {
        setMessage(t('profile.passwordUpdated'));
        setPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError((res as any).msg || t('profile.wrongCurrentPassword'));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as any)?.msg;
      setError(msg && typeof msg === 'string' ? msg : t('profile.wrongCurrentPassword'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newEmail.trim()) return;
    if (emailStep === 1) {
      setLoading(true);
      try {
        const res = await api.post('/user/send-verify-email', { newEmail: newEmail.trim() });
        if (res.success) {
          setEmailStep(2);
          setEmailOtp('');
          setEmailDevOtp((res as { devOtp?: string }).devOtp ?? null);
        } else {
          setError((res as { msg?: string }).msg || t('profile.emailInUse'));
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : (err as { msg?: string })?.msg;
        setError(msg && typeof msg === 'string' ? msg : t('profile.emailInUse'));
      } finally {
        setLoading(false);
      }
      return;
    }
    const otp = emailOtp.replace(/\D/g, '');
    if (otp.length !== 6) {
      setError(t('profile.verification.invalidOtp'));
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/user/confirm-email', { newEmail: newEmail.trim(), otp });
      if (res.success) {
        setMessage(t('profile.accountUpdated'));
        setEmailModal(false);
        setEmailStep(1);
        setEmailOtp('');
        onAccountUpdated?.(newEmail.trim());
      } else {
        setError((res as { msg?: string }).msg || t('profile.verification.invalidOtp'));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { msg?: string })?.msg;
      setError(msg && typeof msg === 'string' ? msg : t('profile.verification.invalidOtp'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMobile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const num = newMobile.replace(/\D/g, '');
    const fullMobile = countryCode && num ? `${countryCode}${num}` : '';
    if (!fullMobile) return;
    if (mobileStep === 1) {
      setLoading(true);
      try {
        const res = await api.post('/user/send-verify-mobile', { countryCode, mobile: num });
        if (res.success) {
          setMobileStep(2);
          setMobileOtp('');
          setMobileDevOtp((res as { devOtp?: string }).devOtp ?? null);
        } else {
          setError((res as { msg?: string }).msg || t('common.error'));
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : t('common.error'));
      } finally {
        setLoading(false);
      }
      return;
    }
    const otp = mobileOtp.replace(/\D/g, '');
    if (otp.length !== 6) {
      setError(t('profile.verification.invalidOtp'));
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/user/confirm-mobile', { countryCode, mobile: num, otp });
      if (res.success) {
        setMessage(t('profile.accountUpdated'));
        setMobileModal(false);
        setMobileStep(1);
        setMobileOtp('');
        onAccountUpdated?.(undefined, fullMobile);
      } else {
        setError((res as { msg?: string }).msg || t('profile.verification.invalidOtp'));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { msg?: string })?.msg;
      setError(msg && typeof msg === 'string' ? msg : t('profile.verification.invalidOtp'));
    } finally {
      setLoading(false);
    }
  };

  const mobileDisplay = getMobileParts(mobile);

  return (
    <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <KeyRound className="h-5 w-5 text-primary" />
        {t('profile.accountSecurity')}
      </h2>
      {message && (
        <div className="mb-4 p-3 rounded-md bg-green-50 text-green-800 text-sm">{message}</div>
      )}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">{t('profile.boundEmail')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-900">{email || t('profile.notProvided')}</span>
            <button
              type="button"
              onClick={() => { setEmailModal(true); setNewEmail(email || ''); setError(''); setEmailStep(1); setEmailOtp(''); setEmailDevOtp(null); }}
              className="text-sm font-medium text-primary hover:text-primary-dark"
            >
              {t('profile.updateEmail')}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">{t('profile.boundMobile')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-900">
              {mobileDisplay.countryCode && mobileDisplay.number
                ? `${mobileDisplay.countryCode} ${mobileDisplay.number}`
                : t('profile.notProvided')}
            </span>
            <button
              type="button"
              onClick={() => { setMobileModal(true); setNewMobile(mobileDisplay.number); setCountryCode(mobileDisplay.countryCode.replace('+', '') || '852'); setError(''); setMobileStep(1); setMobileOtp(''); setMobileDevOtp(null); }}
              className="text-sm font-medium text-primary hover:text-primary-dark"
            >
              {t('profile.updateMobile')}
            </button>
          </div>
        </div>
        <div className="pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={() => { setPasswordModal(true); setError(''); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }}
            className="text-sm font-medium text-primary hover:text-primary-dark flex items-center gap-2"
          >
            <KeyRound className="h-4 w-4" />
            {t('profile.changePassword')}
          </button>
        </div>
      </div>

      {passwordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('profile.changePassword')}</h3>
            <form onSubmit={handleChangePassword} className="space-y-4">
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.currentPassword')}</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.newPassword')}</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.confirmNewPassword')}</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-primary focus:border-primary"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setPasswordModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                  {t('common.cancel')}
                </button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50">
                  {loading ? t('common.sending') : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {emailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('profile.updateEmail')}</h3>
            <form onSubmit={handleUpdateEmail} className="space-y-4">
              {error && <p className="text-sm text-red-600">{error}</p>}
              {emailStep === 1 ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.boundEmail')}</label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      required
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setEmailModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                      {t('common.cancel')}
                    </button>
                    <button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50">
                      {loading ? t('common.sending') : t('profile.verification.sendCode')}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-600">{t('profile.verification.emailSentTo', { email: newEmail })}</p>
                  {emailDevOtp && (
                    <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
                      {t('profile.verification.devOtpHint')}: <strong className="font-mono">{emailDevOtp}</strong>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.verification.enterOtp')}</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={emailOtp}
                      onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-primary focus:border-primary font-mono text-lg tracking-widest"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => { setEmailStep(1); setEmailOtp(''); setError(''); setEmailDevOtp(null); }} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                      {t('common.back')}
                    </button>
                    <button type="submit" disabled={loading || emailOtp.replace(/\D/g, '').length !== 6} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50">
                      {loading ? t('profile.verification.verifying') : t('profile.verification.confirm')}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {mobileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('profile.updateMobile')}</h3>
            <form onSubmit={handleUpdateMobile} className="space-y-4">
              {error && <p className="text-sm text-red-600">{error}</p>}
              {mobileStep === 1 ? (
                <>
                  <div className="flex gap-2">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="rounded-md border border-gray-300 px-3 py-2 focus:ring-primary focus:border-primary"
                    >
                      <option value="852">+852</option>
                      <option value="853">+853</option>
                      <option value="86">+86</option>
                    </select>
                    <input
                      type="tel"
                      value={newMobile}
                      onChange={(e) => setNewMobile(e.target.value.replace(/\D/g, ''))}
                      placeholder={t('register.mobile')}
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setMobileModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                      {t('common.cancel')}
                    </button>
                    <button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50">
                      {loading ? t('common.sending') : t('profile.verification.sendCode')}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-600">{t('profile.verification.mobileSent')}</p>
                  {mobileDevOtp && (
                    <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
                      {t('profile.verification.devOtpHint')}: <strong className="font-mono">{mobileDevOtp}</strong>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.verification.enterOtp')}</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={mobileOtp}
                      onChange={(e) => setMobileOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-primary focus:border-primary font-mono text-lg tracking-widest"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => { setMobileStep(1); setMobileOtp(''); setError(''); setMobileDevOtp(null); }} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                      {t('common.back')}
                    </button>
                    <button type="submit" disabled={loading || mobileOtp.replace(/\D/g, '').length !== 6} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50">
                      {loading ? t('profile.verification.verifying') : t('profile.verification.confirm')}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
