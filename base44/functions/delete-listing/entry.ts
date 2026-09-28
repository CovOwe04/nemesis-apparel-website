import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { requireAdminPasscode } from '../../shared/security.ts';

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { jerseyId, passcode } = body;

    const denied = requireAdminPasscode(req, passcode);
    if (denied) return denied;

    if (!jerseyId || typeof jerseyId !== 'string') {
      return Response.json({ error: 'jerseyId is required' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const jerseys = base44.asServiceRole.entities.Jersey;
    const listing = await jerseys.get(jerseyId);
    if (!listing) {
      return Response.json({ error: 'Listing not found' }, { status: 404 });
    }

    await jerseys.delete(jerseyId);
    return Response.json({ success: true, id: jerseyId });
  } catch (error) {
    console.error('delete-listing error:', error);
    return Response.json(
      { error: error?.message || 'Could not delete listing' },
      { status: 500 },
    );
  }
}
