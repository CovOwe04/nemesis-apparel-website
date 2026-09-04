import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Check, X, Clock, Mail, User, Package } from 'lucide-react';

const STATUS_STYLES = {
  pending: 'text-kinetic border-kinetic',
  approved: 'text-fog border-fog',
  rejected: 'text-fog/40 border-steel',
  fulfilled: 'text-fog/60 border-fog/40',
};

export default function OrderManager() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [expanded, setExpanded] = useState(null);

  const loadOrders = () => {
    setLoading(true);
    base44.entities.Order.list('-created_date', 100)
      .then((d) => setOrders(d || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadOrders(); }, []);

  const updateStatus = async (id, status) => {
    try {
      await base44.entities.Order.update(id, { status });
      loadOrders();
    } catch (err) {
      alert('Update failed: ' + (err?.message || 'unknown error'));
    }
  };

  const filtered = orders.filter((o) => filter === 'all' ? true : o.status === filter);

  const parseItems = (o) => {
    try { return JSON.parse(o.items_json || '[]'); } catch { return []; }
  };

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-6">
        {['pending', 'approved', 'rejected', 'fulfilled', 'all'].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`mono-label px-4 py-2 border rounded-[6px] transition-colors ${filter === s ? 'bg-kinetic text-void border-kinetic' : 'border-steel text-fog/50 hover:text-fog'}`}>
            {s.toUpperCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 bg-steel animate-pulse rounded-[6px]" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="border border-steel rounded-[6px] p-10 text-center">
          <Package size={32} className="text-steel mx-auto mb-3" />
          <p className="mono-label text-fog/40">NO {filter.toUpperCase()} ORDERS.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => {
            const items = parseItems(o);
            const isOpen = expanded === o.id;
            return (
              <div key={o.id} className="border border-steel rounded-[6px] overflow-hidden">
                {/* Header row */}
                <button onClick={() => setExpanded(isOpen ? null : o.id)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-steel/20 transition-colors text-left">
                  <div className={`mono-label px-3 py-1 border rounded-[6px] shrink-0 ${STATUS_STYLES[o.status] || ''}`}>
                    {o.status.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-heading text-fog text-sm truncate">{o.customer_name} — ${o.total}</div>
                    <div className="mono-label text-fog/40 mt-0.5 flex items-center gap-3">
                      <span className="flex items-center gap-1"><User size={11} /> {o.item_count || items.length} ITEMS</span>
                      {o.has_custom_names && <span className="text-kinetic">CUSTOM NAMES</span>}
                      <span>{new Date(o.created_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </button>

                {/* Expanded details */}
                {isOpen && (
                  <div className="border-t border-steel p-4 space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 text-fog/60 text-sm">
                        <Mail size={14} className="text-fog/40" /> {o.customer_email}
                      </div>
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
                          {item.customName && (
                            <div className="mt-1 mono-label text-kinetic">
                              CUSTOM NAME: {item.customName}
                              {item.font && ` · FONT: ${item.font}`}
                            </div>
                          )}
                          {item.isCustomDesign && (
                            <div className="mt-1 mono-label text-fog/50">CUSTOM DESIGN SUBMISSION</div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Approval actions */}
                    {o.status === 'pending' && (
                      <div className="flex gap-3 pt-2">
                        <button onClick={() => updateStatus(o.id, 'approved')}
                          className="inline-flex items-center gap-2 bg-kinetic px-5 py-2.5 font-heading uppercase text-void hover:bg-fog transition-colors rounded-[6px]">
                          <Check size={16} /> Approve
                        </button>
                        <button onClick={() => updateStatus(o.id, 'rejected')}
                          className="inline-flex items-center gap-2 border border-steel px-5 py-2.5 font-heading uppercase text-fog/60 hover:text-kinetic hover:border-kinetic transition-colors rounded-[6px]">
                          <X size={16} /> Reject
                        </button>
                      </div>
                    )}
                    {o.status === 'approved' && (
                      <button onClick={() => updateStatus(o.id, 'fulfilled')}
                        className="inline-flex items-center gap-2 border border-steel px-5 py-2.5 font-heading uppercase text-fog hover:text-kinetic hover:border-kinetic transition-colors rounded-[6px]">
                        <Check size={16} /> Mark fulfilled
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}