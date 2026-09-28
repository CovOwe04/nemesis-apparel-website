import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
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
    // Public visitors see public listings. A valid Club link grants access only
    // to listings explicitly associated with that Club.
    let jerseys = (allJerseys || []).filter((j) => club
      ? clubListingIds.has(j.id)
      : !j.is_private
    ).map((j) => {
      // Older records may still contain the retired listing-level code.
      const { private_access_code, ...safeJersey } = j;
      return safeJersey;
    });

    jerseys = jerseys
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
