import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { requireAdminPasscode } from '../../shared/security.ts';

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { clubId, club, passcode } = body;

    const denied = requireAdminPasscode(req, passcode);
    if (denied) return denied;

    if (!club || typeof club !== 'object' || Array.isArray(club)) {
      return Response.json({ error: 'club data is required' }, { status: 400 });
    }

    const name = String(club.name || '').trim();
    const code = String(club.code || '').trim().toUpperCase();
    if (!name || !code) {
      return Response.json({ error: 'Club name and code are required' }, { status: 400 });
    }

    const jerseyIds = Array.isArray(club.jersey_ids)
      ? [...new Set(club.jersey_ids.filter((id) => typeof id === 'string' && id))]
      : [];
    const clubData = {
      name,
      code,
      description: String(club.description || ''),
      net_terms: String(club.net_terms || ''),
      available_from: String(club.available_from || ''),
      available_until: String(club.available_until || ''),
      jersey_ids: jerseyIds,
    };

    const base44 = createClientFromRequest(req);
    const clubs = base44.asServiceRole.entities.Club;
    const jerseys = base44.asServiceRole.entities.Jersey;
    const matches = await clubs.filter({ code }, '-created_date', 100);
    const duplicate = (matches || []).find((item) => item.id !== clubId);
    if (duplicate) {
      return Response.json({ error: 'That club code is already in use. Generate a new one.' }, { status: 409 });
    }

    let savedClub;
    let previousIds = [];
    if (clubId) {
      if (typeof clubId !== 'string') {
        return Response.json({ error: 'clubId must be a string' }, { status: 400 });
      }
      savedClub = await clubs.get(clubId);
      if (!savedClub) return Response.json({ error: 'Club not found' }, { status: 404 });
      previousIds = savedClub.jersey_ids || [];
      await clubs.update(clubId, clubData);
      savedClub = { ...savedClub, ...clubData, id: clubId };
    } else {
      savedClub = await clubs.create(clubData);
    }

    const oldIds = new Set(previousIds);
    const newIds = new Set(jerseyIds);
    for (const jerseyId of newIds) {
      if (oldIds.has(jerseyId)) continue;
      const jersey = await jerseys.get(jerseyId);
      if (jersey) await jerseys.update(jerseyId, { club_id: savedClub.id });
    }
    for (const jerseyId of oldIds) {
      if (newIds.has(jerseyId)) continue;
      const jersey = await jerseys.get(jerseyId);
      if (jersey?.club_id === savedClub.id) await jerseys.update(jerseyId, { club_id: '' });
    }

    return Response.json({ success: true, id: savedClub.id });
  } catch (error) {
    console.error('save-club error:', error);
    return Response.json(
      { error: error?.message || 'Could not save club' },
      { status: 500 },
    );
  }
}
