import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { formatDate } from '../../lib/utils';
import { Search, Edit, Mail, Calendar, Package, Receipt, Clock } from 'lucide-react';

interface UserToken {
  remaining_tokens: number;
  expiry_date: string;
  id?: string;
}

interface User {
  id: string;
  full_name: string;
  role: 'student' | 'admin';
  mobile: string | null;
  created_at: string;
  user_tokens: UserToken[];
}

// Mock data
const MOCK_USERS: User[] = [
  {
    id: 'admin-001',
    full_name: 'Admin User',
    role: 'admin',
    mobile: '12345678',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    user_tokens: [],
  },
  {
    id: 'student-001',
    full_name: 'Student User',
    role: 'student',
    mobile: '87654321',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    user_tokens: [
      { remaining_tokens: 5, expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
    ],
  },
  {
    id: 'student-002',
    full_name: 'John Doe',
    role: 'student',
    mobile: '98765432',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    user_tokens: [
      { remaining_tokens: 2, expiry_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
    ],
  },
  {
    id: 'student-003',
    full_name: 'Jane Smith',
    role: 'student',
    mobile: '91234567',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    user_tokens: [
      { remaining_tokens: 8, expiry_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
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
    role: 'student' as 'student' | 'admin',
  });
  const [tokenExpiryModal, setTokenExpiryModal] = useState(false);
  const [selectedUserForTokenEdit, setSelectedUserForTokenEdit] = useState<User | null>(null);
  const [tokenExpiryForm, setTokenExpiryForm] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    setUsers(MOCK_USERS);
    setLoading(false);
  }

  function openEditModal(user: User) {
    setSelectedUser(user);
    setEditForm({
      full_name: user.full_name,
      mobile: user.mobile || '',
      role: user.role,
    });
    setEditModal(true);
  }

  async function handleUpdate() {
    if (!selectedUser) return;

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // Update local state
    setUsers(users.map(u => 
      u.id === selectedUser.id 
        ? { ...u, ...editForm }
        : u
    ));

    alert(t('admin.users.userUpdated'));
    setEditModal(false);
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

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // Update local state
    const updatedTokens = selectedUserForTokenEdit.user_tokens.map((token, index) => ({
      ...token,
      expiry_date: tokenExpiryForm[index] || token.expiry_date,
    }));

    setUsers(users.map(u => 
      u.id === selectedUserForTokenEdit.id 
        ? { ...u, user_tokens: updatedTokens }
        : u
    ));

    alert(t('admin.users.tokenExpiryDateUpdated'));
    setTokenExpiryModal(false);
    setSelectedUserForTokenEdit(null);
    setTokenExpiryForm({});
  }

  const filteredUsers = users.filter(user =>
    user.role === 'student' &&
    (user.full_name.toLowerCase().includes(search.toLowerCase()) ||
    user.mobile?.includes(search))
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">{t('admin.users.title')}</h1>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder={t('admin.users.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.users.name')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.users.mobile')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.users.tokens')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.users.tokenExpiryDate')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.users.joined')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.users.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user) => {
                  const totalTokens = user.user_tokens.reduce((sum, t) => sum + t.remaining_tokens, 0);
                  const earliestExpiry = getEarliestExpiryDate(user.user_tokens);
                  return (
                    <tr key={user.id}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.full_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.mobile || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{totalTokens}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <span>
                            {earliestExpiry ? formatDate(earliestExpiry, i18n.language === 'zh-CN' ? 'zh-CN' : i18n.language === 'zh-TW' ? 'zh-TW' : 'en-US') : '-'}
                          </span>
                          {earliestExpiry && (
                            <button
                              onClick={() => openTokenExpiryModal(user)}
                              className="text-primary hover:text-primary-dark"
                              title={t('admin.users.editTokenExpiryDate')}
                            >
                              <Calendar className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(user.created_at, i18n.language === 'zh-CN' ? 'zh-CN' : i18n.language === 'zh-TW' ? 'zh-TW' : 'en-US')}</td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => openEditModal(user)}
                          className="text-primary hover:text-primary-dark mr-3"
                          title={t('admin.users.edit')}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        {totalTokens > 0 && (
                          <button
                            onClick={() => navigate(`/admin/users/${user.id}/assign-tokens`)}
                            className="text-green-600 hover:text-green-800 mr-3"
                            title={t('admin.users.assignTokens')}
                          >
                            <Package className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/admin/users/${user.id}/purchase-history`)}
                          className="text-blue-600 hover:text-blue-800 mr-3"
                          title={t('admin.users.purchaseHistory')}
                        >
                          <Receipt className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/admin/users/${user.id}/schedule`)}
                          className="text-purple-600 hover:text-purple-800 mr-3"
                          title={t('admin.users.upcomingClasses')}
                        >
                          <Clock className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => sendPasswordReset(user.id)}
                          className="text-gray-600 hover:text-gray-800"
                          title={t('admin.users.passwordReset')}
                        >
                          <Mail className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.users.role')}</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as 'student' | 'admin' })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="student">{t('admin.users.student')}</option>
                  <option value="admin">{t('admin.users.admin')}</option>
                </select>
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
                        {formatDate(token.expiry_date, i18n.language === 'zh-CN' ? 'zh-CN' : i18n.language === 'zh-TW' ? 'zh-TW' : 'en-US')}
                      </p>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('admin.users.newExpiryDate')}
                      </label>
                      <input
                        type="date"
                        value={tokenExpiryForm[index] || ''}
                        onChange={(e) => setTokenExpiryForm({ ...tokenExpiryForm, [index]: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
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
