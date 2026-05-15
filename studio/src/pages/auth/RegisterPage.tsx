import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, User, CreditCard, Phone, Mail, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import PublicLayout from '../../components/PublicLayout';
import DateSelect from '../../components/DateSelect';
import { HK_DISTRICT_KEYS } from '../../lib/hkDistricts';

export default function RegisterPage() {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState('');
  const [nickName, setNickName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [sex, setSex] = useState<boolean | null>(null);
  const [parentsName, setParentsName] = useState('');
  const [idLastFour, setIdLastFour] = useState('');
  const [countryCode, setCountryCode] = useState('852');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [residentialDistrict, setResidentialDistrict] = useState('');
  const [hasJoinedCourses, setHasJoinedCourses] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Validation
    if (idLastFour.length !== 4 || !/^[A-Za-z0-9]{4}$/.test(idLastFour)) {
      setError(t('register.invalidIdCard'));
      return;
    }

    if (password.length < 6) {
      setError(t('register.passwordMin'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('register.passwordMismatch'));
      return;
    }

    setLoading(true);

    try {
      const fullMobile = `${countryCode}${mobile}`;
      await signUp(
        email,
        password,
        fullName,
        nickName.trim() || null,
        dateOfBirth || null,
        sex,
        parentsName.trim() || null,
        fullMobile,
        residentialDistrict || null,
        hasJoinedCourses,
        { idLastFour, countryCode, mobile }
      );
      navigate('/login');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t('common.error'));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <PublicLayout>
      <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
              {t('register.title')}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {t('register.subtitle')}
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                {error}
              </div>
            )}
            <div className="rounded-md shadow-sm space-y-4">
              <div>
                <p className="text-xs text-gray-500">
                  {t('register.multipleChildrenHint')}
                </p>
              </div>
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('register.fullName')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <User className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    required
                    className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder={t('register.fullName')}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="nickName" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('profile.nickName')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <User className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    id="nickName"
                    name="nickName"
                    type="text"
                    className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder={t('profile.nickName')}
                    value={nickName}
                    onChange={(e) => setNickName(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('profile.dateOfBirth')}
                </label>
                <DateSelect
                  id="dateOfBirth"
                  birthDateMode
                  value={dateOfBirth}
                  onChange={setDateOfBirth}
                  className="w-full appearance-none relative block border border-gray-300 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                  ariaLabel={t('profile.dateOfBirth')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('profile.sex')}
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="sex"
                      value="male"
                      checked={sex === true}
                      onChange={() => setSex(true)}
                      className="mr-2"
                    />
                    {t('profile.male')}
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="sex"
                      value="female"
                      checked={sex === false}
                      onChange={() => setSex(false)}
                      className="mr-2"
                    />
                    {t('profile.female')}
                  </label>
                </div>
              </div>
              <div>
                <label htmlFor="idLastFour" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('register.idLastFour')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <CreditCard className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    id="idLastFour"
                    name="idLastFour"
                    type="text"
                    maxLength={4}
                    pattern="[A-Za-z0-9]{4}"
                    required
                    className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm uppercase"
                    placeholder={t('register.idLastFour')}
                    value={idLastFour}
                    onChange={(e) => setIdLastFour(e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase())}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="residentialDistrict" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('profile.residentialDistrict')}
                </label>
                <select
                  id="residentialDistrict"
                  name="residentialDistrict"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  value={residentialDistrict}
                  onChange={(e) => setResidentialDistrict(e.target.value)}
                >
                  <option value="">{t('districts.pleaseSelect')}</option>
                  {HK_DISTRICT_KEYS.map((key) => (
                    <option key={key} value={key}>{t(`districts.${key}`)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('profile.hasJoinedCourses')}
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="hasJoinedCourses"
                      value="yes"
                      checked={hasJoinedCourses === true}
                      onChange={() => setHasJoinedCourses(true)}
                      className="mr-2"
                    />
                    {t('common.yes')}
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="hasJoinedCourses"
                      value="no"
                      checked={hasJoinedCourses === false}
                      onChange={() => setHasJoinedCourses(false)}
                      className="mr-2"
                    />
                    {t('common.no')}
                  </label>
                </div>
              </div>
              <div>
                <label htmlFor="parentsName" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('profile.parentsName')}
                </label>
                <input
                  id="parentsName"
                  name="parentsName"
                  type="text"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder={t('profile.parentsName')}
                  value={parentsName}
                  onChange={(e) => setParentsName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="mobile" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('register.mobile')}
                </label>
                <div className="flex rounded-md shadow-sm">
                  <select
                    id="countryCode"
                    name="countryCode"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="appearance-none relative block px-3 py-2 border border-gray-300 border-r-0 rounded-l-md bg-gray-50 text-gray-700 text-sm focus:outline-none focus:ring-primary focus:border-primary"
                  >
                    <option value="852">+852</option>
                    <option value="86">+86</option>
                    <option value="853">+853</option>
                  </select>
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                      <Phone className="h-5 w-5 text-gray-500" />
                    </div>
                    <input
                      id="mobile"
                      name="mobile"
                      type="tel"
                      autoComplete="tel"
                      required
                      className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-r-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                      placeholder={t('register.mobile')}
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                </div>
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('register.email')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <Mail className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder={t('register.email')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('register.password')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <Lock className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    className="appearance-none block w-full pl-10 pr-10 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder={t('register.password')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 focus:outline-none z-10"
                    aria-label={showPassword ? t('register.hidePassword') : t('register.showPassword')}
                  >
                    {showPassword ? (
                      <Eye className="h-5 w-5" />
                    ) : (
                      <EyeOff className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {t('register.passwordMin')}
                </p>
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('register.confirmPassword')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <Lock className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    className="appearance-none block w-full pl-10 pr-10 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder={t('register.confirmPassword')}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 focus:outline-none z-10"
                    aria-label={showPassword ? t('register.hidePassword') : t('register.showPassword')}
                  >
                    {showPassword ? (
                      <Eye className="h-5 w-5" />
                    ) : (
                      <EyeOff className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
              >
                {loading ? t('register.registering') : t('register.register')}
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                {t('register.alreadyHaveAccount')}{' '}
                <Link
                  to="/login"
                  className="font-medium text-primary hover:text-primary-dark"
                >
                  {t('register.signIn')}
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </PublicLayout>
  );
}

