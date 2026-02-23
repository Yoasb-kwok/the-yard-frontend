import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import HomePage from './pages/public/HomePage';
import AboutPage from './pages/public/AboutPage';
import CalendarPage from './pages/public/CalendarPage';
import NewsPage from './pages/public/NewsPage';
import NewsDetailPage from './pages/public/NewsDetailPage';
import ContactPage from './pages/public/ContactPage';
import TokenPackagePage from './pages/public/TokenPackagePage';
import TermsPage from './pages/public/TermsPage';
import PrivacyPage from './pages/public/PrivacyPage';
import FAQPage from './pages/public/FAQPage';
import TrialPage from './pages/public/TrialPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import OTPVerificationPage from './pages/auth/OTPVerificationPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

import DashboardPage from './pages/student/DashboardPage';
import SchedulePage from './pages/student/SchedulePage';
import PaymentHistoryPage from './pages/student/PaymentHistoryPage';
import ProfilePage from './pages/student/ProfilePage';

import AdminDashboard from './pages/admin/AdminDashboard';
import PendingApplicationsPage from './pages/admin/PendingApplicationsPage';
import UsersPage from './pages/admin/UsersPage';
import ClassesPage from './pages/admin/ClassesPage';
import ClassAttendancePage from './pages/admin/ClassAttendancePage';
import InstructorsPage from './pages/admin/InstructorsPage';
import SettingsPage from './pages/admin/SettingsPage';
import CouponsPage from './pages/admin/CouponsPage';
import UserPurchaseHistoryPage from './pages/admin/UserPurchaseHistoryPage';
import UserPurchaseHistoryDetailPage from './pages/admin/UserPurchaseHistoryDetailPage';
import UserSchedulePage from './pages/admin/UserSchedulePage';
import TokenAssignmentPage from './pages/admin/TokenAssignmentPage';
import ReassignStudentsPage from './pages/admin/ReassignStudentsPage';
import HolidaysPage from './pages/admin/HolidaysPage';
import RefundRecordsPage from './pages/admin/RefundRecordsPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/news/:id" element={<NewsDetailPage />} />
          <Route path="/token-package" element={<TokenPackagePage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/trial" element={<TrialPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/verify-otp" element={<OTPVerificationPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/schedule"
            element={
              <ProtectedRoute>
                <SchedulePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment-history"
            element={
              <ProtectedRoute>
                <PaymentHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/pending-applications"
            element={
              <ProtectedRoute requireAdmin>
                <PendingApplicationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute requireAdmin>
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/classes"
            element={
              <ProtectedRoute requireAdmin>
                <ClassesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/classes/:classId/attendance"
            element={
              <ProtectedRoute requireAdmin>
                <ClassAttendancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/instructors"
            element={
              <ProtectedRoute requireAdmin>
                <InstructorsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute requireAdmin>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/coupons"
            element={
              <ProtectedRoute requireAdmin>
                <CouponsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/purchase-history"
            element={
              <ProtectedRoute requireAdmin>
                <UserPurchaseHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users/:userId/purchase-history"
            element={
              <ProtectedRoute requireAdmin>
                <UserPurchaseHistoryDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users/:userId/schedule"
            element={
              <ProtectedRoute requireAdmin>
                <UserSchedulePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users/:userId/assign-tokens"
            element={
              <ProtectedRoute requireAdmin>
                <TokenAssignmentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/classes/:classId/reassign"
            element={
              <ProtectedRoute requireAdmin>
                <ReassignStudentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/holidays"
            element={
              <ProtectedRoute requireAdmin>
                <HolidaysPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/refund-records"
            element={
              <ProtectedRoute requireAdmin>
                <RefundRecordsPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
