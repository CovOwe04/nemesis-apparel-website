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
    const { jerseyId, color_name, artwork } = body;

    if (!jerseyId || !color_name) {
      return Response.json({ error: 'jerseyId and color_name required' });
    }

    const jersey = await base44.asServiceRole.entities.Jersey.get(jerseyId);
    if (!jersey) {
      return Response.json({ error: 'Jersey not found' });
    }

    const variantEntries = (jersey.variant_merchize_ids || []).filter(
      (v) => v.color_name === color_name && v.merchize_product_id
    );

    if (variantEntries.length === 0) {
      return Response.json({ error: 'No Merchize products found for this color. Generate products first.' });
    }

    const baseUrl = secrets.get('MERCHIZE_API_BASE_URL');
    const token = secrets.get('MERCHIZE_ACCESS_TOKEN');
    const apiKey = secrets.get('MERCHIZE_API_KEY');

    const productIds = [...new Set(variantEntries.map((v) => v.merchize_product_id))];
    const artworkMap = {
      front: artwork?.front || '',
      back: artwork?.back || '',
      sleeve: artwork?.sleeve || '',
      hood: artwork?.hood || '',
    };
    const artworkEntries = Object.entries(artworkMap).filter(([, url]) => url);

    const results = [];
    for (const productId of productIds) {
      try {
        if (artworkEntries.length > 0) {
          const formData = new FormData();
          for (const [piece, url] of artworkEntries) {
            try {
              const imgRes = await fetch(url);
              if (!imgRes.ok) continue;
              const blob = await imgRes.blob();
              const ext = (imgRes.headers.get('content-type') || 'image/png').split('/')[1]?.replace('svg+xml', 'svg') || 'png';
              formData.append(piece, blob, `${piece}.${ext}`);
            } catch (err) {
              console.error(`Failed to fetch ${piece} artwork:`, err.message);
            }
          }
          if ([...formData.keys()].length > 0) {
            const artworkRes = await fetch(`${baseUrl}/artwork/artworks?product_id=${productId}`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` },
              body: formData,
            });
            const artworkData = await artworkRes.json();
            if (!artworkData.success) {
              console.error(`Artwork multipart upload failed for ${productId}:`, artworkData.message);
            }
          }
        }

        try {
          await fetch(`${baseUrl}/product/products/${productId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'x-api-key': apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ artwork: artworkMap }),
          });
        } catch (err) {
          console.error(`Failed to set artwork URLs for ${productId}:`, err.message);
        }

        results.push({ product_id: productId, success: true });
      } catch (err) {
        results.push({ product_id: productId, success: false, error: err.message });
      }
    }

    return Response.json({ results, product_count: productIds.length });
  } catch (error) {
    console.error('upload-merchize-artwork error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}