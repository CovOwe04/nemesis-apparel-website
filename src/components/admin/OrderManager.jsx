import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Eye, Mail, Phone, User, Package, Trash2 } from 'lucide-react';
import DesignReviewModal from '@/components/admin/DesignReviewModal';
import ConfirmDialog from '@/components/admin/ConfirmDialog';

const STATUS_STYLES = {
  pending_approval: 'text-kinetic border-kinetic',
  approved: 'text-fog border-fog',
  rejected: 'text-fog/40 border-steel',
  fulfilled: 'text-fog/60 border-fog/40',
};

export default function OrderManager() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [reviewOrder, setReviewOrder] = useState(null);
  const [syncingOrderId, setSyncingOrderId] = useState('');
  const [syncMessage, setSyncMessage] = useState(null);
  const [deletingId, setDeletingId] = useState('');
  const [confirmOrder, setConfirmOrder] = useState(null);

  const deleteOrder = async (order) => {
    setDeletingId(order.id);
    try {
      const passcode = sessionStorage.getItem('nemesis-admin-passcode') || '';
      const res = await base44.functions.invoke('get-admin-orders', { action: 'delete', orderId: order.id, passcode });
      if (res.data?.error) throw new Error(res.data.error);
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
      setConfirmOrder(null);
    } catch (err) {
      setLoadError(err?.response?.data?.error || err?.data?.error || err?.message || 'Could not delete order.');
    } finally {
      setDeletingId('');
    }
  };

  const loadOrders = () => {
    setLoading(true);
    setLoadError('');
    const passcode = sessionStorage.getItem('nemesis-admin-passcode') || '';
    base44.functions.invoke('get-admin-orders', { passcode })
      .then((res) => setOrders(res.data?.orders || []))
      .catch((err) => {
        setOrders([]);
        setLoadError(err?.response?.data?.error || err?.data?.error || err?.message || 'Could not load orders.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadOrders(); }, []);

  const parseItems = (o) => {
    try { return JSON.parse(o.items_json || '[]'); } catch { return []; }
  };

  const syncFulfillment = async (order) => {
    setSyncingOrderId(order.id);
    setSyncMessage(null);
    try {
      const passcode = sessionStorage.getItem('nemesis-admin-passcode') || '';
      const res = await base44.functions.invoke('sync-merchize-order-status', { orderId: order.id, passcode });
      if (res.data?.error) throw new Error(res.data.error);
      if (res.data?.status === 'fulfilled') {
        setSyncMessage({ orderId: order.id, message: 'Merchize confirms this order is fulfilled.' });
        loadOrders();
      } else {
        setSyncMessage({ orderId: order.id, message: `Merchize status: ${res.data?.merchize_status || 'not fulfilled yet'}` });
      }
    } catch (err) {
      setSyncMessage({
        orderId: order.id,
        message: err?.response?.data?.error || err?.data?.error || err?.message || 'Could not sync Merchize status.',
      });
    } finally {
      setSyncingOrderId('');
    }
  };

  const filtered = orders.filter((o) => filter === 'all' ? true : o.status === filter);

  return (
    <div>
      {/* Show all checkouts; only pending-approval orders expose approval actions. */}
      <div className="flex items-center gap-2 mb-6">
        {['pending_approval', 'approved', 'fulfilled', 'rejected', 'all'].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`mono-label px-4 py-2 border rounded-[6px] transition-colors ${filter === s ? 'bg-kinetic text-void border-kinetic' : 'border-steel text-fog/50 hover:text-fog'}`}>
            {s === 'pending_approval' ? 'PENDING' : s.toUpperCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 bg-steel animate-pulse rounded-[6px]" />)}</div>
      ) : loadError ? (
        <div role="alert" className="border border-kinetic/40 rounded-[6px] p-6 text-center">
          <p className="mono-label text-kinetic">ORDER LIST FAILED TO LOAD</p>
          <p className="text-fog/60 text-sm mt-2">{loadError}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-steel rounded-[6px] p-10 text-center">
          <Package size={32} className="text-steel mx-auto mb-3" />
          <p className="mono-label text-fog/40">NO {filter.toUpperCase()} ORDERS.</p>
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
                <div onClick={() => setExpanded(isOpen ? null : o.id)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-steel/20 transition-colors text-left cursor-pointer">
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
                  <div className="flex items-center gap-2 shrink-0">
                    {o.status === 'approved' && o.merchize_order_id && (
                      <button
                        onClick={(e) => { e.stopPropagation(); syncFulfillment(o); }}
                        disabled={syncingOrderId === o.id}
                        className="mono-label px-3 py-2 border border-steel text-fog/70 hover:text-fog hover:border-fog/50 rounded-[4px] disabled:opacity-50"
                      >
                        {syncingOrderId === o.id ? 'CHECKING…' : 'CHECK STATUS'}
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setReviewOrder(o); }}
                      className="inline-flex items-center gap-1.5 bg-kinetic px-4 py-2 font-heading uppercase text-void text-xs hover:bg-fog transition-colors rounded-[4px]"
                    >
                      <Eye size={12} /> {o.status === 'pending_approval' ? 'View & Approve Design' : 'View Order'}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmOrder(o); }}
                      disabled={deletingId === o.id}
                      title="Delete order"
                      className="inline-flex items-center justify-center border border-steel text-fog/50 hover:text-kinetic hover:border-kinetic/50 px-2.5 py-2 rounded-[4px] disabled:opacity-50 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {syncMessage?.orderId === o.id && (
                  <p className="px-4 pb-3 mono-label text-fog/60" role="status">{syncMessage.message}</p>
                )}

                {/* Expanded details */}
                {isOpen && (
                  <div className="border-t border-steel p-4 space-y-4">
                    <div className="flex items-center gap-4 text-fog/60 text-sm">
                      <span className="flex items-center gap-1.5"><Mail size={14} className="text-fog/40" /> {o.customer_email}</span>
                      {o.customer_phone && <span className="flex items-center gap-1.5"><Phone size={14} className="text-fog/40" /> {o.customer_phone}</span>}
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

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!confirmOrder}
        title="Delete order?"
        description={confirmOrder ? `Delete order for ${confirmOrder.customer_name}? This cannot be undone.` : ''}
        confirmLabel="Delete"
        loading={!!deletingId}
        onConfirm={() => confirmOrder && deleteOrder(confirmOrder)}
        onCancel={() => setConfirmOrder(null)}
      />

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