import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const accessCode = (body?.accessCode || '').trim();

    const allJerseys = await base44.asServiceRole.entities.Jersey.list('-created_date', 100);

    const jerseys = (allJerseys || [])
      .filter((j) => {
        if (!j.is_private) return true;
        return j.private_access_code && j.private_access_code === accessCode;
      })
      .map((j) => {
        const { private_access_code, ...rest } = j;
        return rest;
      })
      .sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999));

    return Response.json({ jerseys });
  } catch (error) {
    console.error('get-arsenal-jerseys error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}