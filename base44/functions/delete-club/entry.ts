import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { requireAdminPasscode } from '../../shared/security.ts';

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { clubId, passcode } = body;

    const denied = requireAdminPasscode(req, passcode);
    if (denied) return denied;

    if (!clubId || typeof clubId !== 'string') {
      return Response.json({ error: 'clubId is required' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const clubs = base44.asServiceRole.entities.Club;
    const jerseys = base44.asServiceRole.entities.Jersey;
    const club = await clubs.get(clubId);
    if (!club) return Response.json({ error: 'Club not found' }, { status: 404 });

    for (const jerseyId of club.jersey_ids || []) {
      try {
        const jersey = await jerseys.get(jerseyId);
        if (jersey?.club_id === clubId) await jerseys.update(jerseyId, { club_id: '' });
      } catch {
        // Jersey may have been deleted already — skip it.
      }
    }
    await clubs.delete(clubId);

    return Response.json({ success: true, id: clubId });
  } catch (error) {
    console.error('delete-club error:', error);
    return Response.json(
      { error: error?.message || 'Could not delete club' },
      { status: 500 },
    );
  }
}