import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import PageLoading from '../../components/PageLoading';
import LoadErrorBanner from '../../components/LoadErrorBanner';
import EmptyState from '../../components/EmptyState';
import { formatDate, formatDateTime, formatMobileForDisplay } from '../../lib/utils';
import { api } from '../../lib/api';
import { isDemoMode } from '../../lib/mock';
import { Search, Edit, Mail, Calendar, Package, Receipt, Clock, Download, Send } from 'lucide-react';
import DateSelect from '../../components/DateSelect';
import { TableSortButton } from '../../components/TableSortButton';
import { TablePaginationBar, useTablePagination } from '../../components/TablePagination';

interface UserToken {
  remaining_tokens: number;
  expiry_date: string;
  id?: string;
}

interface User {
  id: string;
  /** 帳戶編號（如學員編號 student_id） */
  account_number: string | null;
  full_name: string;
  /** 用戶名（登入識別，常為用戶顯示名或電郵 @ 前綴） */
  username: string | null;
  email: string | null;
  mobile: string | null;
  id_card_last4: string | null;
  role: 'student' | 'admin';
  created_at: string;
  user_tokens: UserToken[];
}

function normalizeUserTokens(raw: unknown): UserToken[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((t: { id?: unknown; remaining_tokens?: unknown; balance?: unknown; expiry_date?: unknown; expires_at?: unknown }) => {
    const exp =
      typeof t.expiry_date === 'string'
        ? t.expiry_date.slice(0, 10)
        : typeof t.expires_at === 'string'
          ? t.expires_at.slice(0, 10)
          : '';
    return {
      id: t.id != null ? String(t.id) : undefined,
      remaining_tokens: Number(t.remaining_tokens ?? t.balance ?? 0),
      expiry_date: exp,
    };
  });
}

// Mock data
const MOCK_USERS: User[] = [
  {
    id: 'student-001',
    account_number: 'MOCK-STD-001',
    full_name: 'Student User',
    username: 'student001',
    email: 'student.user@example.com',
    role: 'student',
    mobile: '87654321',
    id_card_last4: '1001',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    user_tokens: [
      { id: 'ut-m1', remaining_tokens: 5, expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
    ],
  },
  {
    id: 'student-002',
    account_number: 'MOCK-STD-002',
    full_name: 'John Doe',
    username: 'jdoe',
    email: 'john.doe@example.com',
    role: 'student',
    mobile: '98765432',
    id_card_last4: '2002',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    user_tokens: [
      { id: 'ut-m2', remaining_tokens: 2, expiry_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
    ],
  },
  {
    id: 'student-003',
    account_number: 'MOCK-STD-003',
    full_name: 'Jane Smith',
    username: 'jsmith',
    email: 'jane.smith@example.com',
    role: 'student',
    mobile: '91234567',
    id_card_last4: null,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    user_tokens: [
      { id: 'ut-m3', remaining_tokens: 8, expiry_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
    ],
  },
];

export default function UsersPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    mobile: '',
  });
  const [tokenExpiryModal, setTokenExpiryModal] = useState(false);
  const [selectedUserForTokenEdit, setSelectedUserForTokenEdit] = useState<User | null>(null);
  const [tokenExpiryForm, setTokenExpiryForm] = useState<{ [key: number]: string }>({});
  const [sortKey, setSortKey] = useState<string | null>('full_name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (sortKey === 'id_card_last4') setSortKey('full_name');
  }, [sortKey]);

  function getListLocale(): string {
    return i18n.language === 'zh-CN' ? 'zh-CN' : i18n.language === 'zh-TW' ? 'zh-TW' : 'en-US';
  }

  /** Match adminRoute / DB: role string or numeric admin flag on list rows. */
  function isExcludedAdminOrInstructorRole(role: unknown): boolean {
    if (role === 'admin' || role === 1 || role === '1') return true;
    if (role === 'instructor' || role === 'Instructor') return true;
    return false;
  }

  function normalizeUser(raw: Record<string, unknown>): User {
    const role = raw.role === 'admin' || raw.role === 1 || raw.role === '1' ? 'admin' : 'student';
    const email = raw.email != null ? String(raw.email) : null;
    const nick = typeof raw.nick_name === 'string' ? raw.nick_name.trim() : '';
    const usernameRaw = raw.username != null ? String(raw.username).trim() : '';
    const usernameFromEmail =
      email && email.includes('@') ? email.split('@')[0] : email && email.length > 0 ? email : '';
    const username =
      usernameRaw.length > 0 ? usernameRaw : nick.length > 0 ? nick : usernameFromEmail || null;
    const acct =
      raw.student_id != null && String(raw.student_id).length > 0
        ? String(raw.student_id)
        : raw.account_number != null && String(raw.account_number).length > 0
          ? String(raw.account_number)
          : null;
    const idLast =
      raw.id_last_four != null
        ? String(raw.id_last_four)
        : raw.id_card_last4 != null
          ? String(raw.id_card_last4)
          : raw.hkid_last4 != null
            ? String(raw.hkid_last4)
            : null;
    return {
      id: String(raw.id),
      account_number: acct,
      full_name: (raw.full_name as string) ?? (raw.name as string) ?? '',
      username: username || null,
      email,
      mobile: raw.mobile != null ? String(raw.mobile) : null,
      id_card_last4: idLast,
      role,
      created_at: (raw.created_at as string) ?? new Date().toISOString(),
      user_tokens: normalizeUserTokens(raw.user_tokens),
    };
  }

  async function loadUsers() {
    try {
      setLoading(true);
      setLoadError(null);
      // Real backend: GET /api/admin/users (see vite proxy → localhost:3002). No ?demo=1 required.
      const response = await api.get<any[]>('/admin/users');
      if (response.success && Array.isArray(response.data)) {
        setUsers(
          response.data
            .filter((u: { role?: unknown }) => !isExcludedAdminOrInstructorRole(u.role))
            .map((u: Record<string, unknown>) => normalizeUser(u))
        );
      } else {
        setUsers([]);
        if (!response.success) {
          const m = response.msg?.trim() || response.message?.trim();
          if (m) setLoadError(m);
        }
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setLoadError(error instanceof Error ? error.message : '無法載入用戶列表');
      // Only use embedded mock when running in demo mode; otherwise show empty + error so stale mock is not mistaken for live DB.
      setUsers(isDemoMode() ? MOCK_USERS : []);
    } finally {
      setLoading(false);
    }
  }

  function openEditModal(user: User) {
    setSelectedUser(user);
    setEditForm({
      full_name: user.full_name,
      mobile: user.mobile || '',
    });
    setEditModal(true);
  }

  async function handleUpdate() {
    if (!selectedUser) return;

    const first = window.confirm(t('admin.users.confirmUpdateUser'));
    if (!first) return;
    const second = window.confirm(t('admin.users.confirmUpdateUserAgain'));
    if (!second) return;

    try {
      const response = await api.patch(`/admin/users/${selectedUser.id}`, {
        full_name: editForm.full_name,
        mobile: editForm.mobile,
        role: 'student',
      });

      if (response.success) {
        setUsers(
          users.map((u) =>
            u.id === selectedUser.id
              ? { ...u, full_name: editForm.full_name, mobile: editForm.mobile || null, role: 'student' as const }
              : u
          )
        );
        alert(t('admin.users.userUpdated'));
        setEditModal(false);
      } else {
        throw new Error(response.msg || 'Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert(error instanceof Error ? error.message : 'Failed to update user');
    }
  }

  async function sendPasswordReset(email: string) {
    // Mock password reset
    alert(t('admin.users.passwordResetSent'));
  }

  function getEarliestExpiryDate(userTokens: UserToken[]): string | null {
    if (!userTokens || userTokens.length === 0) return null;
    const validTokens = userTokens.filter(t => t.remaining_tokens > 0);
    if (validTokens.length === 0) return null;
    const dates = validTokens.map(t => new Date(t.expiry_date));
    const earliestDate = new Date(Math.min(...dates.map(d => d.getTime())));
    return earliestDate.toISOString().split('T')[0];
  }

  function openTokenExpiryModal(user: User) {
    setSelectedUserForTokenEdit(user);
    const formData: { [key: number]: string } = {};
    user.user_tokens.forEach((token, index) => {
      formData[index] = token.expiry_date;
    });
    setTokenExpiryForm(formData);
    setTokenExpiryModal(true);
  }

  async function handleTokenExpiryUpdate() {
    if (!selectedUserForTokenEdit) return;

    try {
      // Update each token that has been modified
      const updatePromises = selectedUserForTokenEdit.user_tokens.map(async (token, index) => {
        const newExpiryDate = tokenExpiryForm[index];
        if (newExpiryDate && newExpiryDate !== token.expiry_date && token.id) {
          return api.patch(`/admin/user-tokens/${token.id}`, {
            expiry_date: newExpiryDate,
          });
        }
        return Promise.resolve(null);
      });

      await Promise.all(updatePromises);

      // Reload users to get updated data
      await loadUsers();

      alert(t('admin.users.tokenExpiryDateUpdated'));
      setTokenExpiryModal(false);
      setSelectedUserForTokenEdit(null);
      setTokenExpiryForm({});
    } catch (error) {
      console.error('Error updating token expiry:', error);
      alert(error instanceof Error ? error.message : 'Failed to update token expiry date');
    }
  }

  const filteredUsers = users.filter((user) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      user.full_name.toLowerCase().includes(q) ||
      (user.mobile?.toLowerCase().includes(q) ?? false) ||
      (user.email?.toLowerCase().includes(q) ?? false) ||
      (user.username?.toLowerCase().includes(q) ?? false) ||
      (user.account_number?.toLowerCase().includes(q) ?? false) ||
      (user.id_card_last4?.includes(search.trim()) ?? false)
    );
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const sk = sortKey === 'id_card_last4' ? 'full_name' : sortKey;
    if (!sk) return 0;
    let cmp = 0;
    const tokenSum = (u: User) => u.user_tokens.reduce((s, t) => s + (t.remaining_tokens || 0), 0);
    const earliest = (u: User) => getEarliestExpiryDate(u.user_tokens);
    if (sk === 'account_number') {
      cmp = (a.account_number || '').localeCompare(b.account_number || '', undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    } else if (sk === 'full_name') {
      cmp = (a.full_name || '').localeCompare(b.full_name || '', undefined, { sensitivity: 'base' });
    } else if (sk === 'username') {
      cmp = (a.username || '').localeCompare(b.username || '', undefined, { sensitivity: 'base' });
    } else if (sk === 'mobile') {
      cmp = (a.mobile || '').localeCompare(b.mobile || '', undefined, { sensitivity: 'base' });
    } else if (sk === 'email') {
      cmp = (a.email || '').localeCompare(b.email || '', undefined, { sensitivity: 'base' });
    } else if (sk === 'remaining_tokens') {
      cmp = tokenSum(a) - tokenSum(b);
    } else if (sk === 'token_expiry') {
      const ea = earliest(a);
      const eb = earliest(b);
      if (!ea && !eb) cmp = 0;
      else if (!ea) cmp = 1;
      else if (!eb) cmp = -1;
      else cmp = new Date(ea).getTime() - new Date(eb).getTime();
    } else if (sk === 'created_at') {
      cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const {
    page: usersPage,
    setPage: setUsersPage,
    totalPages: usersTotalPages,
    pageSize: usersPageSize,
    totalItems: usersTotalItems,
    paginatedItems: paginatedUsers,
  } = useTablePagination(sortedUsers, undefined, [search]);

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllOnPage() {
    const ids = paginatedUsers.map((u) => u.id);
    const allOnPageSelected = ids.length > 0 && ids.every((id) => selectedIds.has(id));
    if (allOnPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
    }
  }

  function exportCsv() {
    const loc = getListLocale();
    const headers = [
      t('admin.users.colAccountNumber'),
      t('admin.users.colFullName'),
      t('admin.users.colUsername'),
      t('admin.users.colMobile'),
      t('admin.users.colEmail'),
      t('admin.users.colRemainingTokens'),
      t('admin.users.colTokenExpiry'),
      t('admin.users.colJoinedAt'),
    ];
    const rows = sortedUsers.map((u) => {
      const tokens = u.user_tokens.reduce((s, t) => s + t.remaining_tokens, 0);
      const expiry = getEarliestExpiryDate(u.user_tokens);
      return [
        u.account_number || '',
        u.full_name,
        u.username || '',
        formatMobileForDisplay(u.mobile, ''),
        u.email || '',
        String(tokens),
        expiry ? formatDate(expiry, loc) : '',
        formatDateTime(u.created_at, loc),
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function bulkSendReminder() {
    const n = selectedIds.size;
    if (n === 0) return;
    setBulkMessage(t('admin.users.reminderSent', { count: n }));
    setTimeout(() => setBulkMessage(null), 4000);
  }

  if (loading) {
    return (
      <Layout>
        <PageLoading message={t('admin.users.loading', '載入用戶列表中…')} />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {loadError && (
          <LoadErrorBanner message={loadError} onRetry={() => { setLoadError(null); loadUsers(); }} />
        )}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">{t('admin.users.title')}</h1>
        </div>
        <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
          {t('admin.users.accountMembersHint')}
        </p>

        <div className="bg-white rounded-lg shadow-md p-6">
          {bulkMessage && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-green-800 text-sm">
              {bulkMessage}
            </div>
          )}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder={t('admin.users.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              {t('admin.users.exportCsv')}
            </button>
            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={bulkSendReminder}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-dark"
              >
                <Send className="h-4 w-4" />
                {t('admin.users.bulkSendReminder', { count: selectedIds.size })}
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse text-xs">
              <colgroup>
                <col className="w-9" />
                <col className="w-[9%]" />
                <col className="w-[11%]" />
                <col className="w-[8%]" />
                <col className="w-[9%]" />
                <col className="w-[20%]" />
                <col className="w-[6%]" />
                <col className="w-[9%]" />
                <col className="w-[11%]" />
                <col className="w-[152px]" />
              </colgroup>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-1.5 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={
                        paginatedUsers.length > 0 &&
                        paginatedUsers.every((u) => selectedIds.has(u.id))
                      }
                      onChange={toggleSelectAllOnPage}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </th>
                  <TableSortButton label={t('admin.users.colAccountNumber')} sortKey="account_number" currentSortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="px-2 py-3 text-left font-medium text-gray-500 uppercase whitespace-nowrap [&_svg]:h-3.5 [&_svg]:w-3.5" />
                  <TableSortButton label={t('admin.users.colFullName')} sortKey="full_name" currentSortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="px-2 py-3 text-left font-medium text-gray-500 uppercase whitespace-nowrap [&_svg]:h-3.5 [&_svg]:w-3.5" />
                  <TableSortButton label={t('admin.users.colUsername')} sortKey="username" currentSortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="px-2 py-3 text-left font-medium text-gray-500 uppercase whitespace-nowrap [&_svg]:h-3.5 [&_svg]:w-3.5" />
                  <TableSortButton label={t('admin.users.colMobile')} sortKey="mobile" currentSortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="px-2 py-3 text-left font-medium text-gray-500 uppercase whitespace-nowrap [&_svg]:h-3.5 [&_svg]:w-3.5" />
                  <TableSortButton label={t('admin.users.colEmail')} sortKey="email" currentSortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="px-2 py-3 text-left font-medium text-gray-500 uppercase whitespace-nowrap [&_svg]:h-3.5 [&_svg]:w-3.5" />
                  <TableSortButton label={t('admin.users.colRemainingTokens')} sortKey="remaining_tokens" currentSortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="px-2 py-3 text-left font-medium text-gray-500 uppercase whitespace-nowrap [&_svg]:h-3.5 [&_svg]:w-3.5" />
                  <TableSortButton label={t('admin.users.colTokenExpiry')} sortKey="token_expiry" currentSortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="px-2 py-3 text-left font-medium text-gray-500 uppercase whitespace-nowrap [&_svg]:h-3.5 [&_svg]:w-3.5" />
                  <TableSortButton
                    label={t('admin.users.colJoinedAt')}
                    sortKey="created_at"
                    currentSortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                    className="px-2 py-3 text-left font-medium text-gray-500 uppercase whitespace-nowrap [&_svg]:h-3.5 [&_svg]:w-3.5"
                  />
                  <th className="px-2 py-3 text-right font-medium text-gray-500 uppercase whitespace-nowrap w-[152px]">
                    {t('admin.users.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-2 py-12">
                      <EmptyState message={t('admin.users.noUsers', '暫無用戶')} />
                    </td>
                  </tr>
                ) : (
                paginatedUsers.map((user) => {
                  const totalTokens = user.user_tokens.reduce((sum, t) => sum + t.remaining_tokens, 0);
                  const earliestExpiry = getEarliestExpiryDate(user.user_tokens);
                  return (
                    <tr key={user.id}>
                      <td className="px-1.5 py-3 align-middle">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(user.id)}
                          onChange={() => toggleSelect(user.id)}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </td>
                      <td className="px-2 py-3 text-gray-600 min-w-0">
                        <div className="truncate" title={user.account_number || undefined}>
                          {user.account_number || '–'}
                        </div>
                      </td>
                      <td className="px-2 py-3 font-medium text-gray-900 min-w-0">
                        <div className="truncate" title={user.full_name}>
                          {user.full_name}
                        </div>
                      </td>
                      <td className="px-2 py-3 text-gray-600 min-w-0">
                        <div className="truncate" title={user.username || undefined}>
                          {user.username || '–'}
                        </div>
                      </td>
                      <td
                        className="px-2 py-3 text-gray-600 whitespace-nowrap tabular-nums"
                        title={user.mobile || undefined}
                      >
                        {formatMobileForDisplay(user.mobile)}
                      </td>
                      <td className="px-2 py-3 text-gray-600 min-w-0">
                        <div className="truncate" title={user.email || undefined}>
                          {user.email || '–'}
                        </div>
                      </td>
                      <td className="px-2 py-3 text-gray-600 whitespace-nowrap text-center tabular-nums">{totalTokens}</td>
                      <td className="px-2 py-3 text-gray-600 whitespace-nowrap">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="truncate min-w-0">
                            {earliestExpiry ? formatDate(earliestExpiry, getListLocale()) : '–'}
                          </span>
                          {earliestExpiry && (
                            <button
                              type="button"
                              onClick={() => openTokenExpiryModal(user)}
                              className="text-primary hover:text-primary-dark shrink-0 p-0.5"
                              title={t('admin.users.editTokenExpiryDate')}
                            >
                              <Calendar className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td
                        className="px-2 py-3 text-gray-600 min-w-0 align-middle"
                        title={formatDateTime(user.created_at, getListLocale())}
                      >
                        <div className="truncate text-xs tabular-nums leading-snug">
                          {formatDateTime(user.created_at, getListLocale())}
                        </div>
                      </td>
                      <td className="px-2 py-3 w-[152px] align-middle">
                        <div className="flex flex-nowrap items-center justify-end gap-0.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(user)}
                            className="text-primary hover:text-primary-dark p-0.5 inline-flex shrink-0"
                            title={t('admin.users.edit')}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          {totalTokens > 0 && (
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/users/${user.id}/assign-tokens`)}
                              className="text-green-600 hover:text-green-800 p-0.5 inline-flex shrink-0"
                              title={t('admin.users.assignTokens')}
                            >
                              <Package className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/users/${user.id}/purchase-history`)}
                            className="text-blue-600 hover:text-blue-800 p-0.5 inline-flex shrink-0"
                            title={t('admin.users.purchaseHistory')}
                          >
                            <Receipt className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/users/${user.id}/schedule`)}
                            className="text-purple-600 hover:text-purple-800 p-0.5 inline-flex shrink-0"
                            title={t('admin.users.upcomingClasses')}
                          >
                            <Clock className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => sendPasswordReset(user.id)}
                            className="text-gray-600 hover:text-gray-800 p-0.5 inline-flex shrink-0"
                            title={t('admin.users.passwordReset')}
                          >
                            <Mail className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
                )}
              </tbody>
            </table>
            <TablePaginationBar
              page={usersPage}
              totalPages={usersTotalPages}
              totalItems={usersTotalItems}
              pageSize={usersPageSize}
              onPageChange={setUsersPage}
            />
          </div>
        </div>
      </div>

      {editModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('admin.users.editUser')}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.users.fullName')}</label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.users.mobile')}</label>
                <input
                  type="text"
                  value={editForm.mobile}
                  onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setEditModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleUpdate}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
              >
                {t('admin.users.saveChanges')}
              </button>
            </div>
          </div>
        </div>
      )}

      {tokenExpiryModal && selectedUserForTokenEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {t('admin.users.editTokenExpiryDateTitle', { name: selectedUserForTokenEdit.full_name })}
            </h2>
            
            {selectedUserForTokenEdit.user_tokens.length === 0 ? (
              <p className="text-gray-500 py-4">{t('admin.users.noTokens')}</p>
            ) : (
              <div className="space-y-4">
                {selectedUserForTokenEdit.user_tokens.map((token, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-500">
                          {t('admin.users.remainingTokens')}: {token.remaining_tokens}
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('admin.users.currentExpiryDate')}
                      </label>
                      <p className="text-sm text-gray-600 mb-2">
                        {formatDate(token.expiry_date, getListLocale())}
                      </p>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('admin.users.newExpiryDate')}
                      </label>
                      <DateSelect
                        value={tokenExpiryForm[index] || ''}
                        onChange={(v) => setTokenExpiryForm({ ...tokenExpiryForm, [index]: v })}
                        className="w-full"
                        ariaLabel={t('admin.users.newExpiryDate')}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setTokenExpiryModal(false);
                  setSelectedUserForTokenEdit(null);
                  setTokenExpiryForm({});
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                {t('common.cancel')}
              </button>
              {selectedUserForTokenEdit.user_tokens.length > 0 && (
                <button
                  onClick={handleTokenExpiryUpdate}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                >
                  {t('admin.users.saveChanges')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
