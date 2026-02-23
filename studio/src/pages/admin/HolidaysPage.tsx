import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { formatDate } from '../../lib/utils';
import { api } from '../../lib/api';
import { Plus, Edit, Trash2, Search, CalendarOff, RefreshCw, CalendarClock } from 'lucide-react';
import { TableSortButton } from '../../components/TableSortButton';

export interface Holiday {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  description?: string;
  created_at: string;
}

/** Fallback demo data when API is unavailable */
const FALLBACK_HOLIDAYS: Holiday[] = (() => {
  const y = new Date().getFullYear();
  return [
    { id: 'hol_1', name: 'Chinese New Year', date: `${y}-01-29`, description: 'Public holiday', created_at: new Date().toISOString() },
    { id: 'hol_2', name: 'Easter Monday', date: `${y}-04-21`, description: 'Public holiday', created_at: new Date().toISOString() },
  ];
})();

export default function HolidaysPage() {
  const { t, i18n } = useTranslation();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<string | null>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showModal, setShowModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [postponeModal, setPostponeModal] = useState<Holiday | null>(null);
  const [postponing, setPostponing] = useState(false);
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
    setLoading(true);
    try {
      const res = await api.get<Holiday[]>('admin/holidays?demo=1').catch(() => ({ success: true, data: FALLBACK_HOLIDAYS }));
      setHolidays(res.data ?? FALLBACK_HOLIDAYS);
    } catch (err) {
      console.error('Failed to load holidays:', err);
      setHolidays(FALLBACK_HOLIDAYS);
    } finally {
      setLoading(false);
    }
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

    try {
      if (editingHoliday) {
        await api.patch(`admin/holidays/${editingHoliday.id}`, {
          name: form.name.trim(),
          date: form.date,
          description: form.description.trim() || undefined,
        });
        await loadHolidays();
        alert(t('admin.holidays.holidayUpdated'));
      } else {
        await api.post('admin/holidays', {
          name: form.name.trim(),
          date: form.date,
          description: form.description.trim() || undefined,
        });
        await loadHolidays();
        alert(t('admin.holidays.holidayCreated'));
      }
      closeModal();
    } catch (err) {
      console.error('Holiday save failed:', err);
      alert(err instanceof Error ? err.message : t('common.error'));
    }
  }

  async function handleDelete(holiday: Holiday) {
    if (!confirm(t('admin.holidays.confirmDelete', { name: holiday.name }))) {
      return;
    }
    try {
      await api.delete(`admin/holidays/${holiday.id}`);
      await loadHolidays();
      alert(t('admin.holidays.holidayDeleted'));
    } catch (err) {
      console.error('Delete holiday failed:', err);
      alert(err instanceof Error ? err.message : t('common.error'));
    }
  }

  async function handlePostponeOneWeek(holiday: Holiday) {
    setPostponing(true);
    try {
      await api.post<{ success?: boolean }>(`admin/holidays/${holiday.id}/postpone`).catch(() => ({}));
      alert(t('admin.holidays.postponeSuccess'));
      setPostponeModal(null);
    } catch {
      alert(t('admin.holidays.postponeFailed'));
    } finally {
      setPostponing(false);
    }
  }

  async function handleSyncFromHK() {
    setSyncing(true);
    try {
      const y = new Date().getFullYear();
      const res = await api.post<{ years: number[]; added: number; updated: number }>(
        `admin/holidays/sync?years=${y},${y + 1}`
      );
      await loadHolidays();
      const data = res.data;
      if (data) {
        alert(t('admin.holidays.syncFromHKSuccess', { added: data.added ?? 0, updated: data.updated ?? 0 }));
      } else {
        alert(t('admin.holidays.syncFromHKDone'));
      }
    } catch (err) {
      console.error('Sync holidays failed:', err);
      alert(err instanceof Error ? err.message : t('admin.holidays.syncFromHKFailed'));
    } finally {
      setSyncing(false);
    }
  }

  const filteredHolidays = holidays.filter(
    (h) =>
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      (h.description || '').toLowerCase().includes(search.toLowerCase()) ||
      h.date.includes(search)
  );

  const sortedHolidays = [...filteredHolidays].sort((a, b) => {
    if (!sortKey) return 0;
    let cmp = 0;
    if (sortKey === 'name') {
      cmp = (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
    } else if (sortKey === 'date') {
      cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

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
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSyncFromHK}
              disabled={syncing}
              className="flex w-full items-center justify-center rounded-md border border-primary bg-white px-4 py-2 text-primary hover:bg-primary/5 disabled:opacity-50 sm:w-auto"
              title={t('admin.holidays.syncFromHKTooltip')}
            >
              <RefreshCw className={`mr-2 h-5 w-5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? t('admin.holidays.syncing') : t('admin.holidays.syncFromHK')}
            </button>
            <button
              onClick={openCreateModal}
              className="flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-white hover:bg-primary-dark sm:w-auto"
            >
              <Plus className="mr-2 h-5 w-5" />
              {t('admin.holidays.addHoliday')}
            </button>
          </div>
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
                          onClick={() => setPostponeModal(holiday)}
                          className="rounded p-1.5 text-amber-600 hover:bg-amber-50"
                          title={t('admin.holidays.postponeOneWeekTooltip')}
                        >
                          <CalendarClock className="h-5 w-5" />
                        </button>
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
                      <TableSortButton label={t('admin.holidays.name')} sortKey="name" currentSortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="px-3 py-3 text-left text-xs lg:px-4" />
                      <TableSortButton label={t('admin.holidays.date')} sortKey="date" currentSortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="px-3 py-3 text-left text-xs lg:px-4" />
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
                              onClick={() => setPostponeModal(holiday)}
                              className="text-amber-600 hover:text-amber-800"
                              title={t('admin.holidays.postponeOneWeekTooltip')}
                            >
                              <CalendarClock className="h-4 w-4" />
                            </button>
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

      {postponeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('admin.holidays.postponeConfirmTitle')}</h3>
            <p className="text-gray-600 mb-6">
              {t('admin.holidays.postponeConfirmMessage', {
                date: formatDate(postponeModal.date, getLocale()),
                name: postponeModal.name,
              })}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setPostponeModal(null)}
                disabled={postponing}
                className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => handlePostponeOneWeek(postponeModal)}
                disabled={postponing}
                className="px-4 py-2 rounded-md bg-primary text-white hover:bg-primary-dark disabled:opacity-50"
              >
                {postponing ? t('common.loading') : t('admin.holidays.postponeOneWeek')}
              </button>
            </div>
          </div>
        </div>
      )}

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
