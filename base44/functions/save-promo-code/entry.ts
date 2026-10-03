import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { requireAdminPasscode } from '../../shared/security.ts';

const SYSTEM_FIELDS = ['id', 'created_date', 'updated_date', 'created_by', 'owner_id'];

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { promoId, promo, action, passcode, code, items } = body;

    const base44 = createClientFromRequest(req);
    const promos = base44.asServiceRole.entities.PromoCode;

    // Public: validate a promo code against the current cart (guest checkout).
    if (action === 'validate') {
      const normalizedCode = String(code || '').toUpperCase().trim();
      if (!normalizedCode) {
        return Response.json({ valid: false, error: 'Enter a promo code' }, { status: 400 });
      }
      const cartItems = Array.isArray(items) ? items : [];
      const found = await promos.filter({ code: normalizedCode }, '-created_date', 10);
      const promoCode = (found || [])[0];
      if (!promoCode) {
        return Response.json({ valid: false, error: 'Invalid promo code' });
      }
      if (!promoCode.active) {
        return Response.json({ valid: false, error: 'This promo code is no longer active' });
      }
      const now = new Date();
      if (promoCode.start_date && new Date(promoCode.start_date) > now) {
        return Response.json({ valid: false, error: 'This promo code is not yet active' });
      }
      if (promoCode.end_date && new Date(promoCode.end_date) < now) {
        return Response.json({ valid: false, error: 'This promo code has expired' });
      }
      if (promoCode.max_redemptions > 0 && (promoCode.times_used || 0) >= promoCode.max_redemptions) {
        return Response.json({ valid: false, error: 'This promo code has reached its redemption limit' });
      }
      const matchingItems = cartItems.filter((i) => i.jerseyId === promoCode.jersey_id);
      if (matchingItems.length === 0) {
        return Response.json({ valid: false, error: 'This promo code does not apply to items in your cart' });
      }
      const matchingSubtotal = matchingItems.reduce(
        (s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0
      );
      if (promoCode.min_order_value > 0 && matchingSubtotal < promoCode.min_order_value) {
        return Response.json({ valid: false, error: `Minimum order value of $${promoCode.min_order_value} required for this code` });
      }
      let discountUsd = promoCode.discount_type === 'percentage'
        ? Math.round(matchingSubtotal * (promoCode.discount_value / 100) * 100) / 100
        : Math.min(Number(promoCode.discount_value) || 0, matchingSubtotal);
      if (promoCode.max_discount_value > 0 && discountUsd > promoCode.max_discount_value) {
        discountUsd = promoCode.max_discount_value;
      }
      return Response.json({
        valid: true,
        code: promoCode.code,
        promoId: promoCode.id,
        jerseyId: promoCode.jersey_id,
        description: promoCode.description || '',
        discountType: promoCode.discount_type,
        discountValue: Number(promoCode.discount_value) || 0,
        minOrderValue: Number(promoCode.min_order_value) || 0,
        maxDiscountValue: Number(promoCode.max_discount_value) || 0,
        discountUsd,
      });
    }

    // Admin-only actions below.
    const denied = requireAdminPasscode(req, passcode);
    if (denied) return denied;

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