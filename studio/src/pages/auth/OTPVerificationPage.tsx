import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PublicLayout from '../../components/PublicLayout';
import { api } from '../../lib/api';
import { ArrowLeft, CheckCircle } from 'lucide-react';

type OTPState = { email?: string; usePhone?: boolean; countryCode?: string; mobile?: string };

export default function OTPVerificationPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state || {}) as OTPState;
  const email = state.email || '';
  const usePhone = state.usePhone && state.countryCode && state.mobile;
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (!email && !usePhone) navigate('/forgot-password');
  }, [email, usePhone, navigate]);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    // Handle paste
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      navigator.clipboard.readText().then((text) => {
        const digits = text.replace(/\D/g, '').slice(0, 6).split('');
        const newOtp = [...otp];
        digits.forEach((digit, i) => {
          if (i < 6) newOtp[i] = digit;
        });
        setOtp(newOtp);
        // Focus last filled input or first empty
        const lastIndex = digits.length < 6 ? digits.length : 5;
        inputRefs.current[lastIndex]?.focus();
      });
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const digits = pastedData.split('');
    const newOtp = [...otp];
    digits.forEach((digit, i) => {
      if (i < 6) newOtp[i] = digit;
    });
    setOtp(newOtp);
    // Focus last filled input or first empty
    const lastIndex = digits.length < 6 ? digits.length : 5;
    inputRefs.current[lastIndex]?.focus();
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError(t('otpVerification.invalidOTP'));
      return;
    }
    setLoading(true);
    try {
      const body = usePhone
        ? { countryCode: state.countryCode, mobile: state.mobile, otp: otpString }
        : { email, otp: otpString };
      const res = await api.post<{ success?: boolean; msg?: string; tempToken?: string }>('user/verify-otp', body);
      if (!res.success) throw new Error(res.msg || t('otpVerification.verificationFailed'));
      setSuccess(true);
      setTimeout(() => {
        navigate('/reset-password', {
          state: usePhone
            ? { usePhone: true, countryCode: state.countryCode, mobile: state.mobile, otp: otpString }
            : { email, otp: otpString },
        });
      }, 800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('otpVerification.verificationFailed'));
    } finally {
      setLoading(false);
    }
  }

  if (!email && !usePhone) return null;
  const displayIdentifier = usePhone ? `+${state.countryCode} ${state.mobile}` : email;

  return (
    <PublicLayout>
      <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
              {t('otpVerification.title')}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {t('otpVerification.subtitle', { email: displayIdentifier })}
            </p>
          </div>

          {success ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <p className="text-lg font-medium text-gray-900">{t('otpVerification.success')}</p>
              <p className="text-sm text-gray-600">{t('otpVerification.redirecting')}</p>
            </div>
          ) : (
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                  {t('otpVerification.enterOTP')}
                </label>
                <div className="flex justify-center gap-2">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={index === 0 ? handlePaste : undefined}
                      className="w-12 h-14 text-center text-2xl font-semibold border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  ))}
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading || otp.join('').length !== 6}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? t('otpVerification.verifying') : t('otpVerification.verify')}
                </button>
              </div>

              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">
                  {t('otpVerification.didntReceive')}{' '}
                  <button
                    type="button"
                    onClick={() =>
                      navigate('/forgot-password', {
                        state: usePhone ? { usePhone: true, countryCode: state.countryCode, mobile: state.mobile } : { email },
                      })
                    }
                    className="font-medium text-primary hover:text-primary-dark"
                  >
                    {t('otpVerification.resend')}
                  </button>
                </p>
                <div>
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-dark"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {t('otpVerification.backToLogin')}
                  </Link>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}

