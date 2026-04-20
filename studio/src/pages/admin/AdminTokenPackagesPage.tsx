import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { Plus, Edit, Trash2, Power, PowerOff, Package } from 'lucide-react';
import { TableSortButton } from '../../components/TableSortButton';
import { TablePaginationBar, useTablePagination } from '../../components/TablePagination';
import {
  fetchAdminTokenPackages,
  createAdminTokenPackage,
  updateAdminTokenPackage,
  deleteAdminTokenPackage,
  type TokenPackageRow,
} from '../../lib/tokenPackages';
import { formatCurrency } from '../../lib/utils';

interface FormState {
  name: string;
  description: string;
  token_count: string;
  price: string;
  validity_days: string;
  is_active: boolean;
}

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  token_count: '',
  price: '',
  validity_days: '',
  is_active: true,
};

/** Fallback demo data when admin API is unavailable, so the page still renders. */
const FALLBACK_PACKAGES: TokenPackageRow[] = [
  { id: 1, name: 'Starter Pack', description: 'Perfect for beginners', token_count: 5, price: 500, validity_days: 30, is_active: true },
  { id: 2, name: 'Regular Pack', description: 'Great value for regular students', token_count: 10, price: 900, validity_days: 60, is_active: true },
  { id: 3, name: 'Premium Pack', description: 'Best value for frequent visitors', token_count: 20, price: 1600, validity_days: 90, is_active: true },
];

export default function AdminTokenPackagesPage() {
  const { t } = useTranslation();
  const [packages, setPackages] = useState<TokenPackageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<TokenPackageRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [sortKey, setSortKey] = useState<string | null>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    void loadPackages();
  }, []);

  async function loadPackages() {
    setLoading(true);
    try {
      const rows = await fetchAdminTokenPackages();
      setPackages(rows);
    } catch (err) {
      console.warn('Admin token packages API unavailable, using fallback.', err);
      setPackages(FALLBACK_PACKAGES);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEditModal(pkg: TokenPackageRow) {
    setEditing(pkg);
    setForm({
      name: pkg.name,
      description: pkg.description,
      token_count: String(pkg.token_count),
      price: String(pkg.price),
      validity_days: String(pkg.validity_days),
      is_active: pkg.is_active !== false,
    });
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;
    setShowModal(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    const tokenCount = Number(form.token_count);
    const price = Number(form.price);
    const validityDays = Number(form.validity_days);

    if (!name) {
      alert(t('admin.tokenPackages.nameRequired', 'Package name is required'));
      return;
    }
    if (!Number.isInteger(tokenCount) || tokenCount <= 0) {
      alert(t('admin.tokenPackages.tokenCountInvalid', 'Token count must be a positive integer'));
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      alert(t('admin.tokenPackages.priceInvalid', 'Price must be greater than 0'));
      return;
    }
    if (!Number.isInteger(validityDays) || validityDays <= 0) {
      alert(t('admin.tokenPackages.validityInvalid', 'Validity days must be a positive integer'));
      return;
    }

    const payload = {
      name,
      description: form.description.trim(),
      token_count: tokenCount,
      price: Math.round(price * 100) / 100,
      validity_days: validityDays,
      is_active: form.is_active,
    };

    setSaving(true);
    try {
      if (editing) {
        await updateAdminTokenPackage(editing.id, payload);
        alert(t('admin.tokenPackages.packageUpdated', 'Package updated successfully'));
      } else {
        await createAdminTokenPackage(payload);
        alert(t('admin.tokenPackages.packageCreated', 'Package created successfully'));
      }
      await loadPackages();
      setShowModal(false);
      setEditing(null);
      setForm(EMPTY_FORM);
    } catch (err) {
      console.error('Save token package failed:', err);
      alert(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(pkg: TokenPackageRow) {
    try {
      await updateAdminTokenPackage(pkg.id, { is_active: !(pkg.is_active !== false) });
      await loadPackages();
    } catch (err) {
      console.error('Toggle token package failed:', err);
      alert(err instanceof Error ? err.message : t('common.error'));
    }
  }

  async function handleDelete(pkg: TokenPackageRow) {
    const message = t('admin.tokenPackages.confirmDelete', 'Are you sure you want to delete "{{name}}"?', { name: pkg.name });
    if (!window.confirm(message)) return;
    try {
      await deleteAdminTokenPackage(pkg.id);
      await loadPackages();
      alert(t('admin.tokenPackages.packageDeleted', 'Package deleted successfully'));
    } catch (err) {
      console.error('Delete token package failed:', err);
      alert(err instanceof Error ? err.message : t('common.error'));
    }
  }

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const filteredPackages = packages.filter((pkg) => {
    if (statusFilter === 'all') return true;
    const active = pkg.is_active !== false;
    return statusFilter === 'active' ? active : !active;
  });

  const sortedPackages = [...filteredPackages].sort((a, b) => {
    if (!sortKey) return 0;
    let cmp = 0;
    if (sortKey === 'name') {
      cmp = (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
    } else if (sortKey === 'token_count') {
      cmp = (a.token_count ?? 0) - (b.token_count ?? 0);
    } else if (sortKey === 'price') {
      cmp = (a.price ?? 0) - (b.price ?? 0);
    } else if (sortKey === 'validity_days') {
      cmp = (a.validity_days ?? 0) - (b.validity_days ?? 0);
    } else if (sortKey === 'status') {
      const aActive = a.is_active !== false ? 1 : 0;
      const bActive = b.is_active !== false ? 1 : 0;
      cmp = aActive - bActive;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const {
    page,
    setPage,
    totalPages,
    pageSize,
    totalItems,
    paginatedItems,
  } = useTablePagination(sortedPackages, undefined, [statusFilter, sortKey, sortDir]);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="h-7 w-7 text-primary" />
              {t('admin.tokenPackages.title', '代幣套票管理')}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {t('admin.tokenPackages.subtitle', 'Add, edit, or disable token packages shown on the public token package page and student shop.')}
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="w-full sm:w-auto bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark flex items-center justify-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            {t('admin.tokenPackages.createPackage', 'Create Package')}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-sm text-gray-600 mr-1 self-center">
              {t('admin.tokenPackages.status', 'Status')}:
            </span>
            {(['all', 'active', 'inactive'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                  statusFilter === status
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'all'
                  ? t('common.all', 'All')
                  : t(`admin.tokenPackages.${status}`, status === 'active' ? 'Active' : 'Inactive')}
              </button>
            ))}
          </div>

          {sortedPackages.length === 0 ? (
            <p className="text-gray-500 py-8 text-center">
              {t('admin.tokenPackages.noPackages', 'No token packages found')}
            </p>
          ) : (
            <>
              {/* Mobile card view */}
              <div className="md:hidden space-y-4">
                {paginatedItems.map((pkg) => {
                  const active = pkg.is_active !== false;
                  return (
                    <div key={pkg.id} className={`bg-gray-50 rounded-lg p-4 border ${active ? '' : 'opacity-60'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900">{pkg.name}</h3>
                          {pkg.description && (
                            <p className="text-sm text-gray-600 mt-1">{pkg.description}</p>
                          )}
                          <span
                            className={`mt-2 inline-block px-2 py-1 rounded text-xs font-medium ${
                              active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            {active
                              ? t('admin.tokenPackages.active', 'Active')
                              : t('admin.tokenPackages.inactive', 'Inactive')}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openEditModal(pkg)}
                            className="text-primary hover:text-primary-dark p-1"
                            title={t('common.edit', 'Edit')}
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(pkg)}
                            className={`p-1 ${
                              active ? 'text-yellow-600 hover:text-yellow-800' : 'text-green-600 hover:text-green-800'
                            }`}
                            title={t('admin.tokenPackages.toggleActive', 'Toggle Active Status')}
                          >
                            {active ? <PowerOff className="h-5 w-5" /> : <Power className="h-5 w-5" />}
                          </button>
                          <button
                            onClick={() => handleDelete(pkg)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title={t('admin.tokenPackages.deletePackage', 'Delete Package')}
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">{t('tokenPackage.tokens', 'Tokens')}:</span>
                          <span className="ml-2 text-gray-900 font-medium">{pkg.token_count}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">{t('tokenPackage.price', 'Price')}:</span>
                          <span className="ml-2 text-gray-900 font-medium">{formatCurrency(pkg.price)}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-500">{t('tokenPackage.validity', 'Validity')}:</span>
                          <span className="ml-2 text-gray-900">
                            {pkg.validity_days} {t('tokenPackage.days', 'days')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <TablePaginationBar
                  page={page}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  className="rounded-lg border border-gray-200 border-t-0 bg-gray-50/80"
                />
              </div>

              {/* Desktop table view */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <TableSortButton
                        label={t('admin.tokenPackages.name', 'Name')}
                        sortKey="name"
                        currentSortKey={sortKey}
                        sortDir={sortDir}
                        onSort={handleSort}
                        className="px-4 py-3 text-left text-xs"
                      />
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('admin.tokenPackages.description', 'Description')}
                      </th>
                      <TableSortButton
                        label={t('tokenPackage.tokens', 'Tokens')}
                        sortKey="token_count"
                        currentSortKey={sortKey}
                        sortDir={sortDir}
                        onSort={handleSort}
                        className="px-4 py-3 text-left text-xs"
                      />
                      <TableSortButton
                        label={t('tokenPackage.price', 'Price')}
                        sortKey="price"
                        currentSortKey={sortKey}
                        sortDir={sortDir}
                        onSort={handleSort}
                        className="px-4 py-3 text-left text-xs"
                      />
                      <TableSortButton
                        label={t('tokenPackage.validity', 'Validity')}
                        sortKey="validity_days"
                        currentSortKey={sortKey}
                        sortDir={sortDir}
                        onSort={handleSort}
                        className="px-4 py-3 text-left text-xs"
                      />
                      <TableSortButton
                        label={t('admin.tokenPackages.status', 'Status')}
                        sortKey="status"
                        currentSortKey={sortKey}
                        sortDir={sortDir}
                        onSort={handleSort}
                        className="px-4 py-3 text-left text-xs"
                      />
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('admin.users.actions', 'Actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedItems.map((pkg) => {
                      const active = pkg.is_active !== false;
                      return (
                        <tr key={pkg.id} className={active ? '' : 'opacity-60'}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{pkg.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 max-w-[260px]">
                            <div className="line-clamp-2">{pkg.description || '-'}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 font-medium">{pkg.token_count}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 font-medium">{formatCurrency(pkg.price)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {pkg.validity_days} {t('tokenPackage.days', 'days')}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
                              }`}
                            >
                              {active
                                ? t('admin.tokenPackages.active', 'Active')
                                : t('admin.tokenPackages.inactive', 'Inactive')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => openEditModal(pkg)}
                                className="text-primary hover:text-primary-dark"
                                title={t('common.edit', 'Edit')}
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleToggleActive(pkg)}
                                className={`${
                                  active
                                    ? 'text-yellow-600 hover:text-yellow-800'
                                    : 'text-green-600 hover:text-green-800'
                                }`}
                                title={t('admin.tokenPackages.toggleActive', 'Toggle Active Status')}
                              >
                                {active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                              </button>
                              <button
                                onClick={() => handleDelete(pkg)}
                                className="text-red-600 hover:text-red-800"
                                title={t('admin.tokenPackages.deletePackage', 'Delete Package')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <TablePaginationBar
                  page={page}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  className="hidden md:flex"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[95vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
              {editing
                ? t('admin.tokenPackages.editPackage', 'Edit Package')
                : t('admin.tokenPackages.createPackage', 'Create Package')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.tokenPackages.name', 'Name')} *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Regular Pack"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.tokenPackages.description', 'Description')}
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={t('admin.tokenPackages.descriptionPlaceholder', 'Short description shown on shop card')}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('tokenPackage.tokens', 'Tokens')} *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    step={1}
                    value={form.token_count}
                    onChange={(e) => setForm({ ...form, token_count: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('tokenPackage.validity', 'Validity')} ({t('tokenPackage.days', 'days')}) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    step={1}
                    value={form.validity_days}
                    onChange={(e) => setForm({ ...form, validity_days: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('tokenPackage.price', 'Price')} (HKD) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="900"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="package_is_active"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="package_is_active" className="ml-2 text-sm text-gray-700">
                  {t('admin.tokenPackages.isActive', 'Active (visible on public page)')}
                </label>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 sm:space-x-3 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="w-full sm:w-auto px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md disabled:opacity-50"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50"
                >
                  {saving
                    ? t('admin.settings.saving', 'Saving...')
                    : editing
                    ? t('admin.users.saveChanges', 'Save Changes')
                    : t('common.create', 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
