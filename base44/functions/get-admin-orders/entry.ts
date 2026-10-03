import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { requireAdminPasscode } from '../../shared/security.ts';

export default async function(req) {
  try {
    const body = await req.json();
    const { passcode } = body;

    const denied = requireAdminPasscode(req, passcode);
    if (denied) return denied;

    const base44 = createClientFromRequest(req);

    if (body.action === 'delete' && body.orderId) {
      await base44.asServiceRole.entities.Order.delete(body.orderId);
      return Response.json({ success: true, deleted: body.orderId });
    }

    const orders = await base44.asServiceRole.entities.Order.list('-created_date', 100);
    return Response.json({ orders: orders || [] });
  } catch (error) {
    console.error('get-admin-orders error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}