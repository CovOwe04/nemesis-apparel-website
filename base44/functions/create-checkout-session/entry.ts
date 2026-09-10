import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { getShipRegion, SHIPPING_RATES } from '../../shared/shipping.ts';

export default async function(req) {
  try {
    const body = await req.json();
    const { items, customerName, customerEmail, shippingAddress } = body;

    if (!items || !items.length) {
      return Response.json({ error: 'Cart is empty' }, { status: 400 });
    }
    if (!customerName || !customerEmail) {
      return Response.json({ error: 'Name and email are required' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const region = getShipRegion(shippingAddress?.country);
    const jerseyCount = items.reduce((s, i) => s + i.quantity, 0);
    const shippingUsd = SHIPPING_RATES[region] * jerseyCount;
    const subtotalUsd = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const totalUsd = subtotalUsd + shippingUsd;
    const itemCount = items.reduce((s, i) => s + i.quantity, 0);
    const hasCustom = items.some((i) => i.customName || i.isCustomDesign);

    const addrLines = [shippingAddress?.line1, shippingAddress?.line2].filter(Boolean).join(', ');
    const addrStr = [addrLines, shippingAddress?.city, shippingAddress?.state, shippingAddress?.postalCode, shippingAddress?.country]
      .filter(Boolean).join(', ');

    // Persist the cart as a pending order so we don't exceed Stripe's 500-char
    // metadata limit. The webhook retrieves it by id.
    const order = await base44.asServiceRole.entities.Order.create({
      items_json: JSON.stringify(items),
      customer_name: customerName,
      customer_email: customerEmail,
      status: 'pending',
      total: totalUsd,
      item_count: itemCount,
      has_custom_names: hasCustom,
      admin_notes: `Ship to: ${addrStr}\nShipping: $${shippingUsd} (${region})`,
    });

    const stripeKey = secrets.get('STRIPE_SECRET_KEY');
    const origin = req.headers.get('origin') || 'https://nemesis-apparel.base44.app';

    const lineItems = items.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: 'usd',
        unit_amount: Math.round(item.price * 100),
        product_data: {
          name: `${item.name}${item.team ? ' — ' + item.team : ''}`,
          description: `Size ${item.shirtSize || 'M'}${item.customName ? ' · Name: ' + item.customName : ''}${item.customNumber ? ' · #' + item.customNumber : ''}`,
        },
      },
    }));

    if (shippingUsd > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(shippingUsd * 100),
          product_data: { name: 'Shipping' },
        },
      });
    }

    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('success_url', `${origin}/cart?status=success`);
    params.append('cancel_url', `${origin}/cart?status=cancel`);
    params.append('customer_email', customerEmail);
    params.append('billing_address_collection', 'auto');
    lineItems.forEach((item, i) => {
      params.append(`line_items[${i}][quantity]`, String(item.quantity));
      params.append(`line_items[${i}][price_data][currency]`, item.price_data.currency);
      params.append(`line_items[${i}][price_data][unit_amount]`, String(item.price_data.unit_amount));
      params.append(`line_items[${i}][price_data][product_data][name]`, item.price_data.product_data.name);
      if (item.price_data.product_data.description) {
        params.append(`line_items[${i}][price_data][product_data][description]`, item.price_data.product_data.description);
      }
    });
    params.append('metadata[base44_app_id]', secrets.get('BASE44_APP_ID') || '');
    params.append('metadata[order_id]', order.id);
    params.append('metadata[shipping_address]', JSON.stringify(shippingAddress || {}));
    params.append('metadata[shipping_cost_usd]', String(shippingUsd));

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': '2025-10-29.clover',
        'Idempotency-Key': crypto.randomUUID(),
      },
      body: params,
    });

    const session = await response.json();
    if (!response.ok) {
      console.error('Stripe error:', JSON.stringify(session.error));
      return Response.json({ error: session.error?.message || 'Stripe error' }, { status: 400 });
    }

    return Response.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('create-checkout-session error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}