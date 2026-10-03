import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import { requireAdminPasscode } from '../../shared/security.ts';

// Verifies which stored Merchize product IDs still exist. Used by the listing
// editor so that a product deleted in Merchize is detected on Update Listing
// and offered for regeneration instead of being treated as already generated.
export default async function(req) {
  try {
    const body = await req.json();
    const denied = requireAdminPasscode(req, body.passcode);
    if (denied) return denied;

    const { productIds } = body;
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return Response.json({ missing: [], existing: [] });
    }

    const baseUrl = secrets.get('MERCHIZE_API_BASE_URL');
    const token = secrets.get('MERCHIZE_ACCESS_TOKEN');
    if (!baseUrl || !token) {
      return Response.json({ error: 'Merchize credentials not configured' }, { status: 500 });
    }

    const uniqueIds = [...new Set(productIds.filter(Boolean))];
    const missing = [];
    const existing = [];

    await Promise.all(uniqueIds.map(async (productId) => {
      try {
        const res = await fetch(`${baseUrl}/product/products/${encodeURIComponent(productId)}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        // Merchize soft-deletes products: they still load but carry is_deleted.
        if (res.ok && data.success && data.data?._id && !data.data.is_deleted) {
          existing.push(productId);
        } else {
          missing.push(productId);
        }
      } catch (err) {
        // Network/parse error — treat as missing so the admin is prompted to regenerate
        missing.push(productId);
      }
    }));

    return Response.json({ missing, existing });
  } catch (error) {
    console.error('verify-merchize-products error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}