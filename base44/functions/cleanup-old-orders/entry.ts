import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // Allow if: internal platform call (workflow engine), admin user (manual trigger),
    // or valid shared secret (legacy). The platform sets base44-service-authorization
    // on internal invocations — external public requests cannot forge it.
    let isAuthorized = false;
    if (req.headers.get('base44-service-authorization')) {
      isAuthorized = true;
    } else if (body.secret && body.secret === secrets.get('CLEANUP_SECRET')) {
      isAuthorized = true;
    } else {
      try {
        const user = await base44.auth.me();
        if (user && user.role === 'admin') isAuthorized = true;
      } catch {
        // no user context — not an admin call
      }
    }
    if (!isAuthorized) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete fulfilled orders older than 60 days
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const cutoffIso = sixtyDaysAgo.toISOString();

    await base44.asServiceRole.entities.Order.deleteMany({
      status: 'fulfilled',
      created_date: { $lt: cutoffIso },
    });

    console.log(`Cleanup: deleted fulfilled orders older than ${cutoffIso}`);
    return Response.json({
      success: true,
      cutoff: cutoffIso,
      deleted: true,
    });
  } catch (error) {
    console.error('cleanup-old-orders error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}