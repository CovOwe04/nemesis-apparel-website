import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Eye, Mail, User, Package } from 'lucide-react';
import DesignReviewModal from '@/components/admin/DesignReviewModal';

const STATUS_STYLES = {
  pending_approval: 'text-kinetic border-kinetic',
  approved: 'text-fog border-fog',
  rejected: 'text-fog/40 border-steel',
  fulfilled: 'text-fog/60 border-fog/40',
};

export default function OrderManager() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending_approval');
  const [expanded, setExpanded] = useState(null);
  const [reviewOrder, setReviewOrder] = useState(null);

  const loadOrders = () => {
    setLoading(true);
    const passcode = sessionStorage.getItem('nemesis-admin-passcode') || '';
    base44.functions.invoke('get-admin-orders', { passcode })
      .then((res) => setOrders((res.data?.orders || []).filter((o) => o.has_custom_names)))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadOrders(); }, []);

  const parseItems = (o) => {
    try { return JSON.parse(o.items_json || '[]'); } catch { return []; }
  };

  const filtered = orders.filter((o) => filter === 'all' ? true : o.status === filter);

  return (
    <div>
      {/* Filter tabs — only custom-name orders are shown */}
      <div className="flex items-center gap-2 mb-6">
        {['pending_approval', 'fulfilled', 'rejected', 'all'].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`mono-label px-4 py-2 border rounded-[6px] transition-colors ${filter === s ? 'bg-kinetic text-void border-kinetic' : 'border-steel text-fog/50 hover:text-fog'}`}>
            {s === 'pending_approval' ? 'PENDING' : s.toUpperCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 bg-steel animate-pulse rounded-[6px]" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="border border-steel rounded-[6px] p-10 text-center">
          <Package size={32} className="text-steel mx-auto mb-3" />
          <p className="mono-label text-fog/40">NO {filter.toUpperCase()} CUSTOM ORDERS.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => {
            const items = parseItems(o);
            const customItems = items.filter((i) => i.customName || i.customNumber);
            const isOpen = expanded === o.id;
            return (
              <div key={o.id} className="border border-steel rounded-[6px] overflow-hidden">
                {/* Header row */}
                <button onClick={() => setExpanded(isOpen ? null : o.id)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-steel/20 transition-colors text-left">
                  <div className={`mono-label px-3 py-1 border rounded-[6px] shrink-0 ${STATUS_STYLES[o.status] || ''}`}>
                    {o.status === 'pending_approval' ? 'PENDING APPROVAL' : o.status.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-heading text-fog text-sm truncate">{o.customer_name} — ${o.total}</div>
                    <div className="mono-label text-fog/40 mt-0.5 flex items-center gap-3">
                      <span className="flex items-center gap-1"><User size={11} /> {o.item_count || items.length} ITEMS</span>
                      <span className="text-kinetic">{customItems.length} CUSTOM</span>
                      <span>{new Date(o.created_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {/* View Design button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setReviewOrder(o); }}
                    className="inline-flex items-center gap-1.5 bg-kinetic px-4 py-2 font-heading uppercase text-void text-xs hover:bg-fog transition-colors rounded-[4px] shrink-0"
                  >
                    <Eye size={12} /> View &amp; Approve Design
                  </button>
                </button>

                {/* Expanded details */}
                {isOpen && (
                  <div className="border-t border-steel p-4 space-y-4">
                    <div className="flex items-center gap-2 text-fog/60 text-sm">
                      <Mail size={14} className="text-fog/40" /> {o.customer_email}
                    </div>

                    {/* Items */}
                    <div className="space-y-2">
                      <div className="mono-label text-fog/50">ORDER ITEMS</div>
                      {items.map((item, i) => (
                        <div key={i} className="border border-steel rounded-[6px] p-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-heading text-fog">{item.name}</span>
                            <span className="mono-label text-fog/50">QTY {item.quantity} · SIZE {item.shirtSize || 'M'}</span>
                          </div>
                          {(item.customName || item.customNumber) && (
                            <div className="mt-1 mono-label text-kinetic">
                              CUSTOM: {item.customName || '—'} {item.customNumber ? `#${item.customNumber}` : ''}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Design Review Modal */}
      {reviewOrder && (
        <DesignReviewModal
          order={reviewOrder}
          onClose={() => setReviewOrder(null)}
          onAction={() => {
            setReviewOrder(null);
            loadOrders();
          }}
        />
      )}
    </div>
  );
}