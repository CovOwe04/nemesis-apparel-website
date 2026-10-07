import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { requireAdminPasscode } from '../../shared/security.ts';

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { updates, passcode } = body;

    const denied = requireAdminPasscode(req, passcode);
    if (denied) return denied;

    if (!Array.isArray(updates) || updates.length === 0) {
      return Response.json({ error: 'updates must be a non-empty array' }, { status: 400 });
    }

    // Normalize + validate each entry so callers can't smuggle extra fields.
    const clean = updates.map((u) => ({
      id: String(u?.id),
      sort_order: Number(u?.sort_order),
    }));
    if (clean.some((u) => !u.id || Number.isNaN(u.sort_order))) {
      return Response.json({ error: 'Each update needs an id and numeric sort_order' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    await base44.asServiceRole.entities.Jersey.bulkUpdate(clean);
    return Response.json({ success: true, count: clean.length });
  } catch (error) {
    console.error('reorder-listings error:', error);
    return Response.json(
      { error: error?.message || 'Could not reorder listings' },
      { status: 500 },
    );
  }
}