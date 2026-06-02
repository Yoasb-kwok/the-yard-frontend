import { useTranslation } from 'react-i18next';
import DateSelect from '../DateSelect';
import { HK_DISTRICT_KEYS } from '../../lib/hkDistricts';
import type { AgeTag, CourseLevel } from '../../contexts/AuthContext';
import {
  normalizeDateOfBirth,
  normalizeResidentialDistrict,
  normalizeSex,
} from '../../lib/adminUserFields';
import { getAgeFromDateOfBirth } from '../../lib/utils';
import type { AdminStudentProfile, AdminUserFamily } from '../../lib/adminUserFamily';
import { isNewStudentProfileId, newStudentProfileTempId } from '../../lib/studentProfilesApi';

export interface ParentEditFormState {
  email: string;
  username: string;
  mobile: string;
  parents_name: string;
  contact_number: string;
  residential_district: string;
}

export interface StudentEditFormState {
  id: string;
  full_name: string;
  date_of_birth: string;
  sex: boolean | null;
  id_card_last4: string;
  level: CourseLevel | '';
  age_tag: AgeTag | '';
}

interface AdminUserEditModalProps {
  accountNumber: string | null;
  family: AdminUserFamily;
  parentForm: ParentEditFormState;
  studentForms: StudentEditFormState[];
  onParentChange: (next: ParentEditFormState) => void;
  onStudentChange: (index: number, next: StudentEditFormState) => void;
  onAddStudent?: () => void;
  onRemoveStudent?: (index: number) => void;
  emailError?: string;
  usernameError?: string;
  inputErrorClass: string;
}

export function buildParentEditForm(family: AdminUserFamily, user: {
  email: string | null;
  username: string | null;
  mobile: string | null;
}): ParentEditFormState {
  return {
    email: user.email || '',
    username: user.username || '',
    mobile: user.mobile || '',
    parents_name: family.parent.parents_name || '',
    contact_number: family.parent.contact_number || '',
    residential_district: normalizeResidentialDistrict(family.parent.residential_district) || '',
  };
}

export function buildStudentEditForms(students: AdminStudentProfile[]): StudentEditFormState[] {
  return students.map((s) => ({
    id: s.id,
    full_name: s.full_name,
    date_of_birth: normalizeDateOfBirth(s.date_of_birth) || '',
    sex: normalizeSex(s.sex),
    id_card_last4: s.id_card_last4 || '',
    level: s.level ?? '',
    age_tag: s.age_tag ?? '',
  }));
}

export function emptyStudentEditForm(): StudentEditFormState {
  return {
    id: newStudentProfileTempId(),
    full_name: '',
    date_of_birth: '',
    sex: null,
    id_card_last4: '',
    level: '',
    age_tag: '',
  };
}

export default function AdminUserEditModal({
  accountNumber,
  family,
  parentForm,
  studentForms,
  onParentChange,
  onStudentChange,
  onAddStudent,
  onRemoveStudent,
  emailError,
  usernameError,
  inputErrorClass,
}: AdminUserEditModalProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-blue-100 bg-blue-50/40 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-blue-900">
          {t('admin.users.parentAccountSection')}
        </h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('admin.users.colAccountNumber')}
          </label>
          <input
            type="text"
            readOnly
            value={accountNumber || '—'}
            className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-600"
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.users.colEmail')}
            </label>
            <input
              type="email"
              required
              value={parentForm.email}
              onChange={(e) => onParentChange({ ...parentForm, email: e.target.value })}
              aria-invalid={Boolean(emailError)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                emailError ? inputErrorClass : 'border-gray-300'
              }`}
            />
            {emailError && (
              <p className="mt-1 text-sm text-red-600" role="alert">
                {emailError}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.users.colUsername')}
            </label>
            <input
              type="text"
              value={parentForm.username}
              onChange={(e) =>
                onParentChange({ ...parentForm, username: e.target.value.replace(/\s/g, '') })
              }
              aria-invalid={Boolean(usernameError)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                usernameError ? inputErrorClass : 'border-gray-300'
              }`}
              autoComplete="username"
            />
            {usernameError && (
              <p className="mt-1 text-sm text-red-600" role="alert">
                {usernameError}
              </p>
            )}
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.users.colParentName')}
            </label>
            <input
              type="text"
              value={parentForm.parents_name}
              onChange={(e) => onParentChange({ ...parentForm, parents_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.users.colMobile')}
            </label>
            <input
              type="text"
              value={parentForm.mobile}
              onChange={(e) => onParentChange({ ...parentForm, mobile: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('profile.contactNumber')}
            </label>
            <input
              type="text"
              value={parentForm.contact_number}
              onChange={(e) => onParentChange({ ...parentForm, contact_number: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.users.colResidentialDistrict')}
            </label>
            <select
              value={parentForm.residential_district}
              onChange={(e) =>
                onParentChange({ ...parentForm, residential_district: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">{t('profile.notProvided')}</option>
              {HK_DISTRICT_KEYS.map((key) => (
                <option key={key} value={key}>
                  {t(`districts.${key}`)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-emerald-900">
            {t('admin.users.studentProfilesSection')}
          </h3>
          {onAddStudent && (
            <button
              type="button"
              onClick={onAddStudent}
              className="text-sm font-medium text-primary hover:text-primary-dark"
            >
              + {t('admin.users.addStudentProfile')}
            </button>
          )}
        </div>
        {studentForms.length === 0 ? (
          <p className="text-sm text-gray-500">{t('admin.users.noStudentProfiles')}</p>
        ) : (
          studentForms.map((student, index) => (
            <div
              key={student.id}
              className="rounded-lg border border-gray-200 bg-white p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-gray-500">
                  {t('admin.users.editStudentLabel', {
                    index: index + 1,
                    defaultValue: '學員 {{index}}',
                  })}
                  {isNewStudentProfileId(student.id) && (
                    <span className="ml-2 text-primary">
                      ({t('admin.users.newStudentProfile')})
                    </span>
                  )}
                </p>
                {onRemoveStudent && isNewStudentProfileId(student.id) && (
                  <button
                    type="button"
                    onClick={() => onRemoveStudent(index)}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    {t('common.delete')}
                  </button>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.users.colStudentName')}
                  <span className="text-red-600"> *</span>
                </label>
                <input
                  type="text"
                  required
                  value={student.full_name}
                  onChange={(e) =>
                    onStudentChange(index, { ...student, full_name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin.users.colDateOfBirth')}
                  </label>
                  <DateSelect
                    birthDateMode
                    value={student.date_of_birth}
                    onChange={(v) =>
                      onStudentChange(index, { ...student, date_of_birth: v })
                    }
                    className="w-full"
                    ariaLabel={t('admin.users.colDateOfBirth')}
                  />
                  {student.date_of_birth && getAgeFromDateOfBirth(student.date_of_birth) != null && (
                    <p className="mt-1 text-xs text-gray-500">
                      {t('admin.users.studentAgeHint', {
                        age: getAgeFromDateOfBirth(student.date_of_birth),
                        defaultValue: '約 {{age}} 歲',
                      })}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin.users.colSex')}
                  </label>
                  <select
                    value={student.sex === true ? 'male' : student.sex === false ? 'female' : ''}
                    onChange={(e) =>
                      onStudentChange(index, {
                        ...student,
                        sex:
                          e.target.value === 'male'
                            ? true
                            : e.target.value === 'female'
                              ? false
                              : null,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">{t('profile.notProvided')}</option>
                    <option value="male">{t('profile.male')}</option>
                    <option value="female">{t('profile.female')}</option>
                  </select>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('profile.level')}
                  </label>
                  <select
                    value={student.level}
                    onChange={(e) =>
                      onStudentChange(index, {
                        ...student,
                        level: (e.target.value || '') as CourseLevel | '',
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">{t('profile.notProvided')}</option>
                    <option value="entry">{t('calendar.level.entry')}</option>
                    <option value="intermediate">{t('calendar.level.intermediate')}</option>
                    <option value="advanced">{t('calendar.level.advanced')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('profile.ageTag')}
                  </label>
                  <select
                    value={student.age_tag}
                    onChange={(e) =>
                      onStudentChange(index, {
                        ...student,
                        age_tag: (e.target.value || '') as AgeTag | '',
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">{t('profile.notProvided')}</option>
                    <option value="5-8">{t('calendar.ageTag.5-8')}</option>
                    <option value="9-12">{t('calendar.ageTag.9-12')}</option>
                    <option value="13-16">{t('calendar.ageTag.13-16')}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.users.colIdCardLast4')}
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={student.id_card_last4}
                  onChange={(e) =>
                    onStudentChange(index, {
                      ...student,
                      id_card_last4: e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 4),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
