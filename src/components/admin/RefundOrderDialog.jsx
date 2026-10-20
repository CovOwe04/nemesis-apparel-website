import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Undo2, AlertTriangle } from 'lucide-react';

// Admin refund / cancel action. Full refund by default; enter an amount for a
// partial refund. Handles unpaid orders as a plain cancellation.
export default function RefundOrderDialog({ order, onClose, onDone }) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  if (!order) return null;

  const paid = Boolean(order.stripe_payment_id);
  const alreadyRefunded = order.refund_amount_usd || 0;
  const remaining = Math.max(0, (order.total || 0) - alreadyRefunded);

  const submit = async () => {
    setProcessing(true);
    setError('');
    try {
      const passcode = sessionStorage.getItem('nemesis-admin-passcode') || '';
      const payload = { orderId: order.id, passcode, reason: reason.trim() };
      if (paid && amount.trim()) payload.amountUsd = Number(amount);
      const res = await base44.functions.invoke('refund-order', payload);
      if (res.data?.error) throw new Error(res.data.error);
      const d = res.data || {};
      const parts = [
        d.cancelled
          ? 'Order cancelled.'
          : d.already_refunded
            ? 'Stripe already showed this payment fully refunded — the order is now marked refunded.'
            : d.full_refund
              ? `Full refund of $${Number(d.refunded_usd || 0).toFixed(2)} issued.`
              : `Partial refund of $${Number(d.refunded_usd || 0).toFixed(2)} issued.`,
      ];
      if (d.print_action_required) {
        parts.push(`Print order ${order.merchize_order_id} is ${d.print_status || 'still active'} — cancel it in the Merchize dashboard so you do not pay for production.`);
      }
      if (d.email_sent) parts.push('Customer emailed.');
      onDone(parts.join(' '));
    } catch (err) {
      setError(err?.response?.data?.error || err?.data?.error || err?.message || 'Refund failed.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-steel rounded-[6px] p-6 w-full max-w-md space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border-2 border-kinetic rounded-[6px] flex items-center justify-center shrink-0">
            <Undo2 size={20} className="text-kinetic" />
          </div>
          <div>
            <div className="font-heading text-fog text-sm uppercase">{paid ? 'Refund this order?' : 'Cancel this order?'}</div>
            <div className="mono-label text-fog/40 text-[0.6rem]">
              {order.customer_name} · #{String(order.id).slice(-8).toUpperCase()}
            </div>
          </div>
        </div>

        {paid ? (
          <div className="border border-steel rounded-[6px] p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="mono-label text-fog/50 text-[0.6rem]">ORDER TOTAL</span>
              <span className="font-heading text-fog">${Number(order.total || 0).toFixed(2)}</span>
            </div>
            {alreadyRefunded > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="mono-label text-fog/50 text-[0.6rem]">ALREADY REFUNDED</span>
                <span className="font-heading text-kinetic">${alreadyRefunded.toFixed(2)}</span>
              </div>
            )}
            <label className="block pt-1">
              <span className="mono-label text-fog/50 text-[0.6rem]">AMOUNT TO REFUND (USD)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Full refund — $${remaining.toFixed(2)}`}
                className="mt-1 w-full border border-steel rounded-[4px] px-3 py-2 text-sm bg-void text-fog no-spinner"
              />
              <span className="mono-label text-fog/30 text-[0.55rem]">Leave blank to refund the full ${remaining.toFixed(2)}.</span>
            </label>
          </div>
        ) : (
          <p className="mono-label text-fog/50 text-[0.65rem] leading-relaxed normal-case tracking-normal">
            No payment was captured for this order, so there is nothing to refund. Cancelling marks it closed and emails the customer.
          </p>
        )}

        <label className="block">
          <span className="mono-label text-fog/50 text-[0.6rem]">REASON (OPTIONAL)</span>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Customer request"
            className="mt-1 w-full border border-steel rounded-[4px] px-3 py-2 text-sm bg-void text-fog"
          />
        </label>

        {order.merchize_order_id && (
          <div className="flex items-start gap-2 border border-kinetic/40 rounded-[6px] p-3">
            <AlertTriangle size={14} className="text-kinetic shrink-0 mt-0.5" />
            <p className="mono-label text-fog/60 text-[0.6rem] leading-relaxed normal-case tracking-normal">
              This order is already with the print partner. After the refund, cancel print order{' '}
              <span className="text-fog">{order.merchize_order_id}</span> in the Merchize dashboard if it has not shipped,
              otherwise you will pay for production and refund the customer.
            </p>
          </div>
        )}

        {error && <p className="mono-label text-kinetic text-[0.65rem]">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={submit}
            disabled={processing}
            className="inline-flex items-center gap-1.5 bg-kinetic px-4 py-2 font-heading uppercase text-void text-xs hover:bg-fog transition-colors rounded-[4px] disabled:opacity-60"
          >
            {processing ? <Loader2 size={13} className="animate-spin" /> : <Undo2 size={13} />}
            {processing ? 'Processing…' : paid ? 'Refund & Cancel' : 'Cancel Order'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="mono-label text-fog/50 hover:text-fog transition-colors px-4 py-2 border border-steel rounded-[4px] text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}