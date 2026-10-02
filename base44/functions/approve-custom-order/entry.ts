import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { createCustomProduct, createMerchizeOrder, importMerchizeOrderArtworks, resolveListingArtwork } from '../../shared/merchize.ts';
import { isSafeImageUrl, requireAdminPasscode } from '../../shared/security.ts';

export default async function (req) {
  try {
    const body = await req.json();
    const { orderId, compositedArtwork, compositedDisplay, passcode } = body;

    const denied = requireAdminPasscode(req, passcode);
    if (denied) return denied;

    const base44 = createClientFromRequest(req);
    if (!orderId) {
      return Response.json({ error: 'orderId required' });
    }

    const order = await base44.asServiceRole.entities.Order.get(orderId);
    if (!order) {
      return Response.json({ error: 'Order not found' });
    }
    const retryingExistingOrder = order.status === 'approved' && !!order.merchize_order_id;
    if (order.status !== 'pending_approval' && !retryingExistingOrder) {
      return Response.json({ error: 'Order is not pending approval' });
    }

    const cartItems = JSON.parse(order.items_json || '[]');
    const shippingAddress = JSON.parse(order.shipping_address_json || '{}');
    const customerName = order.customer_name || '';
    const customerEmail = order.customer_email || '';

    // Fetch the exact listings referenced by this order. A list capped at 100
    // can omit older listings and leave `jersey` undefined during approval.
    const jerseyIds = [...new Set(cartItems.map((item) => item.jerseyId).filter(Boolean))];
    const jerseyRecords = await Promise.all(jerseyIds.map(async (jerseyId) => {
      try {
        return await base44.asServiceRole.entities.Jersey.get(jerseyId);
      } catch (error) {
        console.error(`Could not load listing ${jerseyId} for order ${orderId}:`, error.message || error);
        return null;
      }
    }));
    const jerseyMap = new Map(jerseyRecords.filter(Boolean).map((jersey) => [jersey.id, jersey]));
    const missingListing = cartItems.find((item) => item.jerseyId && !jerseyMap.has(item.jerseyId));
    if (missingListing) {
      return Response.json({
        error: `Could not load the listing for ${missingListing.name || 'this item'}. Refresh the order and try again.`,
      }, { status: 400 });
    }

    const baseUrl = secrets.get('MERCHIZE_API_BASE_URL');
    const merchizeToken = secrets.get('MERCHIZE_ACCESS_TOKEN');
    const merchizeKey = secrets.get('MERCHIZE_API_KEY');

    // Keep the reviewed files on the order items themselves. The fulfillment
    // order thumbnail is a separate value from the print artwork attached to
    // each Merchize order line, and retry approvals may skip product creation.
    for (const item of cartItems) {
      if (!item.customName && !item.customNumber && !item.custom_merchize_product_id) continue;
      const artworkKey = JSON.stringify([item.jerseyId, item.colorName || 'Default', item.customName || '', item.customNumber || '', item.front_image || '']);
      const compositedFront = compositedArtwork?.[artworkKey] || item.rendered_artwork_front;
      if (compositedFront) item.rendered_artwork_front = compositedFront;
      if (!isSafeImageUrl(item.rendered_artwork_front)) {
        throw new Error(`Personalized front print artwork is missing for ${item.name || 'customized jersey'}.`);
      }
      const freshDisplay = compositedDisplay?.[artworkKey] || item.rendered_image;
      if (!isSafeImageUrl(freshDisplay)) {
        throw new Error(`Customized jersey preview is missing for ${item.name || 'customized jersey'}.`);
      }
      if (freshDisplay) item.rendered_image = freshDisplay;
    }

    // Step 1: Create custom Merchize products for Identity Lab items.
    // Each custom item gets its own product with only the user's selected size,
    // uploaded with the composited artwork (name/number rendered onto the front artwork).
    for (const item of (order.merchize_order_id ? [] : cartItems)) {
      if (!item.customName && !item.customNumber) continue;
      if (item.custom_merchize_product_id) continue; // already created

      const jersey = jerseyMap.get(item.jerseyId);
      const baseProductId = jersey?.merchize_existing_product_id || jersey?.merchize_product_id;
      if (!baseProductId) {
        console.error(`Skipping custom product for ${item.name}: no base Merchize product`);
        continue;
      }

      const colorObj = (jersey.colors || []).find((c) => c.name === item.colorName);
      const colorHex = colorObj?.hex || '#000000';
      const size = item.shirtSize || 'M';
      const sizeValue = size.toLowerCase();

      // Use composited artwork (with name/number) for front, base artwork for other pieces
      const artworkKey = JSON.stringify([item.jerseyId, item.colorName || 'Default', item.customName || '', item.customNumber || '', item.front_image || '']);
      const compositedFront = compositedArtwork?.[artworkKey] || item.rendered_artwork_front;
      const freshDisplay = item.rendered_image || compositedDisplay?.[artworkKey];

      const productImages = [];
      if (freshDisplay) productImages.push(freshDisplay);
      else if (colorObj?.images?.length > 0) productImages.push(...colorObj.images.map((i) => i.url));
      else if (jersey.front_image) productImages.push(jersey.front_image);

      // Only upload the composited front artwork (the design from admin order review).
      // Do NOT upload base back/sleeve/hood — this product contains only the customizations.
      const artworkUrls = {};
      if (compositedFront) artworkUrls.front = compositedFront;

      const titleParts = [jersey.name, item.colorName, item.customName, item.customNumber ? `#${item.customNumber}` : ''].filter(Boolean);

      try {
        const { productId, variantId, sku } = await createCustomProduct({
          baseUrl, token: merchizeToken, apiKey: merchizeKey,
          baseProductId,
          title: titleParts.join(' - '),
          description: jersey.description || '',
          productImages,
          colorName: item.colorName || 'Default',
          colorHex,
          size, sizeValue,
          price: jersey.price,
          fallbackSku: jersey.merchize_existing_variants?.[size] || jersey.merchize_variants?.[size] || '',
          artworkUrls,
        });
        item.custom_merchize_product_id = productId;
        item.custom_merchize_variant_id = variantId;
        item.custom_merchize_sku = sku;
        if (freshDisplay) item.fresh_display_image = freshDisplay;
        console.log(`Custom product created: ${productId} for ${item.customName} #${item.customNumber}`);
      } catch (err) {
        console.error(`Failed to create custom product for ${item.name}:`, err.message);
        throw err;
      }
    }

    // Save updated items with custom product IDs
    await base44.asServiceRole.entities.Order.update(orderId, {
      items_json: JSON.stringify(cartItems),
    });

    // Step 2: Create Merchize fulfillment order with all items (custom + standard)
    const merchizeItems = [];
    for (const item of cartItems) {
      if (item.isCustomDesign) continue;

      // Resolve the listing's designed artwork (front/back/sleeve/hood) from
      // the Jersey entity, preferring per-color artwork over jersey-level.
      const jersey = jerseyMap.get(item.jerseyId);
      const listingArtwork = resolveListingArtwork(jersey, item.colorName);

      if (item.custom_merchize_product_id) {
        // Custom Identity Lab product (single size)
        merchizeItems.push({
          product_id: item.custom_merchize_product_id,
          sku: `NEMESIS-CUSTOM-${(item.name || 'JERSEY').replace(/\s+/g, '-')}`,
          merchize_sku: item.custom_merchize_sku || '',
          quantity: item.quantity,
          price: item.price,
          currency: 'USD',
          image: item.rendered_image,
          requires_custom_artwork_front: true,
          order_artwork: {
            front: item.rendered_artwork_front,
            back: listingArtwork.back || '',
            sleeve: listingArtwork.sleeve || '',
            hood: listingArtwork.hood || '',
          },
        });
      } else if (item.customName || item.customNumber) {
        const combo = (jersey?.name_number_combos || []).find((entry) =>
          (entry.name || '').toUpperCase() === (item.customName || '').toUpperCase() &&
          (entry.number || '') === (item.customNumber || '')
        );
        const vmi = (jersey?.variant_merchize_ids || []).find((entry) =>
          (entry.color_name || 'Default') === (item.colorName || 'Default') &&
          (entry.combo_name || '').toUpperCase() === (combo?.name || '').toUpperCase() &&
          (entry.combo_number || '') === (combo?.number || '')
        );
        const size = item.shirtSize || 'M';
        const merchizeSku = vmi?.skus?.[size] || vmi?.skus?.M || Object.values(vmi?.skus || {})[0] || '';
        if (!vmi?.merchize_product_id || !merchizeSku) continue;
        merchizeItems.push({
          product_id: vmi.merchize_product_id,
          sku: `NEMESIS-${(item.name || 'JERSEY').replace(/\s+/g, '-')}-${size}`,
          merchize_sku: merchizeSku,
          quantity: item.quantity,
          price: item.price,
          currency: 'USD',
          image: item.rendered_image,
          requires_custom_artwork_front: true,
          order_artwork: {
            front: item.rendered_artwork_front,
            back: listingArtwork.back || '',
            sleeve: listingArtwork.sleeve || '',
            hood: listingArtwork.hood || '',
          },
        });
      } else if (!item.customName && !item.customNumber) {
        // Standard product (non-custom items only)
        const existingProductId = jersey?.merchize_existing_product_id || jersey?.merchize_product_id;
        if (!existingProductId) continue;
        const variantSkus = jersey.merchize_existing_variants || jersey.merchize_variants || {};
        const size = item.shirtSize || 'M';
        const merchizeSku = variantSkus[size] || variantSkus['M'] || Object.values(variantSkus)[0];
        if (!merchizeSku) continue;
        merchizeItems.push({
          product_id: existingProductId,
          sku: `NEMESIS-${(jersey.name || 'JERSEY').replace(/\s+/g, '-')}-${size}`,
          merchize_sku: merchizeSku,
          quantity: item.quantity,
          price: item.price,
          currency: 'USD',
          image: jersey.front_image || item.front_image || '',
          order_artwork: {
            front: listingArtwork.front || item.artwork_front || '',
            back: listingArtwork.back || item.artwork_back || '',
            sleeve: listingArtwork.sleeve || item.artwork_sleeve || '',
            hood: listingArtwork.hood || item.artwork_hood || '',
          },
        });
      }
      // Custom items whose product creation failed are skipped — no base fallback.
    }

    if (merchizeItems.length === 0) {
      await base44.asServiceRole.entities.Order.update(orderId, {
        status: 'pending_approval',
        admin_notes: (order.admin_notes || '') + '\nNo Merchize order was created because no fulfillable items were found.',
      });
      return Response.json({ error: 'No Merchize order was created because no fulfillable items were found.' }, { status: 400 });
    }

    let merchizeData;
    if (order.merchize_order_id) {
      const artworkImport = await importMerchizeOrderArtworks(baseUrl, merchizeToken, {
        orderId,
        identifier: 'nemesis-apparel.base44.app',
        items: merchizeItems,
      });
      merchizeData = { success: true, data: { _id: order.merchize_order_id }, artwork_import: artworkImport };
    } else {
      merchizeData = await createMerchizeOrder(baseUrl, merchizeToken, merchizeKey, {
        orderId,
        customerName,
        customerEmail,
        shippingAddress,
        items: merchizeItems,
      });
    }

    if (merchizeData.success && merchizeData.data?._id && merchizeData.artwork_import?.success === false) {
      const note = `Merchize order ${merchizeData.data._id} ${retryingExistingOrder ? 'artwork retry failed' : 'created, but artwork import needs retry'}: ${merchizeData.artwork_import.error}`;
      await base44.asServiceRole.entities.Order.update(orderId, {
        merchize_order_id: merchizeData.data._id,
        status: 'approved',
        admin_notes: `${order.admin_notes || ''}\n${note}`,
      });
      return Response.json({ error: note });
    }

    if (merchizeData.success && merchizeData.data?._id) {
      const successNote = retryingExistingOrder
        ? `Artwork re-attached to Merchize order: ${merchizeData.data._id}`
        : `Merchize order created: ${merchizeData.data._id}`;
      await base44.asServiceRole.entities.Order.update(orderId, {
        merchize_order_id: merchizeData.data._id,
        status: 'approved',
        admin_notes: (order.admin_notes || '') + `\n${successNote}`,
      });
      console.log(`${retryingExistingOrder ? 'Artwork re-attached to' : 'Merchize order created for'} ${orderId}: ${merchizeData.data._id}`);
      return Response.json({ success: true, merchize_order_id: merchizeData.data._id });
    } else {
      console.error('Merchize order creation failed:', JSON.stringify(merchizeData).substring(0, 500));
      return Response.json({ error: `Merchize failed: ${merchizeData.msg || 'unknown error'}` });
    }
  } catch (error) {
    console.error('approve-custom-order error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}