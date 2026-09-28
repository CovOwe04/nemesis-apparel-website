import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { requireAdminPasscode } from '../../shared/security.ts';

const SYSTEM_FIELDS = ['id', 'created_date', 'updated_date', 'created_by', 'owner_id'];

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { jerseyId, listing, passcode } = body;

    const denied = requireAdminPasscode(req, passcode);
    if (denied) return denied;

    if (!listing || typeof listing !== 'object' || Array.isArray(listing)) {
      return Response.json({ error: 'listing data is required' }, { status: 400 });
    }

    const listingData = { ...listing };
    for (const field of SYSTEM_FIELDS) delete listingData[field];

    const base44 = createClientFromRequest(req);
    const jerseys = base44.asServiceRole.entities.Jersey;

    if (jerseyId) {
      if (typeof jerseyId !== 'string') {
        return Response.json({ error: 'jerseyId must be a string' }, { status: 400 });
      }
      const existingListing = await jerseys.get(jerseyId);
      if (!existingListing) {
        return Response.json({ error: 'Listing not found' }, { status: 404 });
      }
      await jerseys.update(jerseyId, listingData);
      return Response.json({ success: true, id: jerseyId });
    }

    const createdListing = await jerseys.create(listingData);
    return Response.json({ success: true, id: createdListing.id });
  } catch (error) {
    console.error('save-listing error:', error);
    return Response.json(
      { error: error?.message || 'Could not save listing' },
      { status: 500 },
    );
  }
}
