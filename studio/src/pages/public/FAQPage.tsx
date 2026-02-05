import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PublicLayout from '../../components/PublicLayout';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

export default function FAQPage() {
  const { t } = useTranslation();
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    loadFAQs();
  }, [t]);

  async function loadFAQs() {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const faqData: FAQItem[] = [];
    let index = 1;
    while (true) {
      const question = t(`faq.questions.${index}.question`, { defaultValue: '' });
      const answer = t(`faq.questions.${index}.answer`, { defaultValue: '' });
      
      if (!question || !answer) break;
      
      faqData.push({ question, answer });
      index++;
    }
    
    setFaqs(faqData);
    setLoading(false);
  }

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">{t('faq.title')}</h1>
        <p className="text-lg text-gray-600 mb-8">{t('faq.subtitle')}</p>
        
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-gray-900 pr-4">{faq.question}</span>
                {openIndex === index ? (
                  <ChevronUp className="h-5 w-5 text-gray-500 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0" />
                )}
              </button>
              {openIndex === index && (
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <div className="text-gray-700 whitespace-pre-line leading-relaxed">
                    {faq.answer}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}

