import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { Save } from 'lucide-react';

interface SiteContent {
  page_key: string;
  title: string;
  content: string;
}

// Mock data
const MOCK_PAGES: SiteContent[] = [
  {
    page_key: 'about',
    title: 'About Us',
    content: 'Welcome to our studio! We offer a variety of classes...',
  },
  {
    page_key: 'tnc',
    title: 'Terms and Conditions',
    content: 'By using our services, you agree to the following terms...',
  },
  {
    page_key: 'privacy',
    title: 'Privacy Policy',
    content: 'We respect your privacy and are committed to protecting your data...',
  },
  {
    page_key: 'contact',
    title: 'Contact Us',
    content: 'Get in touch with us at...',
  },
];

export default function SettingsPage() {
  const [pages, setPages] = useState<SiteContent[]>([]);
  const [selectedPage, setSelectedPage] = useState<string>('about');
  const [form, setForm] = useState({ title: '', content: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadContent();
  }, []);

  useEffect(() => {
    const page = pages.find(p => p.page_key === selectedPage);
    if (page) {
      setForm({ title: page.title, content: page.content });
    }
  }, [selectedPage, pages]);

  async function loadContent() {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    setPages(MOCK_PAGES);
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Update local state
    setPages(pages.map(p => 
      p.page_key === selectedPage
        ? { ...p, title: form.title, content: form.content }
        : p
    ));

    alert('Content updated successfully');
    setSaving(false);
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
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Page</label>
            <select
              value={selectedPage}
              onChange={(e) => setSelectedPage(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {pages.map((page) => (
                <option key={page.page_key} value={page.page_key}>
                  {page.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Page Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea
                rows={10}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              ></textarea>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-dark flex items-center disabled:opacity-50"
            >
              <Save className="h-5 w-5 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
