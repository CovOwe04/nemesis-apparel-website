import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { requireAdminPasscode } from '../../shared/security.ts';

function isFulfilledStatus(value: unknown) {
  const status = String(value || '').trim().toLowerCase().replace(/[_-]+/g, ' ');
  return /^(fulfilled|fulfill|complete|completed|shipped|delivered|in transit|shipment started)$/.test(status);
}

export default async function(req: Request) {
  try {
    const body = await req.json();
    const denied = requireAdminPasscode(req, body.passcode);
    if (denied) return denied;

    if (!body.orderId) return Response.json({ error: 'orderId required' }, { status: 400 });

    const base44 = createClientFromRequest(req);
    const order = await base44.asServiceRole.entities.Order.get(body.orderId);
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });
    if (order.status === 'fulfilled') {
      return Response.json({ success: true, status: 'fulfilled', merchize_status: 'already fulfilled' });
    }
    if (order.status !== 'approved' || !order.merchize_order_id) {
      return Response.json({ error: 'Only orders already created in Merchize can be synced.' }, { status: 400 });
    }

    const baseUrl = secrets.get('MERCHIZE_API_BASE_URL');
    const token = secrets.get('MERCHIZE_ACCESS_TOKEN');
    if (!baseUrl || !token) {
      return Response.json({ error: 'Merchize API credentials are not configured.' }, { status: 503 });
    }

    const detailUrl = new URL(`${baseUrl}/order/external/orders/order-detail`);
    detailUrl.searchParams.set('external_number', order.id);
    detailUrl.searchParams.set('identifier', 'nemesis-apparel.base44.app');
    const detailRes = await fetch(detailUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const detail = await detailRes.json();
    if (!detailRes.ok || !detail.success) {
      return Response.json({ error: detail.message || `Merchize status lookup failed (HTTP ${detailRes.status}).` }, { status: 502 });
    }

    const orderStatus = detail.data?.order_status || '';
    const shipmentStatuses = (detail.data?.shipment_statuses || []).map((shipment) =>
      typeof shipment === 'string' ? shipment : shipment.status || shipment.progress_status || shipment.name || ''
    );
    const fulfilled = isFulfilledStatus(orderStatus) || shipmentStatuses.some(isFulfilledStatus);
    if (fulfilled) {
      await base44.asServiceRole.entities.Order.update(order.id, {
        status: 'fulfilled',
        admin_notes: `${order.admin_notes || ''}\nMerchize fulfillment confirmed: ${orderStatus || shipmentStatuses.join(', ')}`.trim(),
      });
    }

    return Response.json({
      success: true,
      status: fulfilled ? 'fulfilled' : 'approved',
      merchize_status: orderStatus || shipmentStatuses.join(', ') || 'Status unavailable',
    });
  } catch (error) {
    console.error('sync-merchize-order-status error:', error);
    return Response.json({ error: error.message || 'Could not sync Merchize order status.' }, { status: 500 });
  }
}
