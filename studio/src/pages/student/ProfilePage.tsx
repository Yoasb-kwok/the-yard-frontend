import { useState } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { User } from 'lucide-react';

export default function ProfilePage() {
  const { profile } = useAuth();
  const [message, setMessage] = useState('');

  if (!profile) return null;

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded">
            {message}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-6">
            <div className="bg-primary-lighter rounded-full p-4 mr-4">
              <User className="h-12 w-12 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">{profile.full_name}</h2>
              <p className="text-gray-600">{profile.role}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <div className="px-3 py-2 border rounded-md bg-gray-50">{profile.full_name}</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
              <div className="px-3 py-2 border rounded-md bg-gray-50">
                {profile.mobile || 'Not provided'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID (First 4 Digits)</label>
              <div className="px-3 py-2 border rounded-md bg-gray-50">
                {profile.id_first_four || 'Not provided'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
