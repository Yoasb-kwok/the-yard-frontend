import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { formatDateTime } from '../../lib/utils';
import { Calendar } from 'lucide-react';

interface Enrollment {
  id: string;
  status: string;
  class: {
    id: string;
    name: string;
    instructor: string;
    start_time: string;
    end_time: string;
  };
}

// Mock data
const MOCK_ENROLLMENTS: Enrollment[] = [
  {
    id: '1',
    status: 'enrolled',
    class: {
      id: '1',
      name: 'Yoga Basics',
      instructor: 'Jane Smith',
      start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
    },
  },
  {
    id: '2',
    status: 'enrolled',
    class: {
      id: '2',
      name: 'Pilates Intermediate',
      instructor: 'John Doe',
      start_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString(),
    },
  },
  {
    id: '3',
    status: 'enrolled',
    class: {
      id: '3',
      name: '補課 - Yoga Basics',
      instructor: 'Jane Smith',
      start_time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
    },
  },
];

export default function SchedulePage() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadSchedule();
    }
  }, [user]);

  async function loadSchedule() {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    setEnrollments(MOCK_ENROLLMENTS);
    setLoading(false);
  }

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
        <h1 className="text-3xl font-bold text-gray-900">My Schedule</h1>

        {enrollments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No upcoming classes scheduled</p>
          </div>
        ) : (
          <div className="space-y-4">
            {enrollments.map((enrollment) => (
              <div key={enrollment.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {enrollment.class.name}
                    </h3>
                    <p className="text-gray-600 mb-1">
                      Instructor: {enrollment.class.instructor}
                    </p>
                    <p className="text-gray-600 mb-1">
                      Start: {formatDateTime(enrollment.class.start_time)}
                    </p>
                    <p className="text-gray-600">
                      End: {formatDateTime(enrollment.class.end_time)}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded text-sm font-medium ${
                    enrollment.status === 'enrolled'
                      ? 'bg-primary-lighter text-primary-dark'
                      : enrollment.status === 'attended'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {enrollment.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
