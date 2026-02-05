import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { formatDate } from '../../lib/utils';
import { api } from '../../lib/api';
import { Plus, Edit, Trash2, User, Upload, X } from 'lucide-react';
import { TableSortButton } from '../../components/TableSortButton';

interface Instructor {
  id: string;
  name: string;
  profile_image_url: string | null;
  created_at: string;
  upcoming_classes_count?: number; // Added from API
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
  const [useImageUrl, setUseImageUrl] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [sortKey, setSortKey] = useState<string | null>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    loadInstructors();
    loadClasses();
  }, []);

  async function loadInstructors() {
    try {
      setLoading(true);
      const response = await api.get<Instructor[]>('/admin/instructors');
      if (response.success && response.data) {
        setInstructors(response.data);
      } else {
        throw new Error(response.msg || 'Failed to load instructors');
      }
    } catch (error) {
      console.error('Error loading instructors:', error);
      setInstructors([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadClasses() {
    try {
      const response = await api.get('/admin/classes');
      if (response.success && response.data) {
        // Transform API response to match frontend Class interface
        const transformedClasses: Class[] = response.data.map((cls: any) => ({
          id: cls.id.toString(),
          name: cls.name,
          instructor: cls.instructor || '',
          start_time: cls.start_time,
          end_time: cls.end_time,
          capacity: cls.capacity,
          enrolled_count: cls.enrolled_count || 0,
          is_internal: cls.is_internal === 1 || cls.is_internal === true,
          is_cancelled: cls.is_cancelled === 1 || cls.is_cancelled === true,
          location: cls.location,
        }));
        setClasses(transformedClasses);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
      setClasses([]);
    }
  }

  const sortedInstructors = [...instructors].sort((a, b) => {
    if (!sortKey) return 0;
    let cmp = 0;
    if (sortKey === 'name') {
      cmp = (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
    } else if (sortKey === 'created_at') {
      cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
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

  function getUpcomingClassesCount(instructorName: string): number {
    // Use count from API if available, otherwise calculate from classes
    const instructor = instructors.find(inst => inst.name === instructorName);
    if (instructor?.upcoming_classes_count !== undefined) {
      return instructor.upcoming_classes_count;
    }
    
    // Fallback calculation
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
    setUseImageUrl(false);
    setImageUrlInput('');
    setShowModal(true);
  }

  function openEditModal(instructor: Instructor) {
    setEditingInstructor(instructor);
    const hasImageUrl = instructor.profile_image_url && !instructor.profile_image_url.startsWith('data:');
    setForm({
      name: instructor.name,
      profile_image_url: instructor.profile_image_url || '',
    });
    setImagePreview(instructor.profile_image_url || null);
    setUseImageUrl(hasImageUrl);
    setImageUrlInput(hasImageUrl ? instructor.profile_image_url || '' : '');
    setShowModal(true);
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 2MB)
      const maxSize = 2 * 1024 * 1024; // 2MB
      if (file.size > maxSize) {
        alert(t('admin.instructors.imageTooLarge') || 'Image is too large. Please use an image smaller than 2MB, or use an image URL instead.');
        e.target.value = ''; // Reset input
        return;
      }

      // Compress and resize image before converting to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          // Create canvas to compress image
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 300;
          const MAX_HEIGHT = 300;
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions
          if (width > height) {
            if (width > MAX_WIDTH) {
              height = (height * MAX_WIDTH) / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = (width * MAX_HEIGHT) / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // Draw and compress
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convert to base64 with compression (quality 0.7 for smaller size)
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
            
            // Check if still too large for Google Sheets (50,000 char limit)
            // Leave buffer (45,000 chars) to be safe
            if (compressedBase64.length > 45000) {
              // Try with even lower quality
              const moreCompressed = canvas.toDataURL('image/jpeg', 0.5);
              if (moreCompressed.length > 45000) {
                // Try one more time with very low quality
                const veryCompressed = canvas.toDataURL('image/jpeg', 0.4);
                if (veryCompressed.length > 45000) {
                  alert(t('admin.instructors.imageTooLargeForSheet') || 'Image is too large even after compression. Please use the "Use URL" option instead and paste an image URL, or use a smaller image file.');
                  e.target.value = '';
                  return;
                }
                setImagePreview(veryCompressed);
                setForm({ ...form, profile_image_url: veryCompressed });
              } else {
                setImagePreview(moreCompressed);
                setForm({ ...form, profile_image_url: moreCompressed });
              }
            } else {
              setImagePreview(compressedBase64);
              setForm({ ...form, profile_image_url: compressedBase64 });
            }
          }
        };
        img.onerror = () => {
          alert(t('admin.instructors.imageLoadError') || 'Failed to load image. Please try again.');
          e.target.value = '';
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  function handleImageUrlChange(url: string) {
    setImageUrlInput(url);
    if (url.trim()) {
      setImagePreview(url);
      setForm({ ...form, profile_image_url: url });
    } else {
      setImagePreview(null);
      setForm({ ...form, profile_image_url: '' });
    }
  }

  function removeImage() {
    setImagePreview(null);
    setForm({ ...form, profile_image_url: '' });
    setImageUrlInput('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      if (editingInstructor) {
        // Update existing instructor
        const response = await api.patch(`/admin/instructors/${editingInstructor.id}`, {
          name: form.name,
          profile_image_url: form.profile_image_url || null,
        });

        if (response.success && response.data) {
          // Reload instructors to get updated data
          await loadInstructors();
          alert(t('admin.instructors.instructorUpdated'));
        } else {
          throw new Error(response.msg || 'Failed to update instructor');
        }
      } else {
        // Create new instructor
        const response = await api.post('/admin/instructors', {
          name: form.name,
          profile_image_url: form.profile_image_url || null,
        });

        if (response.success && response.data) {
          // Reload instructors to get updated data
          await loadInstructors();
          alert(t('admin.instructors.instructorCreated'));
        } else {
          throw new Error(response.msg || 'Failed to create instructor');
        }
      }

      setShowModal(false);
      setForm({ name: '', profile_image_url: '' });
      setImagePreview(null);
    } catch (error) {
      console.error('Error saving instructor:', error);
      alert(error instanceof Error ? error.message : 'Failed to save instructor');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t('admin.instructors.confirmDelete'))) {
      return;
    }

    try {
      console.log(`Attempting to delete instructor with id: ${id}`);
      const response = await api.delete(`/admin/instructors/${id}`);
      
      console.log('Delete response:', response);
      
      if (response.success) {
        // Reload instructors to get updated data
        await loadInstructors();
        alert(t('admin.instructors.instructorDeleted'));
      } else {
        throw new Error(response.msg || 'Failed to delete instructor');
      }
    } catch (error) {
      console.error('Error deleting instructor:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete instructor';
      alert(errorMessage);
    }
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
                    <TableSortButton label={t('admin.instructors.instructor')} sortKey="name" currentSortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="px-4 py-3 text-left text-xs tracking-wider" />
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.instructors.upcomingClasses')}
                    </th>
                    <TableSortButton label={t('admin.instructors.createdAt')} sortKey="created_at" currentSortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="px-4 py-3 text-left text-xs tracking-wider" />
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.instructors.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedInstructors.map((instructor) => {
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
                
                {/* Toggle between Upload and URL */}
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setUseImageUrl(false);
                      if (useImageUrl) {
                        setImageUrlInput('');
                        setImagePreview(null);
                        setForm({ ...form, profile_image_url: '' });
                      }
                    }}
                    className={`px-3 py-1 text-sm rounded-md ${
                      !useImageUrl
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {t('admin.instructors.uploadFile') || 'Upload File'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUseImageUrl(true);
                      if (!useImageUrl) {
                        setForm({ ...form, profile_image_url: '' });
                        setImagePreview(null);
                      }
                    }}
                    className={`px-3 py-1 text-sm rounded-md ${
                      useImageUrl
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {t('admin.instructors.useUrl') || 'Use URL'}
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <div className="relative">
                    {imagePreview ? (
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-24 h-24 rounded-full object-cover border-4 border-gray-100"
                          onError={() => {
                            setImagePreview(null);
                            alert(t('admin.instructors.imageLoadError') || 'Failed to load image. Please check the URL.');
                          }}
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
                    {useImageUrl ? (
                      <div>
                        <input
                          type="url"
                          value={imageUrlInput}
                          onChange={(e) => handleImageUrlChange(e.target.value)}
                          placeholder="https://example.com/image.jpg"
                          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {t('admin.instructors.urlHint') || 'Enter a direct image URL (recommended for large images)'}
                        </p>
                      </div>
                    ) : (
                      <div>
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
                          {t('admin.instructors.imageHint') || 'Image will be compressed automatically. For large images, use URL option instead.'}
                        </p>
                      </div>
                    )}
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

