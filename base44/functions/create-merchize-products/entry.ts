import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

export default async function(req) {
  try {
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

    const body = await req.json();
    const { jerseyId, variants } = body;

    if (!jerseyId || !variants || !Array.isArray(variants) || variants.length === 0) {
      return Response.json({ error: 'jerseyId and variants array required' }, { status: 400 });
    }

    const jersey = await base44.asServiceRole.entities.Jersey.get(jerseyId);
    if (!jersey) {
      return Response.json({ error: 'Jersey not found' }, { status: 404 });
    }

    const baseUrl = secrets.get('MERCHIZE_API_BASE_URL');
    const token = secrets.get('MERCHIZE_ACCESS_TOKEN');
    const apiKey = secrets.get('MERCHIZE_API_KEY');

    const results = [];
    for (const variant of variants) {
      const { color_name, combo_name, combo_number } = variant;
      const parts = [jersey.name, color_name, combo_name, combo_number].filter(Boolean);
      const variantLabel = parts.join(' - ');
      const skuBase = `NEMESIS-${jersey.name}-${color_name}-${combo_name}${combo_number}`
        .toUpperCase()
        .replace(/[^A-Z0-9-]/g, '')
        .replace(/-+/g, '-');

      const colorObj = (jersey.colors || []).find((c) => c.name === color_name);
      const designImage = colorObj?.images?.[0]?.url || jersey.front_image || '';
      const backImage = colorObj?.images?.[1]?.url || jersey.back_image || designImage;

      const payload = {
        title: variantLabel,
        sku: skuBase,
        description: jersey.description || '',
        design_images: {
          front: designImage,
          back: backImage,
        },
        print_preview: designImage,
        printing_method: 'dtg',
      };

      try {
        const res = await fetch(`${baseUrl}/product/catalog`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (res.ok && data.success && data.data?._id) {
          results.push({
            color_name,
            combo_name,
            combo_number,
            merchize_product_id: data.data._id,
            success: true,
          });
        } else {
          results.push({
            color_name,
            combo_name,
            combo_number,
            merchize_product_id: '',
            success: false,
            error: data.msg || data.error || `HTTP ${res.status}`,
          });
        }
      } catch (err) {
        results.push({
          color_name,
          combo_name,
          combo_number,
          merchize_product_id: '',
          success: false,
          error: err.message,
        });
      }
    }

    return Response.json({ results });
  } catch (error) {
    console.error('create-merchize-products error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}