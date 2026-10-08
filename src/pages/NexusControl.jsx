import { useSearchParams } from 'react-router-dom';
import { ShieldCheck, LogOut } from 'lucide-react';
import AdminLogin, { useAdminAuth } from '@/components/admin/AdminLogin';
import ProductManager from '@/components/admin/ProductManager';
import OrderManager from '@/components/admin/OrderManager';
import PromoCodeManager from '@/components/admin/PromoCodeManager';
import ClubsManager from '@/components/admin/ClubsManager';

export default function NexusControl() {
  const { authed, login, logout } = useAdminAuth();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'products';

  if (!authed) {
    return <AdminLogin onLogin={login} />;
  }

  return (
    <div className="bg-void min-h-screen">
      {/* Top bar */}
      <div className="border-b border-steel">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-kinetic" />
            <h1 className="font-heading text-xl uppercase text-fog">Nexus Control</h1>
          </div>
          <button onClick={logout}
            className="inline-flex items-center gap-1.5 mono-label border border-kinetic text-kinetic px-4 py-2 rounded-[6px] hover:bg-kinetic hover:text-void transition-colors">
            <LogOut size={14} /> LOGOUT
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-8">
        {tab === 'products' ? <ProductManager /> : tab === 'clubs' ? <ClubsManager /> : tab === 'orders' ? <OrderManager /> : <PromoCodeManager />}
      </div>
    </div>
  );
}