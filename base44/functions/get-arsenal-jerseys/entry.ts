import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const accessCode = (body?.accessCode || '').trim();
    const clubCode = (body?.clubCode || '').trim().toUpperCase();

    // If a club code is provided, look up the club and filter to its listings
    let club = null;
    if (clubCode) {
      const clubs = await base44.asServiceRole.entities.Club.filter(
        { code: clubCode },
        '-created_date',
        10
      );
      club = (clubs || [])[0] || null;
      // A malformed or expired share link must never fall back to the full catalog.
      if (!club) return Response.json({ jerseys: [], club: null });
    }

    const now = Date.now();
    const clubIsAvailable = !club || (
      (!club.available_from || new Date(club.available_from).getTime() <= now) &&
      (!club.available_until || new Date(club.available_until).getTime() >= now)
    );
    if (!clubIsAvailable) {
      return Response.json({
        jerseys: [],
        club: { name: club.name, description: club.description || '' },
      });
    }

    const allJerseys = await base44.asServiceRole.entities.Jersey.list('-created_date', 100);

    const clubListingIds = new Set(club?.jersey_ids || []);
    let jerseys = (allJerseys || []).filter((j) => {
      if (!j.is_private) return true;
      // A valid club link is also the access credential for its own listings.
      if (clubListingIds.has(j.id)) return true;
      return j.private_access_code && j.private_access_code === accessCode;
    });

    // Club filtering: only show listings associated with this club
    if (club) {
      jerseys = jerseys.filter((j) => clubListingIds.has(j.id));
    }

    jerseys = jerseys
      .map((j) => {
        const { private_access_code, ...rest } = j;
        return rest;
      })
      .sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999));

    return Response.json({
      jerseys,
      club: club ? { name: club.name, description: club.description || '' } : null,
    });
  } catch (error) {
    console.error('get-arsenal-jerseys error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
