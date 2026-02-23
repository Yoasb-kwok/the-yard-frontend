import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PublicLayout from '../../components/PublicLayout';
import { useAuth, CourseLevel, AgeTag } from '../../contexts/AuthContext';
import { HK_DISTRICT_KEYS } from '../../lib/hkDistricts';
import { CheckCircle, Calendar, Clock, MapPin } from 'lucide-react';

interface ClassData {
  id: string;
  name: string;
  instructor: string;
  start_time: string;
  end_time: string;
  location: 'sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui';
  program_code: string;
  level: CourseLevel;
  age_tag?: AgeTag;
}

export default function TrialPage() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const classData = (location.state as { classData?: ClassData })?.classData;
  const [fullName, setFullName] = useState('');
  const [nickName, setNickName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [sex, setSex] = useState<boolean | null>(null);
  const [parentsName, setParentsName] = useState('');
  const [countryCode, setCountryCode] = useState('852');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [residentialDistrict, setResidentialDistrict] = useState('');
  const [hasJoinedCourses, setHasJoinedCourses] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [wasLoggedIn, setWasLoggedIn] = useState(false);
  const navigate = useNavigate();
  const { signUp, user, profile } = useAuth();
  
  // Check if user is logged in
  const isLoggedIn = !!user && !!profile;

  // Extract country code and mobile number
  const getMobileParts = (mobile: string | null): { countryCode: string; number: string } => {
    if (!mobile) {
      return { countryCode: '', number: '' };
    }
    
    // Check if mobile starts with country codes: 852, 853, or 86
    if (mobile.startsWith('852')) {
      return { countryCode: '+852', number: mobile.substring(3) };
    } else if (mobile.startsWith('853')) {
      return { countryCode: '+853', number: mobile.substring(3) };
    } else if (mobile.startsWith('86')) {
      return { countryCode: '+86', number: mobile.substring(2) };
    }
    
    // If no country code detected but number exists, default to +852 (Hong Kong)
    if (mobile.length > 0) {
      return { countryCode: '+852', number: mobile };
    }
    
    return { countryCode: '', number: '' };
  };

  // Generate tutor profile image URL from UI Avatars
  const getTutorImageUrl = (name: string): string => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=128&background=random&color=fff&bold=true`;
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  };

  // Format time only (HH:MM)
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(i18n.language, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  // Generate password from date of birth (YYYYMMDD format)
  const generatePasswordFromBirthdate = (birthdate: string): string => {
    if (!birthdate) return '';
    const date = new Date(birthdate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!classData) {
      setError(t('trial.noClassSelected'));
      return;
    }

    // If logged in, use user's information
    if (isLoggedIn && user && profile) {
      // For logged-in users, we just need to submit the application
      // (In a real app, this would be an API call to apply for the trial)
      setLoading(true);
      setWasLoggedIn(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSuccess(true);
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(t('common.error'));
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    // For non-logged-in users, validate and register
    if (!dateOfBirth) {
      setError(t('trial.dateOfBirthRequired'));
      return;
    }

    setLoading(true);

    try {
      // Combine country code with contact number
      const fullContactNumber = `${countryCode}${contactNumber}`;
      // Generate password from date of birth (YYYYMMDD format)
      const password = generatePasswordFromBirthdate(dateOfBirth);
      
      await signUp(
        email,
        password,
        fullName,
        nickName || null,
        dateOfBirth || null,
        sex,
        parentsName || null,
        fullContactNumber || null,
        residentialDistrict || null,
        hasJoinedCourses
      );

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
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

  if (success) {
    return (
      <PublicLayout>
        <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center py-12 px-4">
          <div className="max-w-md w-full text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {t('trial.applicationSubmitted')}
            </h2>
            <p className="text-gray-600 mb-4">
              {wasLoggedIn 
                ? t('trial.applicationSubmittedDescLoggedIn')
                : t('trial.applicationSubmittedDesc')
              }
            </p>
            <p className="text-sm text-gray-600 mb-4">
              {t('trial.sameAccountNote')}
            </p>
            <p className="text-sm text-gray-500">
              {wasLoggedIn ? t('trial.redirectingToDashboard') : t('trial.redirecting')}
            </p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (!classData) {
    return (
      <PublicLayout>
        <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center py-12 px-4">
          <div className="max-w-md w-full text-center">
            <p className="text-gray-600">{t('trial.noClassSelected')}</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{t('trial.title')}</h1>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
            {/* Right Section - Class Information */}
            <div className="bg-white rounded-lg shadow-md p-6 lg:sticky lg:top-8 lg:h-fit">
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                {t('trial.classInformation')}
              </h3>

              {/* Tutor Image and Name */}
              <div className="flex items-center mb-6 pb-6 border-b-2 border-gray-100">
                <img
                  src={getTutorImageUrl(classData.instructor)}
                  alt={classData.instructor}
                  className="w-24 h-24 rounded-full object-cover mr-4 border-4 border-primary-lighter"
                />
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">{t('home.tutor')}</p>
                  <p className="text-lg font-bold text-gray-900">{classData.instructor}</p>
                </div>
              </div>

              {/* Class Details */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">{t('trial.className')}</p>
                  <p className="text-lg font-semibold text-gray-900">{classData.name}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">{t('trial.classCode')}</p>
                  <p className="text-lg font-semibold text-primary">{classData.program_code}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">{t('trial.level')}</p>
                  <span className={`inline-block text-sm font-semibold px-3 py-1.5 rounded border ${
                    classData.level === 'entry' 
                      ? 'bg-blue-100 text-blue-800 border-blue-200'
                      : classData.level === 'intermediate'
                      ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                      : 'bg-purple-100 text-purple-800 border-purple-200'
                  }`}>
                    {classData.level === 'entry' 
                      ? t('calendar.level.entry')
                      : classData.level === 'intermediate'
                      ? t('calendar.level.intermediate')
                      : t('calendar.level.advanced')
                    }
                  </span>
                </div>

                {classData.age_tag && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">{t('trial.ageTag')}</p>
                    <span className={`inline-block text-sm font-semibold px-3 py-1.5 rounded border ${
                      classData.age_tag === '5-8' 
                        ? 'bg-teal-100 text-teal-800 border-teal-200'
                        : classData.age_tag === '9-12'
                        ? 'bg-cyan-100 text-cyan-800 border-cyan-200'
                        : 'bg-indigo-100 text-indigo-800 border-indigo-200'
                    }`}>
                      {t(`calendar.ageTag.${classData.age_tag}`)}
                    </span>
                  </div>
                )}

                <div className="flex items-center text-gray-800">
                  <Calendar className="h-5 w-5 mr-3 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">{t('trial.classDate')}</p>
                    <p className="text-base font-semibold">{formatDate(classData.start_time)}</p>
                  </div>
                </div>

                <div className="flex items-center text-gray-800">
                  <Clock className="h-5 w-5 mr-3 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">{t('trial.classTime')}</p>
                    <p className="text-base font-semibold">
                      {formatTime(classData.start_time)} - {formatTime(classData.end_time)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center text-gray-800">
                  <MapPin className="h-5 w-5 mr-3 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">{t('home.location')}</p>
                    <p className="text-base font-semibold">{t(`home.locations.${classData.location}`)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Left Section - Registration Form or Apply Button */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                {isLoggedIn ? t('trial.submitApplication') : t('trial.registrationForm')}
              </h3>

              {isLoggedIn && profile && user && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">{t('register.fullName')}</p>
                    <p className="text-base font-semibold text-gray-900">{profile.full_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-2">{t('register.email')}</p>
                    <p className="text-base font-semibold text-gray-900">{user.email}</p>
                  </div>
                  {profile.mobile && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">{t('register.mobile')}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold text-gray-900">
                          {getMobileParts(profile.mobile).countryCode}
                        </span>
                        <span className="text-base font-semibold text-gray-900">
                          {getMobileParts(profile.mobile).number}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <form className="space-y-6" onSubmit={handleSubmit}>
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                    {error}
                  </div>
                )}

                {!isLoggedIn && (
                  <div className="rounded-md shadow-sm space-y-4">
                    <div>
                      <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('trial.fullName')} *
                      </label>
                      <input
                        id="fullName"
                        name="fullName"
                        type="text"
                        autoComplete="name"
                        required
                        className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                        placeholder={t('trial.fullName')}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>

                    <div>
                      <label htmlFor="nickName" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('trial.nickName')}
                      </label>
                      <input
                        id="nickName"
                        name="nickName"
                        type="text"
                        className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                        placeholder={t('trial.nickName')}
                        value={nickName}
                        onChange={(e) => setNickName(e.target.value)}
                      />
                    </div>

                    <div>
                      <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('trial.dateOfBirth')} *
                      </label>
                      <input
                        id="dateOfBirth"
                        name="dateOfBirth"
                        type="date"
                        required
                        className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('trial.sex')} *
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
                            required
                          />
                          {t('trial.male')}
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="sex"
                            value="female"
                            checked={sex === false}
                            onChange={() => setSex(false)}
                            className="mr-2"
                            required
                          />
                          {t('trial.female')}
                        </label>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="parentsName" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('trial.parentsName')}
                      </label>
                      <input
                        id="parentsName"
                        name="parentsName"
                        type="text"
                        className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                        placeholder={t('trial.parentsName')}
                        value={parentsName}
                        onChange={(e) => setParentsName(e.target.value)}
                      />
                    </div>

                    <div>
                      <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('trial.contactNumber')} *
                      </label>
                      <div className="flex rounded-md shadow-sm">
                        <select
                          id="countryCode"
                          name="countryCode"
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="appearance-none relative block px-3 py-2 border border-gray-300 border-r-0 rounded-l-md bg-gray-50 text-gray-700 text-sm focus:outline-none focus:ring-primary focus:border-primary focus:z-10"
                        >
                          <option value="852">+852</option>
                          <option value="86">+86</option>
                          <option value="853">+853</option>
                        </select>
                        <input
                          id="contactNumber"
                          name="contactNumber"
                          type="tel"
                          autoComplete="tel"
                          required
                          className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-r-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                          placeholder={t('trial.contactNumber')}
                          value={contactNumber}
                          onChange={(e) => setContactNumber(e.target.value.replace(/\D/g, ''))}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('trial.email')} *
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                        placeholder={t('trial.email')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>

                    <div>
                      <label htmlFor="residentialDistrict" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('trial.residentialDistrict')}
                      </label>
                      <select
                        id="residentialDistrict"
                        name="residentialDistrict"
                        className="appearance-none relative block w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
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
                        {t('trial.hasJoinedCourses')}
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
                  </div>
                )}

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                  >
                    {loading ? t('trial.submitting') : t('trial.submitApplication')}
                  </button>
                </div>
              </form>
            </div>
        </div>
      </div>
    </PublicLayout>
  );
}
