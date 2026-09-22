import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { requireAdminPasscode } from '../../shared/security.ts';

export default async function(req) {
  try {
    const body = await req.json().catch(() => ({}));

    // Guest-only app: authenticate via admin passcode (not base44.auth.me)
    const denied = requireAdminPasscode(req, body.passcode);
    if (denied) return denied;

    const search = (body.search || '').trim();
    const page = Number(body.page) || 1;

    const baseUrl = secrets.get('MERCHIZE_API_BASE_URL');
    const token = secrets.get('MERCHIZE_ACCESS_TOKEN');
    const apiKey = secrets.get('MERCHIZE_API_KEY');
    if (!baseUrl || !token || !apiKey) {
      return Response.json({ error: 'Merchize API credentials are not configured.' }, { status: 503 });
    }

    const params = new URLSearchParams();
    params.append('limit', '50');
    params.append('page', String(page));
    if (search) params.append('search', search);

    const catalogUrl = new URL(`${baseUrl.replace(/\/+$/, '')}/product/catalog`);
    catalogUrl.search = params.toString();
    const res = await fetch(catalogUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) {
      return Response.json({ error: data.msg || data.message || data.error || `Merchize API error (${res.status})` }, { status: 502 });
    }

    const productList = Array.isArray(data)
      ? data
      : Array.isArray(data.data)
        ? data.data
        : data.data?.products || data.products || data.data?.items || data.items || [];
    const products = productList.map((p) => ({
      id: p._id || p.id,
      title: p.title,
      sku: p.sku,
      printing_methods: p.printing_methods || [],
      fulfillment_location: p.fulfillment_location?.name || p.fulfillment_location || '',
      variants: (Array.isArray(p.variants) ? p.variants : []).map((v) => ({
        id: v._id,
        sku: v.sku,
        size: v.attributes?.find((a) => a.type === 'size')?.value_text || 'Default',
      })),
    }));

    return Response.json({
      products,
      total: data.data?.total ?? data.total ?? productList.length,
      page,
      hasMore: page * 50 < (data.data?.total ?? data.total ?? productList.length),
    });
  } catch (error) {
    console.error('get-merchize-catalog error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
