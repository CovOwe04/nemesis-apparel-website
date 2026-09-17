import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { requireAdminPasscode, isSafeImageUrl } from '../../shared/security.ts';

const SIZES = [
  { name: 'XS', value: 'xs' },
  { name: 'S', value: 's' },
  { name: 'M', value: 'm' },
  { name: 'L', value: 'l' },
  { name: 'XL', value: 'xl' },
  { name: '2XL', value: '2xl' },
  { name: '3XL', value: '3xl' },
  { name: '4XL', value: '4xl' },
];

export default async function(req) {
  try {
    const body = await req.json();

    // Guest-only app: authenticate via admin passcode (not base44.auth.me)
    const denied = requireAdminPasscode(req, body.passcode);
    if (denied) return denied;

    const base44 = createClientFromRequest(req);
    const { jerseyId, variants, merchize_product_id, merchize_variants, colorArtwork, renderedImages, renderedArtwork } = body;

    if (!jerseyId || !variants || !Array.isArray(variants) || variants.length === 0) {
      return Response.json({ error: 'jerseyId and variants array required' });
    }

    const jersey = await base44.asServiceRole.entities.Jersey.get(jerseyId);
    if (!jersey) {
      return Response.json({ error: 'Jersey not found' });
    }

    const baseUrl = secrets.get('MERCHIZE_API_BASE_URL');
    const token = secrets.get('MERCHIZE_ACCESS_TOKEN');
    const apiKey = secrets.get('MERCHIZE_API_KEY');

    const baseProductId = merchize_product_id || jersey.merchize_product_id || '';
    const fallbackSkus = merchize_variants || jersey.merchize_variants || {};
    if (!baseProductId) {
      return Response.json({ error: 'No Merchize catalog product selected. Please choose a base product in the Merchize Fulfillment section before generating.' });
    }

    const results = [];
    for (const variant of variants) {
      const { color_name, combo_name, combo_number } = variant;
      const parts = [jersey.name, color_name, combo_name, combo_number].filter(Boolean);
      const variantLabel = parts.join(' - ');

      const colorObj = (jersey.colors || []).find((c) => c.name === color_name);
      const colorHex = colorObj?.hex || '#000000';
      const renderArtworkKey = `${color_name}|${combo_name}|${combo_number}`;
      const compositedFront = renderedArtwork?.[renderArtworkKey];
      const artworkUrls = { ...((colorArtwork && colorArtwork[color_name]) || {}) };
      if (compositedFront) artworkUrls.front = compositedFront;

      const productImages = [];
      const renderKey = `${color_name}|${combo_name}|${combo_number}`;
      const renderedImage = renderedImages?.[renderKey];
      if (renderedImage) productImages.push(renderedImage);
      if (colorObj?.images?.length > 0) {
        productImages.push(...colorObj.images.map((img) => img.url).filter(Boolean));
      } else {
        if (jersey.front_image) productImages.push(jersey.front_image);
        if (jersey.back_image && jersey.back_image !== jersey.front_image) productImages.push(jersey.back_image);
      }

      const attributes = [
        {
          is_preselected: true,
          position: 1,
          type: 'color',
          name: 'Color',
          values: [{ name: color_name || 'Default', value: colorHex }],
        },
        {
          is_preselected: false,
          position: 2,
          type: 'size',
          name: 'Size',
          values: SIZES,
        },
      ];

      const productVariants = SIZES.map((size, i) => ({
        is_default: i === 0,
        sku: fallbackSkus[size.name] || '',
        sku_seller: '',
        retail_price: jersey.price,
        currency: 'USD',
        options: [
          { name: color_name || 'Default', value: colorHex },
          { name: size.name, value: size.value },
        ],
      }));

      const payload = {
        title: variantLabel,
        description: jersey.description || '',
        images: productImages,
        base_product_id: baseProductId,
        attributes,
        variants: productVariants,
        is_collection_hidden: false,
        is_shop_hidden: false,
        is_stealthy: false,
        is_featured: false,
      };

      try {
        const createRes = await fetch(`${baseUrl}/product/products/dropship/create`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const createData = await createRes.json();
        if (!createRes.ok || !createData.success || !createData.data?._id) {
          results.push({
            color_name, combo_name, combo_number,
            merchize_product_id: '', title: '', variant_ids: {}, skus: {},
            success: false,
            error: createData.msg || createData.error || `HTTP ${createRes.status}`,
          });
          continue;
        }

        const productId = createData.data._id;

        // Fetch all variants for this product to get per-size variant IDs
        let variantIds = {};
        let skus = {};
        try {
          const variantsRes = await fetch(`${baseUrl}/product/products/${productId}/all-variants`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          const variantsData = await variantsRes.json();
          if (variantsData.success && Array.isArray(variantsData.data)) {
            for (const v of variantsData.data) {
              const sizeOption = v.options?.find((o) => o.attribute?.value_type === 'size');
              if (sizeOption) {
                const sizeKey = sizeOption.name.toUpperCase();
                variantIds[sizeKey] = v._id;
                skus[sizeKey] = v.sku || '';
              }
            }
          }
        } catch (err) {
          console.error(`Failed to fetch variants for product ${productId}:`, err.message);
        }

        // Upload artwork (front/back/sleeve/hood) to the created product
        let artworkUploaded = false;
        const artworkEntries = Object.entries(artworkUrls).filter(([, url]) => url);
        if (artworkEntries.length > 0) {
          try {
            const formData = new FormData();
            for (const [piece, url] of artworkEntries) {
              if (!isSafeImageUrl(url)) continue;
              const imgRes = await fetch(url);
              if (!imgRes.ok) continue;
              const blob = await imgRes.blob();
              const ext = (imgRes.headers.get('content-type') || 'image/png').split('/')[1]?.replace('svg+xml', 'svg') || 'png';
              formData.append(piece, blob, `${piece}.${ext}`);
            }
            if ([...formData.keys()].length > 0) {
              const artworkRes = await fetch(`${baseUrl}/artwork/artworks?product_id=${productId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
              });
              const artworkData = await artworkRes.json();
              artworkUploaded = artworkData.success === true;
              if (!artworkUploaded) {
                console.error(`Artwork upload returned non-success for ${productId}:`, artworkData.message);
              }
            }
            // Also try POST with artwork URLs directly on the product
            try {
              const artworkBody = {};
              for (const [piece, url] of artworkEntries) {
                artworkBody[piece] = url;
              }
              await fetch(`${baseUrl}/product/products/${productId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'x-api-key': apiKey, 'Content-Type': 'application/json' },
                body: JSON.stringify({ artwork: artworkBody }),
              });
            } catch (err) {
              console.error(`Failed to set artwork via POST for ${productId}:`, err.message);
            }
          } catch (err) {
            console.error(`Failed to upload artwork for product ${productId}:`, err.message);
          }
        }

        // Upload display images (mockups) to each variant
        let variantImagesUploaded = 0;
        if (Object.keys(variantIds).length > 0 && productImages.length > 0) {
          // Pre-fetch all display images as blobs once
          const imageBlobs = [];
          for (const imgUrl of productImages) {
            try {
              if (!isSafeImageUrl(imgUrl)) continue;
              const imgRes = await fetch(imgUrl);
              if (!imgRes.ok) continue;
              const blob = await imgRes.blob();
              const ext = (imgRes.headers.get('content-type') || 'image/png').split('/')[1]?.replace('svg+xml', 'svg') || 'png';
              imageBlobs.push({ blob, ext });
            } catch (err) {
              console.error(`Failed to fetch display image ${imgUrl}:`, err.message);
            }
          }
          for (const variantId of Object.values(variantIds)) {
            try {
              const formData = new FormData();
              for (const { blob, ext } of imageBlobs) {
                formData.append('images', blob, `image.${ext}`);
              }
              if ([...formData.keys()].length > 0) {
                const variantImgRes = await fetch(`${baseUrl}/product/variants/${variantId}/image`, {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${token}` },
                  body: formData,
                });
                const variantImgData = await variantImgRes.json();
                if (variantImgData.success) variantImagesUploaded++;
              }
            } catch (err) {
              console.error(`Failed to upload image to variant ${variantId}:`, err.message);
            }
          }
        }

        results.push({
          color_name, combo_name, combo_number,
          merchize_product_id: productId,
          title: variantLabel,
          variant_ids: variantIds,
          skus,
          artwork_uploaded: artworkUploaded,
          variant_images_uploaded: variantImagesUploaded,
          success: true,
        });
      } catch (err) {
        results.push({
          color_name, combo_name, combo_number,
          merchize_product_id: '', title: '', variant_ids: {}, skus: {},
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