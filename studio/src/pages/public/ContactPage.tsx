import { useEffect, useState } from 'react';
import PublicLayout from '../../components/PublicLayout';
import { Mail, Phone, MapPin } from 'lucide-react';

// Dummy data
const DUMMY_CONTENT = {
  title: 'Contact Us',
  content: 'We would love to hear from you! Get in touch with us through any of the methods below.',
};

export default function ContactPage() {
  const [content, setContent] = useState({ title: '', content: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContent();
  }, []);

  async function loadContent() {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));
    setContent(DUMMY_CONTENT);
    setLoading(false);
  }

  if (loading) {
    return (
      <PublicLayout>
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">{content.title}</h1>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
              <div className="flex items-start">
                <Mail className="h-6 w-6 text-primary mr-3 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
                  <p className="text-gray-600">info@studio.com</p>
                </div>
              </div>

              <div className="flex items-start">
                <Phone className="h-6 w-6 text-primary mr-3 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Phone</h3>
                  <p className="text-gray-600">+1 (555) 123-4567</p>
                </div>
              </div>

              <div className="flex items-start">
                <MapPin className="h-6 w-6 text-primary mr-3 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Address</h3>
                  <p className="text-gray-600">123 Studio Street<br />City, State 12345</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Send us a message</h2>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                ></textarea>
              </div>
              <button
                type="submit"
                className="w-full bg-primary text-white py-2 rounded-md hover:bg-primary-dark transition-colors"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
