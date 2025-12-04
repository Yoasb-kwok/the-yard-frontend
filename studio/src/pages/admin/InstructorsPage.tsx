import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { formatDate } from '../../lib/utils';
import { Plus, Edit, Trash2, User, Upload, X } from 'lucide-react';

interface Instructor {
  id: string;
  name: string;
  profile_image_url: string | null;
  created_at: string;
}

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
  location?: 'sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui';
}

// Mock classes data (in a real app, this would come from an API)
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
    location: 'sanpokong',
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
    location: 'causewaybay',
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
    location: 'fotan',
  },
  {
    id: '4',
    name: 'Morning Yoga',
    instructor: 'Jane Smith',
    start_time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
    capacity: 10,
    enrolled_count: 7,
    is_internal: false,
    is_cancelled: false,
    location: 'sanpokong',
  },
];

// Mock data
const MOCK_INSTRUCTORS: Instructor[] = [
  {
    id: '1',
    name: 'Jane Smith',
    profile_image_url: 'https://ui-avatars.com/api/?name=Jane+Smith&size=128&background=007257&color=fff&bold=true',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    name: 'John Doe',
    profile_image_url: 'https://ui-avatars.com/api/?name=John+Doe&size=128&background=2563eb&color=fff&bold=true',
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    name: 'Sarah Johnson',
    profile_image_url: 'https://ui-avatars.com/api/?name=Sarah+Johnson&size=128&background=7c3aed&color=fff&bold=true',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function InstructorsPage() {
  const { t, i18n } = useTranslation();
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState<Instructor | null>(null);
  const [form, setForm] = useState({
    name: '',
    profile_image_url: '',
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    loadInstructors();
    loadClasses();
  }, []);

  async function loadInstructors() {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    setInstructors(MOCK_INSTRUCTORS);
    setLoading(false);
  }

  async function loadClasses() {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));
    setClasses(MOCK_CLASSES);
  }

  function getUpcomingClassesCount(instructorName: string): number {
    const now = new Date();
    return classes.filter(c => 
      c.instructor === instructorName && 
      !c.is_cancelled && 
      new Date(c.start_time) > now
    ).length;
  }

  function openCreateModal() {
    setEditingInstructor(null);
    setForm({ name: '', profile_image_url: '' });
    setImagePreview(null);
    setShowModal(true);
  }

  function openEditModal(instructor: Instructor) {
    setEditingInstructor(instructor);
    setForm({
      name: instructor.name,
      profile_image_url: instructor.profile_image_url || '',
    });
    setImagePreview(instructor.profile_image_url || null);
    setShowModal(true);
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      // In a real app, you would upload the file to a storage service
      // For now, we'll create a local preview
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        setForm({ ...form, profile_image_url: result });
      };
      reader.readAsDataURL(file);
    }
  }

  function removeImage() {
    setImagePreview(null);
    setForm({ ...form, profile_image_url: '' });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));

    if (editingInstructor) {
      // Update existing instructor
      setInstructors(instructors.map(inst =>
        inst.id === editingInstructor.id
          ? { ...inst, name: form.name, profile_image_url: form.profile_image_url || null }
          : inst
      ));
      alert(t('admin.instructors.instructorUpdated'));
    } else {
      // Create new instructor
      const newInstructor: Instructor = {
        id: Date.now().toString(),
        name: form.name,
        profile_image_url: form.profile_image_url || null,
        created_at: new Date().toISOString(),
      };
      setInstructors([...instructors, newInstructor]);
      alert(t('admin.instructors.instructorCreated'));
    }

    setShowModal(false);
    setForm({ name: '', profile_image_url: '' });
    setImagePreview(null);
  }

  async function handleDelete(id: string) {
    if (!confirm(t('admin.instructors.confirmDelete'))) {
      return;
    }

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));
    setInstructors(instructors.filter(inst => inst.id !== id));
    alert(t('admin.instructors.instructorDeleted'));
  }

  // Generate avatar URL from name if no image
  const getAvatarUrl = (instructor: Instructor): string => {
    if (instructor.profile_image_url) {
      return instructor.profile_image_url;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(instructor.name)}&size=128&background=007257&color=fff&bold=true`;
  };

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
          <h1 className="text-3xl font-bold text-gray-900">{t('admin.instructors.title')}</h1>
          <button
            onClick={openCreateModal}
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            {t('admin.instructors.addInstructor')}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {instructors.length === 0 ? (
            <div className="p-12 text-center">
              <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">{t('admin.instructors.noInstructors')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.instructors.instructor')}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.instructors.upcomingClasses')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.instructors.createdAt')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.instructors.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {instructors.map((instructor) => {
                    const upcomingCount = getUpcomingClassesCount(instructor.name);
                    return (
                      <tr key={instructor.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <img
                              src={getAvatarUrl(instructor)}
                              alt={instructor.name}
                              className="h-10 w-10 rounded-full object-cover border-2 border-gray-200 mr-3"
                            />
                            <div className="text-sm font-medium text-gray-900">{instructor.name}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          {upcomingCount > 0 ? (
                            <span className="text-sm font-medium text-gray-900">
                              {upcomingCount}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(instructor.created_at, i18n.language === 'zh-CN' ? 'zh-CN' : i18n.language === 'zh-TW' ? 'zh-TW' : 'en-US')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(instructor)}
                              className="text-primary hover:text-primary-dark p-1"
                              title={t('admin.instructors.edit')}
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(instructor.id)}
                              className="text-red-600 hover:text-red-800 p-1"
                              title={t('admin.instructors.delete')}
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
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {editingInstructor ? t('admin.instructors.editInstructor') : t('admin.instructors.addInstructor')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Profile Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin.instructors.profileImage')}
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {imagePreview ? (
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-24 h-24 rounded-full object-cover border-4 border-gray-100"
                        />
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border-4 border-gray-200">
                        <User className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="cursor-pointer">
                      <div className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center text-sm">
                        <Upload className="h-4 w-4 mr-2" />
                        {t('admin.instructors.uploadImage')}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      {t('admin.instructors.imageHint')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Name Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.instructors.name')}
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={t('admin.instructors.namePlaceholder')}
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setForm({ name: '', profile_image_url: '' });
                    setImagePreview(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  {t('admin.instructors.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                >
                  {editingInstructor ? t('admin.instructors.update') : t('admin.instructors.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

