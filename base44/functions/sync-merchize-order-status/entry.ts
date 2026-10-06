import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { requireAdminPasscode } from '../../shared/security.ts';

function isFulfilledStatus(value: unknown) {
  const status = String(value || '').trim().toLowerCase().replace(/[_-]+/g, ' ');
  return /^(fulfilled|fulfill|complete|completed|shipped|delivered|in transit|shipment started)$/.test(status);
}

async function syncOrder(base44: any, baseUrl: string, token: string, apiKey: string, order: any) {
  if (order.status === 'fulfilled') return { id: order.id, status: 'fulfilled', skipped: true };
  if (order.status !== 'approved' || !order.merchize_order_id) {
    return { id: order.id, skipped: true };
  }

  const detailUrl = new URL(`${baseUrl}/order/external/orders/order-detail`);
  detailUrl.searchParams.set('external_number', order.id);
  detailUrl.searchParams.set('identifier', 'nemesis-apparel.base44.app');
  const detailRes = await fetch(detailUrl, { headers: { Authorization: `Bearer ${token}`, 'x-api-key': apiKey } });
  const detail = await detailRes.json();
  if (!detailRes.ok || !detail.success) {
    return { id: order.id, error: detail.message || `HTTP ${detailRes.status}` };
  }

  const orderStatus = detail.data?.order_status || '';
  const shipmentStatuses = (detail.data?.shipment_statuses || []).map((shipment: any) =>
    typeof shipment === 'string' ? shipment : shipment.status || shipment.progress_status || shipment.name || ''
  );
  const fulfilled = isFulfilledStatus(orderStatus) || shipmentStatuses.some(isFulfilledStatus);
  if (fulfilled) {
    await base44.asServiceRole.entities.Order.update(order.id, {
      status: 'fulfilled',
      admin_notes: `${order.admin_notes || ''}\nMerchize fulfillment confirmed: ${orderStatus || shipmentStatuses.join(', ')}`.trim(),
    });
  }
  return {
    id: order.id,
    status: fulfilled ? 'fulfilled' : 'approved',
    merchize_status: orderStatus || shipmentStatuses.join(', ') || 'Status unavailable',
  };
}

export default async function(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const base44 = createClientFromRequest(req);
    const baseUrl = secrets.get('MERCHIZE_API_BASE_URL');
    const token = secrets.get('MERCHIZE_ACCESS_TOKEN');
    const apiKey = secrets.get('MERCHIZE_API_KEY');
    if (!baseUrl || !token) {
      return Response.json({ error: 'Merchize API credentials are not configured.' }, { status: 503 });
    }

    // Batch mode: no orderId. Only the workflow engine (service authorization)
    // or a valid shared secret may trigger a full sync — public callers cannot.
    if (!body.orderId) {
      const isServiceCall = Boolean(req.headers.get('base44-service-authorization'));
      const hasSecret = body.secret && body.secret === secrets.get('CLEANUP_SECRET');
      if (!isServiceCall && !hasSecret) {
        const denied = requireAdminPasscode(req, body.passcode);
        if (denied) return denied;
      }

      const orders = await base44.asServiceRole.entities.Order.filter({ status: 'approved' }, '-created_date', 200);
      const approved = (orders || []).filter((o: any) => o.merchize_order_id);
      const results = [];
      for (const order of approved) {
        try {
          results.push(await syncOrder(base44, baseUrl, token, apiKey, order));
        } catch (err) {
          results.push({ id: order.id, error: err.message || 'sync failed' });
        }
      }
      const fulfilledCount = results.filter((r) => r.status === 'fulfilled').length;
      return Response.json({ success: true, checked: approved.length, fulfilled: fulfilledCount, results });
    }

    // Single-order manual sync (admin passcode required)
    const denied = requireAdminPasscode(req, body.passcode);
    if (denied) return denied;

    const order = await base44.asServiceRole.entities.Order.get(body.orderId);
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });
    const result = await syncOrder(base44, baseUrl, token, apiKey, order);
    return Response.json({ success: true, ...result });
  } catch (error) {
    console.error('sync-merchize-order-status error:', error);
    return Response.json({ error: error.message || 'Could not sync Merchize order status.' }, { status: 500 });
  }
}