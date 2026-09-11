import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

export default async function(req) {
  try {
    const body = await req.json();
    const { passcode } = body;

    // Validate admin passcode (guest-only app — no real auth session)
    const adminPasscode = secrets.get('ADMIN_PASSCODE') || '';
    if (!passcode || passcode !== adminPasscode) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);
    const orders = await base44.asServiceRole.entities.Order.list('-created_date', 100);
    return Response.json({ orders: orders || [] });
  } catch (error) {
    console.error('get-admin-orders error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}