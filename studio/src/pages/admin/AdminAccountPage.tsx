import Layout from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import AccountSecurityCard from '../../components/AccountSecurityCard';
import { User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function AdminAccountPage() {
  const { user, profile, refreshMe } = useAuth();
  const { t } = useTranslation();

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <User className="h-7 w-7 text-primary" />
          {t('nav.account')}
        </h1>
        <p className="text-gray-600">
          {t('admin.account.description', 'Manage your admin account: change login email, bound mobile and password here.')}
        </p>
        <AccountSecurityCard
          email={user?.email ?? null}
          mobile={user?.mobile ?? profile?.contact_number ?? profile?.mobile ?? null}
          onAccountUpdated={() => refreshMe()}
        />
      </div>
    </Layout>
  );
}
