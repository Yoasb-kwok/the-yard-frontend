import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PublicLayout from '../../components/PublicLayout';
import { Mail, MapPin, Facebook, Instagram, Clock } from 'lucide-react';
import building1Image from '../../assets/images/building1.jpg';
import building2Image from '../../assets/images/building2.jpg';

export default function ContactPage() {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContent();
  }, [t]);

  async function loadContent() {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));
    setLoading(false);
  }

  if (loading) {
    return (
      <PublicLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">{t('contact.title')}</h1>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Contact Information Card */}
          <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
            <div className="flex items-start">
              <MapPin className="h-6 w-6 text-primary mr-3 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">{t('contact.address')}</h3>
                <p className="text-gray-600">
                  {i18n.language === 'en' ? t('contact.addressEN') : t('contact.addressTC')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <a
                href="mailto:info@theyard.com.hk"
                className="text-primary hover:text-primary-dark transition-colors"
                aria-label="Email"
              >
                <Mail className="h-6 w-6" />
              </a>
              <a
                href="https://facebook.com/theyardltd"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary-dark transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-6 w-6" />
              </a>
              <a
                href="https://instagram.com/theyardhk"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary-dark transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-6 w-6" />
              </a>
            </div>
          </div>

          {/* Service Hours Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-start">
              <Clock className="h-6 w-6 text-primary mr-3 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">{t('contact.serviceHours')}</h3>
                <div className="text-gray-600 space-y-1">
                  <p>{t('contact.serviceHoursWeekday')}</p>
                  <p>{t('contact.serviceHoursWeekend')}</p>
                  <p className="mt-2">{t('contact.serviceHoursNote')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Building Images and Google Map */}
        <div className="grid md:grid-cols-4 gap-8 items-start">
          <div className="bg-white rounded-lg shadow-md overflow-hidden order-3 md:order-1">
            <img
              src={building1Image}
              alt="The Yard Building Exterior"
              className="w-full h-auto object-contain"
            />
          </div>
          <div className="bg-white rounded-lg shadow-md overflow-hidden order-4 md:order-2">
            <img
              src={building2Image}
              alt="The Yard Building Entrance"
              className="w-full h-auto object-contain"
            />
          </div>
          <div className="md:col-span-2 bg-white rounded-lg shadow-md overflow-hidden order-1 md:order-3">
            <div className="aspect-video w-full">
              <iframe
                src="https://www.google.com/maps?q=21+Luk+Hop+Street,+San+Po+Kong,+Kowloon,+Hong+Kong&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="The Yard Location"
              ></iframe>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
