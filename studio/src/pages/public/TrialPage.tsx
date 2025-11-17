import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PublicLayout from '../../components/PublicLayout';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../lib/utils';
import { CheckCircle } from 'lucide-react';

interface TrialLesson {
  id: string;
  name: string;
  description: string;
  price: number;
}

// Dummy data
const DUMMY_TRIALS: TrialLesson[] = [
  {
    id: '1',
    name: 'Free Trial Class',
    description: 'Experience our teaching style with a complimentary trial class',
    price: 0,
  },
  {
    id: '2',
    name: 'Premium Trial Package',
    description: 'Try our premium classes with a discounted trial package',
    price: 100,
  },
];

export default function TrialPage() {
  const [trials, setTrials] = useState<TrialLesson[]>([]);
  const [selectedTrial, setSelectedTrial] = useState<string>('');
  const [fullName, setFullName] = useState('');
  const [idFirstFour, setIdFirstFour] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { signUp } = useAuth();

  useEffect(() => {
    loadTrials();
  }, []);

  async function loadTrials() {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));
    setTrials(DUMMY_TRIALS);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Use the hardcoded signUp from AuthContext
      await signUp(email, password, fullName, idFirstFour, mobile);

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to submit application');
      }
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <PublicLayout>
        <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center py-12 px-4">
          <div className="max-w-md w-full text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
            <p className="text-gray-600 mb-4">
              We've sent you an email confirmation. Please check your inbox to set your password and activate your account.
            </p>
            <p className="text-sm text-gray-500">Redirecting to login...</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Apply for Trial Lesson</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Trial Lesson
            </label>
            <select
              required
              value={selectedTrial}
              onChange={(e) => setSelectedTrial(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Choose a trial lesson</option>
              {trials.map((trial) => (
                <option key={trial.id} value={trial.id}>
                  {trial.name} - {trial.price === 0 ? 'FREE' : formatCurrency(trial.price)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First 4 Digits of ID
              </label>
              <input
                type="text"
                required
                maxLength={4}
                pattern="[0-9]{4}"
                value={idFirstFour}
                onChange={(e) => setIdFirstFour(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
            <input
              type="tel"
              required
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-3 rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 font-medium"
          >
            {loading ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>
      </div>
    </PublicLayout>
  );
}
