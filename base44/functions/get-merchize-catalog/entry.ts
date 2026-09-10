import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

export default async function(req) {
  try {
    // Admin-only: verify caller is an authenticated admin user
    const base44 = createClientFromRequest(req);
    let user;
    try {
      user = await base44.auth.me();
    } catch {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const search = (body.search || '').trim();
    const page = Number(body.page) || 1;

    const baseUrl = secrets.get('MERCHIZE_API_BASE_URL');
    const token = secrets.get('MERCHIZE_ACCESS_TOKEN');
    const apiKey = secrets.get('MERCHIZE_API_KEY');

    const params = new URLSearchParams();
    params.append('limit', '50');
    params.append('page', String(page));
    if (search) params.append('search', search);

    const res = await fetch(`${baseUrl}/product/catalog?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    const data = await res.json();
    if (!data.success) {
      return Response.json({ error: data.msg || 'Merchize API error' }, { status: 502 });
    }

    const products = (data.data?.products || []).map((p) => ({
      id: p._id,
      title: p.title,
      sku: p.sku,
      printing_methods: p.printing_methods || [],
      fulfillment_location: p.fulfillment_location?.name || '',
      variants: (p.variants || []).map((v) => ({
        id: v._id,
        sku: v.sku,
        size: v.attributes?.find((a) => a.type === 'size')?.value_text || 'Default',
      })),
    }));

    return Response.json({
      products,
      total: data.data?.total || 0,
      page,
      hasMore: page * 50 < (data.data?.total || 0),
    });
  } catch (error) {
    console.error('get-merchize-catalog error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}