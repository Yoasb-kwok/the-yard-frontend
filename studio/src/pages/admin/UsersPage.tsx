import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { formatDate } from '../../lib/utils';
import { Search, Edit, Mail } from 'lucide-react';

interface User {
  id: string;
  full_name: string;
  role: 'student' | 'admin';
  mobile: string | null;
  created_at: string;
  user_tokens: { remaining_tokens: number; expiry_date: string }[];
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

    alert('User updated successfully');
    setEditModal(false);
  }

  async function sendPasswordReset(email: string) {
    // Mock password reset
    alert('Password reset email sent (mock)');
  }

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(search.toLowerCase()) ||
    user.mobile?.includes(search)
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
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search by name or mobile..."
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mobile</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tokens</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user) => {
                  const totalTokens = user.user_tokens.reduce((sum, t) => sum + t.remaining_tokens, 0);
                  return (
                    <tr key={user.id}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.full_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.mobile || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-primary-lighter text-primary-dark'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{totalTokens}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(user.created_at)}</td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => openEditModal(user)}
                          className="text-primary hover:text-primary-dark mr-3"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => sendPasswordReset(user.id)}
                          className="text-gray-600 hover:text-gray-800"
                          title="Send password reset"
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
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Edit User</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                <input
                  type="text"
                  value={editForm.mobile}
                  onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as 'student' | 'admin' })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="student">Student</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setEditModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
