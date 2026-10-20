// Admin action: refund (full or partial) and/or cancel an order.
//
// Steps, in order:
//   1. Refuse orders that were already refunded (double-refund guard).
//   2. Look up the live print-order status so the admin knows whether the
//      fulfillment order still needs to be stopped.
//   3. Refund the exact amount in Stripe (full by default, partial on request).
//   4. Record the refund on the order and email the customer.
//
// Merchize's public API has no cancel endpoint, so the print order itself must
// still be cancelled in the Merchize dashboard — the response says so explicitly
// instead of pretending the print order was stopped.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { secrets } from 'base44:runtime';
import Stripe from 'npm:stripe@17.7.0';
import { requireAdminPasscode } from '../../shared/security.ts';
import { sendRefundNotice } from '../../shared/refundNotice.ts';

const CAD_RATE = 1.36;

function round2(n) {
  return Math.round(n * 100) / 100;
}

// Read-only check against the fulfillment partner so the admin can see whether
// the print order has shipped before the money goes back.
async function getPrintStatus(order) {
  const baseUrl = secrets.get('MERCHIZE_API_BASE_URL');
  const token = secrets.get('MERCHIZE_ACCESS_TOKEN');
  const apiKey = secrets.get('MERCHIZE_API_KEY');
  if (!order.merchize_order_id) return { checked: false, status: '', shipped: false };
  if (!baseUrl || !token) return { checked: false, status: '', shipped: false };

  try {
    const url = new URL(`${baseUrl}/order/external/orders/order-detail`);
    url.searchParams.set('external_number', order.id);
    url.searchParams.set('identifier', 'nemesis-apparel.base44.app');
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, 'x-api-key': apiKey },
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      console.error('Print status lookup failed:', data.message || `HTTP ${res.status}`);
      return { checked: true, status: '', shipped: false };
    }
    const shipments = (data.data?.shipment_statuses || [])
      .map((s) => (typeof s === 'string' ? s : s.status || s.progress_status || s.name || ''))
      .filter(Boolean);
    const status = [data.data?.order_status, ...shipments].filter(Boolean).join(' / ');
    const shipped = /ship|transit|deliver|complete|fulfilled/i.test(status);
    return { checked: true, status, shipped };
  } catch (err) {
    console.error('Print status lookup error:', err.message || err);
    return { checked: true, status: '', shipped: false };
  }
}

export default async function (req) {
  try {
    const body = await req.json();
    const { orderId, reason = '' } = body;

    const denied = requireAdminPasscode(req, body.passcode);
    if (denied) return denied;

    if (!orderId) return Response.json({ error: 'orderId required' }, { status: 400 });

    const base44 = createClientFromRequest(req);
    const order = await base44.asServiceRole.entities.Order.get(orderId);
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });

    // Double-refund guards — never pay money back twice for one order.
    if (order.status === 'refunded') {
      return Response.json({ error: 'This order has already been fully refunded.' }, { status: 400 });
    }
    if (order.status === 'rejected') {
      return Response.json({ error: 'This order was already rejected and refunded through design review.' }, { status: 400 });
    }
    if (order.status === 'cancelled') {
      return Response.json({ error: 'This order has already been cancelled.' }, { status: 400 });
    }

    const print = await getPrintStatus(order);
    const printId = order.merchize_order_id || '';
    const printActionRequired = Boolean(printId) && !print.shipped;

    // ---- Cancel-only path: no payment was ever captured ----
    if (!order.stripe_payment_id) {
      await base44.asServiceRole.entities.Order.update(orderId, {
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        admin_notes: [
          order.admin_notes || '',
          `Cancelled (no payment on file)${reason ? ` — ${reason}` : ''}`,
          printId ? `Print order ${printId} status: ${print.status || 'unknown'} — cancel it in Merchize if it has not shipped.` : 'No print order was created.',
        ].filter(Boolean).join('\n'),
      });
      const notice = await sendRefundNotice({
        to: order.customer_email,
        customerName: order.customer_name,
        orderId,
        cancelled: true,
        reason,
      });
      return Response.json({
        success: true,
        cancelled: true,
        refunded_usd: 0,
        print_status: print.status,
        print_action_required: printActionRequired,
        email_sent: notice.sent,
      });
    }

    // ---- Refund path ----
    const stripe = new Stripe(secrets.get('STRIPE_SECRET_KEY'));
    const intent = await stripe.paymentIntents.retrieve(order.stripe_payment_id, { expand: ['latest_charge'] });
    const charge: any = typeof intent.latest_charge === 'object' ? intent.latest_charge : null;
    const currency = (intent.currency || 'usd').toLowerCase();
    const chargedMinor = Number(charge?.amount ?? intent.amount_received ?? intent.amount ?? 0);
    const alreadyRefundedMinor = Number(charge?.amount_refunded ?? 0);
    const refundableMinor = Math.max(0, chargedMinor - alreadyRefundedMinor);
    const toUsd = (minor) => (currency === 'cad' ? round2(minor / 100 / CAD_RATE) : round2(minor / 100));
    const toMinor = (usd) => (currency === 'cad' ? Math.round(usd * CAD_RATE * 100) : Math.round(usd * 100));

    // Stripe already holds a full refund (e.g. issued in the Stripe dashboard)
    // but the order was never marked — reconcile instead of refunding again.
    if (refundableMinor <= 0) {
      await base44.asServiceRole.entities.Order.update(orderId, {
        status: 'refunded',
        refund_amount_usd: toUsd(alreadyRefundedMinor),
        refund_reason: reason || order.refund_reason || '',
        refunded_at: new Date().toISOString(),
        admin_notes: [order.admin_notes || '', 'Stripe already showed this payment fully refunded — order marked refunded.'].filter(Boolean).join('\n'),
      });
      return Response.json({
        success: true,
        already_refunded: true,
        full_refund: true,
        refunded_usd: 0,
        total_refunded_usd: toUsd(alreadyRefundedMinor),
        print_status: print.status,
        print_action_required: printActionRequired,
        email_sent: false,
      });
    }

    const requestedUsd = Number(body.amountUsd) > 0 ? Number(body.amountUsd) : null;
    let refundMinor = requestedUsd ? toMinor(requestedUsd) : refundableMinor;
    if (requestedUsd && refundMinor > refundableMinor) {
      return Response.json({
        error: `That refund exceeds what is left to refund ($${toUsd(refundableMinor).toFixed(2)}).`,
      }, { status: 400 });
    }
    if (refundMinor < 50) {
      return Response.json({ error: 'The refund amount is below the minimum Stripe allows.' }, { status: 400 });
    }
    const fullRefund = refundMinor >= refundableMinor;

    let refund: any;
    try {
      refund = await stripe.refunds.create({
        payment_intent: order.stripe_payment_id,
        ...(fullRefund ? {} : { amount: refundMinor }),
        reason: 'requested_by_customer',
        metadata: { base44_app_id: secrets.get('BASE44_APP_ID') || '', order_id: orderId },
      }, { idempotencyKey: `refund-${orderId}-${refundMinor}-${alreadyRefundedMinor}` });
    } catch (err) {
      console.error('Refund failed:', err.message || err);
      return Response.json({ error: `Refund failed: ${err.message}` }, { status: 400 });
    }

    const thisRefundUsd = toUsd(refundMinor);
    const cumulativeUsd = round2((order.refund_amount_usd || 0) + thisRefundUsd);

    await base44.asServiceRole.entities.Order.update(orderId, {
      status: fullRefund ? 'refunded' : order.status,
      refund_id: refund.id,
      refund_amount_usd: cumulativeUsd,
      refund_reason: reason,
      refunded_at: new Date().toISOString(),
      admin_notes: [
        order.admin_notes || '',
        `Refund ${refund.id}: ${fullRefund ? 'full' : 'partial'} ${currency.toUpperCase()} ${round2(refundMinor / 100).toFixed(2)}${reason ? ` — ${reason}` : ''}`,
        printId ? `Print order ${printId} status: ${print.status || 'unknown'} — cancel it in Merchize if it has not shipped.` : 'No print order was created.',
      ].filter(Boolean).join('\n'),
    });

    const notice = await sendRefundNotice({
      to: order.customer_email,
      customerName: order.customer_name,
      orderId,
      refundedUsd: fullRefund ? cumulativeUsd : thisRefundUsd,
      fullRefund,
      cancelled: fullRefund,
      reason,
    });

    console.log(`Order ${orderId}: refund ${refund.id} (${fullRefund ? 'full' : 'partial'}) — print status: ${print.status || 'unknown'}`);

    return Response.json({
      success: true,
      refund_id: refund.id,
      refunded_usd: thisRefundUsd,
      total_refunded_usd: cumulativeUsd,
      full_refund: fullRefund,
      print_status: print.status,
      print_action_required: printActionRequired,
      email_sent: notice.sent,
    });
  } catch (error) {
    console.error('refund-order error:', error);
    return Response.json({ error: error.message || 'Refund failed.' }, { status: 500 });
  }
}