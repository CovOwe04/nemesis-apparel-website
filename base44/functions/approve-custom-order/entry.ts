import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { createCustomProduct, createMerchizeOrder } from '../../shared/merchize.ts';

export default async function (req) {
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
    const { orderId, compositedArtwork, compositedDisplay } = body;
    if (!orderId) {
      return Response.json({ error: 'orderId required' });
    }

    const order = await base44.asServiceRole.entities.Order.get(orderId);
    if (!order) {
      return Response.json({ error: 'Order not found' });
    }
    if (order.status !== 'pending_approval') {
      return Response.json({ error: 'Order is not pending approval' });
    }

    const cartItems = JSON.parse(order.items_json || '[]');
    const shippingAddress = JSON.parse(order.shipping_address_json || '{}');
    const customerName = order.customer_name || '';
    const customerEmail = order.customer_email || '';

    // Fetch jerseys
    const jerseys = await base44.asServiceRole.entities.Jersey.list('-created_date', 100);
    const jerseyMap = new Map(jerseys.map((j) => [j.id, j]));

    const baseUrl = secrets.get('MERCHIZE_API_BASE_URL');
    const merchizeToken = secrets.get('MERCHIZE_ACCESS_TOKEN');
    const merchizeKey = secrets.get('MERCHIZE_API_KEY');

    // Step 1: Create custom Merchize products for Identity Lab items.
    // Each custom item gets its own product with only the user's selected size,
    // uploaded with the composited artwork (name/number rendered onto the front artwork).
    for (const item of cartItems) {
      if (!item.customName && !item.customNumber) continue;
      if (item.custom_merchize_product_id) continue; // already created

      const jersey = jerseyMap.get(item.jerseyId);
      if (!jersey?.merchize_product_id) {
        console.error(`Skipping custom product for ${item.name}: no base Merchize product`);
        continue;
      }

      const colorObj = (jersey.colors || []).find((c) => c.name === item.colorName);
      const colorHex = colorObj?.hex || '#000000';
      const size = item.shirtSize || 'M';
      const sizeValue = size.toLowerCase();

      // Use composited artwork (with name/number) for front, base artwork for other pieces
      const artworkKey = `${item.colorName || 'Default'}|${item.customName || ''}|${item.customNumber || ''}`;
      const compositedFront = compositedArtwork?.[artworkKey];
      const freshDisplay = compositedDisplay?.[artworkKey];

      const productImages = [];
      if (freshDisplay) productImages.push(freshDisplay);
      else if (item.rendered_image) productImages.push(item.rendered_image);
      else if (colorObj?.images?.length > 0) productImages.push(...colorObj.images.map((i) => i.url));
      else if (jersey.front_image) productImages.push(jersey.front_image);

      const artworkUrls = {};
      if (compositedFront) artworkUrls.front = compositedFront;
      else if (colorObj?.artwork_front) artworkUrls.front = colorObj.artwork_front;
      if (colorObj?.artwork_back) artworkUrls.back = colorObj.artwork_back;
      if (colorObj?.artwork_sleeve) artworkUrls.sleeve = colorObj.artwork_sleeve;
      if (colorObj?.artwork_hood) artworkUrls.hood = colorObj.artwork_hood;

      const titleParts = [jersey.name, item.colorName, item.customName, item.customNumber ? `#${item.customNumber}` : ''].filter(Boolean);

      try {
        const { productId, variantId, sku } = await createCustomProduct({
          baseUrl, token: merchizeToken, apiKey: merchizeKey,
          baseProductId: jersey.merchize_product_id,
          title: titleParts.join(' - '),
          description: jersey.description || '',
          productImages,
          colorName: item.colorName || 'Default',
          colorHex,
          size, sizeValue,
          price: jersey.price,
          fallbackSku: jersey.merchize_variants?.[size] || '',
          artworkUrls,
        });
        item.custom_merchize_product_id = productId;
        item.custom_merchize_variant_id = variantId;
        item.custom_merchize_sku = sku;
        if (freshDisplay) item.fresh_display_image = freshDisplay;
        console.log(`Custom product created: ${productId} for ${item.customName} #${item.customNumber}`);
      } catch (err) {
        console.error(`Failed to create custom product for ${item.name}:`, err.message);
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

      if (item.custom_merchize_product_id) {
        // Custom Identity Lab product (single size)
        merchizeItems.push({
          product_id: item.custom_merchize_product_id,
          sku: `NEMESIS-CUSTOM-${(item.name || 'JERSEY').replace(/\s+/g, '-')}`,
          merchize_sku: item.custom_merchize_sku || '',
          quantity: item.quantity,
          price: item.price,
          currency: 'USD',
          image: item.fresh_display_image || item.rendered_image || item.front_image || '',
        });
      } else {
        // Standard product
        const jersey = jerseyMap.get(item.jerseyId);
        if (!jersey?.merchize_product_id) continue;
        const variantSkus = jersey.merchize_variants || {};
        const size = item.shirtSize || 'M';
        const merchizeSku = variantSkus[size] || variantSkus['M'] || Object.values(variantSkus)[0];
        if (!merchizeSku) continue;
        merchizeItems.push({
          product_id: jersey.merchize_product_id,
          sku: `NEMESIS-${(jersey.name || 'JERSEY').replace(/\s+/g, '-')}-${size}`,
          merchize_sku: merchizeSku,
          quantity: item.quantity,
          price: item.price,
          currency: 'USD',
          image: jersey.front_image || item.front_image || '',
        });
      }
    }

    if (merchizeItems.length === 0) {
      await base44.asServiceRole.entities.Order.update(orderId, {
        status: 'fulfilled',
        admin_notes: (order.admin_notes || '') + '\nNo fulfillable items found.',
      });
      return Response.json({ success: true, message: 'No fulfillable items, marked fulfilled' });
    }

    const merchizeData = await createMerchizeOrder(baseUrl, merchizeToken, merchizeKey, {
      orderId,
      customerName,
      customerEmail,
      shippingAddress,
      items: merchizeItems,
    });

    if (merchizeData.success && merchizeData.data?._id) {
      await base44.asServiceRole.entities.Order.update(orderId, {
        merchize_order_id: merchizeData.data._id,
        status: 'fulfilled',
        admin_notes: (order.admin_notes || '') + `\nApproved & fulfilled via Merchize: ${merchizeData.data._id}`,
      });
      console.log(`Order ${orderId} approved and fulfilled: ${merchizeData.data._id}`);
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