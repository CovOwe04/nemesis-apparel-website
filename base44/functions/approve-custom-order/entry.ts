import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { createCustomProductForItem, buildCustomOrderItem, buildPresetOrderItem, findPresetMatch, ensurePresetSellerSkus, createMerchizeOrder, importMerchizeOrderArtworks } from '../../shared/merchize.ts';
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
    // Each custom item gets its own product with ALL size variants (matching the
    // admin "Generate Products" flow), uploaded with the composited artwork.
    for (const item of (order.merchize_order_id ? [] : cartItems)) {
      if (!item.customName && !item.customNumber) continue;
      if (item.custom_merchize_product_id) continue; // already created

      const jersey = jerseyMap.get(item.jerseyId);
      // Preset items with a pre-generated product use that product directly —
      // never create a duplicate custom product for them.
      const { vmi: presetVmi } = findPresetMatch(item, jersey);
      if (presetVmi?.merchize_product_id) continue;
      const created = await createCustomProductForItem({
        baseUrl, token: merchizeToken, apiKey: merchizeKey, item, jersey,
        sellerSkuPrefix: `NEMESIS-${orderId.slice(-6).toUpperCase()}-${cartItems.indexOf(item) + 1}`,
      });
      if (!created) {
        console.error(`Skipping custom product for ${item.name}: no base Merchize product`);
        continue;
      }
      // Save the product ID immediately so a retry never creates a duplicate
      await base44.asServiceRole.entities.Order.update(orderId, {
        items_json: JSON.stringify(cartItems),
      });
    }

    // Save updated items with custom product IDs (also covers the retry case
    // where all items already have product IDs — the loop above skips them)
    await base44.asServiceRole.entities.Order.update(orderId, {
      items_json: JSON.stringify(cartItems),
    });

    // Step 2: Create Merchize fulfillment order with all items (custom + standard)
    const merchizeItems = [];
    for (const item of cartItems) {
      if (item.isCustomDesign) continue;

      if (item.custom_merchize_product_id) {
        // Custom Identity Lab product (all sizes; order uses the buyer's size SKU)
        merchizeItems.push(buildCustomOrderItem(item));
      } else if (item.customName || item.customNumber) {
        const jersey = jerseyMap.get(item.jerseyId);
        const vmi = findPresetMatch(item, jersey)?.vmi;
        if (!vmi?.merchize_product_id) continue;
        await ensurePresetSellerSkus(baseUrl, merchizeToken, merchizeKey, vmi.merchize_product_id);
        const mItem = buildPresetOrderItem(item, jersey, vmi);
        if (mItem) merchizeItems.push(mItem);
      } else if (!item.customName && !item.customNumber) {
        // Standard product (non-custom items only)
        const jersey = jerseyMap.get(item.jerseyId);
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
            front: item.artwork_front || '',
            back: item.artwork_back || '',
            sleeve: item.artwork_sleeve || '',
            hood: item.artwork_hood || '',
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