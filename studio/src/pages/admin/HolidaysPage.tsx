import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { formatDate } from '../../lib/utils';
import { Plus, Edit, Trash2, Search, CalendarOff } from 'lucide-react';

export interface Holiday {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  description?: string;
  created_at: string;
}

// Mock data – replace with API calls when backend is ready
const MOCK_HOLIDAYS: Holiday[] = [
  {
    id: '1',
    name: 'Chinese New Year',
    date: '2025-01-29',
    description: 'Lunar New Year - Academy closed',
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    name: 'Christmas Day',
    date: '2025-12-25',
    description: 'Public holiday',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function HolidaysPage() {
  const { t, i18n } = useTranslation();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [form, setForm] = useState({
    name: '',
    date: '',
    description: '',
  });

  const getLocale = (): string => {
    const langMap: { [key: string]: string } = {
      en: 'en-US',
      'zh-CN': 'zh-CN',
      'zh-TW': 'zh-TW',
    };
    return langMap[i18n.language] || i18n.language || 'en-US';
  };

  useEffect(() => {
    loadHolidays();
  }, []);

  async function loadHolidays() {
    await new Promise((resolve) => setTimeout(resolve, 500));
    setHolidays(MOCK_HOLIDAYS);
    setLoading(false);
  }

  function openCreateModal() {
    setEditingHoliday(null);
    setForm({
      name: '',
      date: new Date().toISOString().slice(0, 10),
      description: '',
    });
    setShowModal(true);
  }

  function openEditModal(holiday: Holiday) {
    setEditingHoliday(holiday);
    setForm({
      name: holiday.name,
      date: holiday.date,
      description: holiday.description || '',
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingHoliday(null);
    setForm({ name: '', date: '', description: '' });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim()) {
      alert(t('admin.holidays.nameRequired'));
      return;
    }
    if (!form.date) {
      alert(t('admin.holidays.dateRequired'));
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 300));

    if (editingHoliday) {
      const updated: Holiday = {
        ...editingHoliday,
        name: form.name.trim(),
        date: form.date,
        description: form.description.trim() || undefined,
      };
      setHolidays(holidays.map((h) => (h.id === editingHoliday.id ? updated : h)));
      alert(t('admin.holidays.holidayUpdated'));
    } else {
      const newHoliday: Holiday = {
        id: Date.now().toString(),
        name: form.name.trim(),
        date: form.date,
        description: form.description.trim() || undefined,
        created_at: new Date().toISOString(),
      };
      setHolidays([newHoliday, ...holidays]);
      alert(t('admin.holidays.holidayCreated'));
    }

    closeModal();
  }

  async function handleDelete(holiday: Holiday) {
    if (!confirm(t('admin.holidays.confirmDelete', { name: holiday.name }))) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
    setHolidays(holidays.filter((h) => h.id !== holiday.id));
    alert(t('admin.holidays.holidayDeleted'));
  }

  const filteredHolidays = holidays.filter(
    (h) =>
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      (h.description || '').toLowerCase().includes(search.toLowerCase()) ||
      h.date.includes(search)
  );

  // Sort by date descending (upcoming first)
  const sortedHolidays = [...filteredHolidays].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-900 sm:text-3xl">
            <CalendarOff className="h-8 w-8 text-primary" />
            {t('admin.holidays.title')}
          </h1>
          <button
            onClick={openCreateModal}
            className="flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-white hover:bg-primary-dark sm:w-auto"
          >
            <Plus className="mr-2 h-5 w-5" />
            {t('admin.holidays.addHoliday')}
          </button>
        </div>

        <p className="text-sm text-gray-600">
          {t('admin.holidays.description')}
        </p>

        <div className="rounded-lg bg-white p-4 shadow-md sm:p-6">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t('common.search') + '...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-4 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {sortedHolidays.length === 0 ? (
            <p className="py-8 text-center text-gray-500">{t('admin.holidays.noHolidays')}</p>
          ) : (
            <>
              <div className="md:hidden space-y-4">
                {sortedHolidays.map((holiday) => (
                  <div
                    key={holiday.id}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{holiday.name}</h3>
                        <p className="text-sm text-gray-600">
                          {formatDate(holiday.date, getLocale())}
                        </p>
                        {holiday.description && (
                          <p className="mt-1 text-sm text-gray-500">{holiday.description}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditModal(holiday)}
                          className="rounded p-1.5 text-primary hover:bg-primary/10"
                          title={t('common.edit')}
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(holiday)}
                          className="rounded p-1.5 text-red-600 hover:bg-red-50"
                          title={t('common.delete')}
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[500px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium uppercase text-gray-500 lg:px-4">
                        {t('admin.holidays.name')}
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium uppercase text-gray-500 lg:px-4">
                        {t('admin.holidays.date')}
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium uppercase text-gray-500 lg:px-4">
                        {t('admin.holidays.description')}
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium uppercase text-gray-500 lg:px-4">
                        {t('admin.users.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sortedHolidays.map((holiday) => (
                      <tr key={holiday.id} className="hover:bg-gray-50/50">
                        <td className="px-3 py-3 text-sm font-medium text-gray-900 lg:px-4">
                          {holiday.name}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 lg:px-4">
                          {formatDate(holiday.date, getLocale())}
                        </td>
                        <td className="max-w-[200px] truncate px-3 py-3 text-sm text-gray-600 lg:px-4">
                          {holiday.description || '–'}
                        </td>
                        <td className="px-3 py-3 lg:px-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditModal(holiday)}
                              className="text-primary hover:text-primary-dark"
                              title={t('common.edit')}
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(holiday)}
                              className="text-red-600 hover:text-red-800"
                              title={t('common.delete')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[95vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-4 sm:p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 sm:text-xl">
              {editingHoliday
                ? t('admin.holidays.editHoliday')
                : t('admin.holidays.addHoliday')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t('admin.holidays.name')} *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={t('admin.holidays.namePlaceholder')}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t('admin.holidays.date')} *
                </label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t('admin.holidays.description')} ({t('common.optional')})
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={t('admin.holidays.descriptionPlaceholder')}
                />
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end sm:gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-600 hover:bg-gray-50 sm:w-auto"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="w-full rounded-md bg-primary px-4 py-2 text-white hover:bg-primary-dark sm:w-auto"
                >
                  {editingHoliday ? t('admin.users.saveChanges') : t('common.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
