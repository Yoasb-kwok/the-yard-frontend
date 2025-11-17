import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { formatDateTime } from '../../lib/utils';
import { Plus, Calendar } from 'lucide-react';

interface Class {
  id: string;
  name: string;
  instructor: string;
  start_time: string;
  end_time: string;
  capacity: number;
  enrolled_count: number;
  is_internal: boolean;
  is_cancelled: boolean;
}

// Mock data
const MOCK_CLASSES: Class[] = [
  {
    id: '1',
    name: 'Yoga Basics',
    instructor: 'Jane Smith',
    start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
    capacity: 12,
    enrolled_count: 8,
    is_internal: false,
    is_cancelled: false,
  },
  {
    id: '2',
    name: 'Pilates Intermediate',
    instructor: 'John Doe',
    start_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString(),
    capacity: 15,
    enrolled_count: 10,
    is_internal: false,
    is_cancelled: false,
  },
  {
    id: '3',
    name: '補課 - Yoga Basics',
    instructor: 'Jane Smith',
    start_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
    capacity: 5,
    enrolled_count: 3,
    is_internal: true,
    is_cancelled: false,
  },
];

export default function ClassesPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    instructor: '',
    start_time: '',
    end_time: '',
    capacity: 10,
    is_internal: false,
  });

  useEffect(() => {
    loadClasses();
  }, []);

  async function loadClasses() {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    setClasses(MOCK_CLASSES);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const newClass: Class = {
      id: Date.now().toString(),
      name: form.name,
      instructor: form.instructor,
      start_time: form.start_time,
      end_time: form.end_time,
      capacity: form.capacity,
      enrolled_count: 0,
      is_internal: form.is_internal,
      is_cancelled: false,
    };

    setClasses([newClass, ...classes]);
    alert('Class created successfully');
    setShowModal(false);
    setForm({
      name: '',
      instructor: '',
      start_time: '',
      end_time: '',
      capacity: 10,
      is_internal: false,
    });
  }

  async function toggleCancel(classId: string, currentStatus: boolean) {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    setClasses(classes.map(c => 
      c.id === classId 
        ? { ...c, is_cancelled: !currentStatus }
        : c
    ));
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
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Class Management</h1>
          <button
            onClick={() => setShowModal(true)}
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Class
          </button>
        </div>

        <div className="grid gap-4">
          {classes.map((classItem) => (
            <div
              key={classItem.id}
              className={`bg-white rounded-lg shadow-md p-6 ${
                classItem.is_cancelled ? 'opacity-50' : ''
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">{classItem.name}</h3>
                    {classItem.is_internal && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                        補課
                      </span>
                    )}
                    {classItem.is_cancelled && (
                      <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                        Cancelled
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 mb-1">Instructor: {classItem.instructor}</p>
                  <div className="flex items-center text-sm text-gray-600 mb-1">
                    <Calendar className="h-4 w-4 mr-1" />
                    {formatDateTime(classItem.start_time)} - {formatDateTime(classItem.end_time)}
                  </div>
                  <p className="text-sm text-gray-600">
                    Enrolled: {classItem.enrolled_count} / {classItem.capacity}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleCancel(classItem.id, classItem.is_cancelled)}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                      classItem.is_cancelled
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                  >
                    {classItem.is_cancelled ? 'Restore' : 'Cancel'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Class</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instructor</label>
                <input
                  type="text"
                  required
                  value={form.instructor}
                  onChange={(e) => setForm({ ...form, instructor: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input
                  type="datetime-local"
                  required
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input
                  type="datetime-local"
                  required
                  value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_internal"
                  checked={form.is_internal}
                  onChange={(e) => setForm({ ...form, is_internal: e.target.checked })}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="is_internal" className="ml-2 text-sm text-gray-700">
                  Internal Course (補課)
                </label>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                >
                  Create Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
