import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate, formatDateTime, isExpiringSoon } from '../../lib/utils';
import { Calendar, Coins, AlertCircle } from 'lucide-react';

interface UserToken {
  id: string;
  remaining_tokens: number;
  total_tokens: number;
  expiry_date: string;
}

interface UpcomingClass {
  id: string;
  class: {
    name: string;
    instructor: string;
    start_time: string;
    end_time: string;
  };
}

// Mock data
const MOCK_TOKENS: UserToken[] = [
  {
    id: '1',
    remaining_tokens: 5,
    total_tokens: 10,
    expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  },
  {
    id: '2',
    remaining_tokens: 8,
    total_tokens: 8,
    expiry_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  },
];

const MOCK_UPCOMING_CLASSES: UpcomingClass[] = [
  {
    id: '1',
    class: {
      name: 'Yoga Basics',
      instructor: 'Jane Smith',
      start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
    },
  },
  {
    id: '2',
    class: {
      name: 'Pilates Intermediate',
      instructor: 'John Doe',
      start_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString(),
    },
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [tokens, setTokens] = useState<UserToken[]>([]);
  const [upcomingClasses, setUpcomingClasses] = useState<UpcomingClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  async function loadData() {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    setTokens(MOCK_TOKENS);
    setUpcomingClasses(MOCK_UPCOMING_CLASSES);
    setLoading(false);
  }

  const totalTokens = tokens.reduce((sum, t) => sum + t.remaining_tokens, 0);
  const expiringTokens = tokens.filter(t => isExpiringSoon(t.expiry_date));

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
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Token Balance</h2>
              <Coins className="h-8 w-8 text-yellow-500" />
            </div>
            <div className="text-4xl font-bold text-gray-900 mb-2">{totalTokens}</div>
            <p className="text-gray-600 text-sm">Available tokens</p>

            {expiringTokens.length > 0 && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-3 flex items-start">
                <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  {expiringTokens.length} token package{expiringTokens.length > 1 ? 's' : ''} expiring soon
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Upcoming Classes</h2>
              <Calendar className="h-8 w-8 text-primary" />
            </div>
            <div className="text-4xl font-bold text-gray-900 mb-2">{upcomingClasses.length}</div>
            <p className="text-gray-600 text-sm">Classes scheduled</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Token Packages</h2>
          {tokens.length === 0 ? (
            <p className="text-gray-600">No active token packages</p>
          ) : (
            <div className="space-y-3">
              {tokens.map((token) => (
                <div
                  key={token.id}
                  className="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {token.remaining_tokens} / {token.total_tokens} tokens
                    </div>
                    <div className="text-sm text-gray-600">
                      Expires: {formatDate(token.expiry_date)}
                    </div>
                  </div>
                  {isExpiringSoon(token.expiry_date) && (
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                      Expiring Soon
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Upcoming Classes</h2>
          {upcomingClasses.length === 0 ? (
            <p className="text-gray-600">No upcoming classes scheduled</p>
          ) : (
            <div className="space-y-3">
              {upcomingClasses.map((enrollment) => (
                <div
                  key={enrollment.id}
                  className="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-900">{enrollment.class.name}</div>
                    <div className="text-sm text-gray-600">
                      with {enrollment.class.instructor}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDateTime(enrollment.class.start_time)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
