import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { requireAdminPasscode } from '../../shared/security.ts';

const SYSTEM_FIELDS = ['id', 'created_date', 'updated_date', 'created_by', 'owner_id'];

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { promoId, promo, action, passcode } = body;

    const denied = requireAdminPasscode(req, passcode);
    if (denied) return denied;

    const base44 = createClientFromRequest(req);
    const promos = base44.asServiceRole.entities.PromoCode;

    if (action === 'list') {
      const list = await promos.list('-created_date', 200);
      return Response.json({ success: true, promos: list });
    }

    if (action === 'delete') {
      if (typeof promoId !== 'string') {
        return Response.json({ error: 'promoId is required' }, { status: 400 });
      }
      await promos.delete(promoId);
      return Response.json({ success: true });
    }

    if (!promo || typeof promo !== 'object' || Array.isArray(promo)) {
      return Response.json({ error: 'promo data is required' }, { status: 400 });
    }

    const promoData = { ...promo };
    for (const field of SYSTEM_FIELDS) delete promoData[field];

    if (promoId) {
      if (typeof promoId !== 'string') {
        return Response.json({ error: 'promoId must be a string' }, { status: 400 });
      }
      const existing = await promos.get(promoId);
      if (!existing) {
        return Response.json({ error: 'Promo code not found' }, { status: 404 });
      }
      await promos.update(promoId, promoData);
      return Response.json({ success: true, id: promoId });
    }

    const created = await promos.create(promoData);
    return Response.json({ success: true, id: created.id });
  } catch (error) {
    console.error('save-promo-code error:', error);
    return Response.json(
      { error: error?.message || 'Could not save promo code' },
      { status: 500 },
    );
  }
}