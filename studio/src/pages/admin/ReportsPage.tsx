import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { formatDate } from '../../lib/utils';
import { Users, TrendingUp, AlertCircle } from 'lucide-react';

interface ReportData {
  newUsersTotal: number;
  newUsersFromTrial: number;
  lowTokenStudents: { id: string; full_name: string; remaining_tokens: number }[];
  expiringStudents: { id: string; full_name: string; expiry_date: string }[];
}

// Mock data
const MOCK_LOW_TOKEN_STUDENTS = [
  { id: 'student-002', full_name: 'John Doe', remaining_tokens: 2 },
  { id: 'student-004', full_name: 'Alice Johnson', remaining_tokens: 1 },
];

const MOCK_EXPIRING_STUDENTS = [
  { id: 'student-002', full_name: 'John Doe', expiry_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
  { id: 'student-005', full_name: 'Bob Wilson', expiry_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
];

export default function ReportsPage() {
  const [reportData, setReportData] = useState<ReportData>({
    newUsersTotal: 0,
    newUsersFromTrial: 0,
    lowTokenStudents: [],
    expiringStudents: [],
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadReports();
  }, [dateRange]);

  async function loadReports() {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setReportData({
      newUsersTotal: 12,
      newUsersFromTrial: 5,
      lowTokenStudents: MOCK_LOW_TOKEN_STUDENTS,
      expiringStudents: MOCK_EXPIRING_STUDENTS,
    });
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
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <div className="flex gap-3">
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">New Users</h2>
              <Users className="h-8 w-8 text-primary" />
            </div>
            <div className="text-4xl font-bold text-gray-900 mb-2">{reportData.newUsersTotal}</div>
            <p className="text-gray-600 text-sm mb-4">Total new users in period</p>
            <div className="flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-600 mr-2" />
              <span className="text-gray-600">
                {reportData.newUsersFromTrial} from trial lessons
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Alerts</h2>
              <AlertCircle className="h-8 w-8 text-orange-600" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-yellow-50 rounded">
                <span className="text-sm font-medium text-gray-900">Low Tokens</span>
                <span className="text-lg font-bold text-yellow-800">
                  {reportData.lowTokenStudents.length}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-orange-50 rounded">
                <span className="text-sm font-medium text-gray-900">Expiring Soon</span>
                <span className="text-lg font-bold text-orange-800">
                  {reportData.expiringStudents.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Students with Low Tokens (≤2)</h2>
          {reportData.lowTokenStudents.length === 0 ? (
            <p className="text-gray-600">No students with low tokens</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remaining Tokens</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reportData.lowTokenStudents.map((student) => (
                    <tr key={student.id}>
                      <td className="px-4 py-3 text-sm text-gray-900">{student.full_name}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">
                          {student.remaining_tokens}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Students Near Expiry Date</h2>
          {reportData.expiringStudents.length === 0 ? (
            <p className="text-gray-600">No students with expiring tokens</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reportData.expiringStudents.map((student) => (
                    <tr key={student.id}>
                      <td className="px-4 py-3 text-sm text-gray-900">{student.full_name}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-medium">
                          {formatDate(student.expiry_date)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
