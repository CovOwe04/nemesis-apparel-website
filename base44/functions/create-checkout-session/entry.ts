import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { getShipRegion, SHIPPING_RATES } from '../../shared/shipping.ts';

function getClientIp(req) {
  return req.headers.get('CF-Connecting-IP')
    || (req.headers.get('X-Forwarded-For') || '').split(',')[0].trim()
    || req.headers.get('X-Real-IP')
    || 'unknown';
}

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

    // Validate item quantities are positive integers
    for (const item of items) {
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
        return Response.json({ error: 'Invalid item quantity' }, { status: 400 });
      }
    }

    const base44 = createClientFromRequest(req);
    const clientIp = getClientIp(req);
    const tenMinAgo = Date.now() - 10 * 60 * 1000;

    // Rate limit by IP: max 5 pending orders per IP in 10 minutes
    const recentByIp = await base44.asServiceRole.entities.Order.filter(
      { ip_address: clientIp, status: 'pending' },
      '-created_date',
      10
    );
    const ipCount = (recentByIp || []).filter(
      (o) => new Date(o.created_date).getTime() > tenMinAgo
    ).length;
    if (ipCount >= 5) {
      return Response.json({ error: 'Too many checkout attempts. Please try again in a few minutes.' }, { status: 429 });
    }

    // Global cap: prevent unlimited pending order accumulation
    const allPending = await base44.asServiceRole.entities.Order.filter(
      { status: 'pending' },
      '-created_date',
      100
    );
    if ((allPending || []).length >= 50) {
      return Response.json({ error: 'Order processing is at capacity. Please try again shortly.' }, { status: 429 });
    }

    // Server-side price verification: look up real prices from Jersey entities
    // to prevent client-side price manipulation
    const allJerseys = await base44.asServiceRole.entities.Jersey.list('-created_date', 100);
    const jerseyMap = new Map(allJerseys.map((j) => [j.id, j]));

    const verifiedItems = [];
    for (const item of items) {
      if (item.isCustomDesign) {
        return Response.json({ error: 'Custom design items are not available for purchase' }, { status: 400 });
      }
      const jersey = jerseyMap.get(item.jerseyId);
      if (!jersey) {
        return Response.json({ error: `Invalid or unavailable item: ${item.name || 'unknown'}` }, { status: 400 });
      }
      verifiedItems.push({
        ...item,
        price: jersey.price,
        name: jersey.name,
        team: jersey.team || '',
        front_image: jersey.front_image || item.front_image,
        back_image: jersey.back_image || item.back_image,
      });
    }

    const region = getShipRegion(shippingAddress?.country);
    const jerseyCount = verifiedItems.reduce((s, i) => s + i.quantity, 0);
    const shippingUsd = SHIPPING_RATES[region] * jerseyCount;
    const country = (shippingAddress?.country || '').toUpperCase();
    const currency = country === 'CA' ? 'cad' : 'usd';
    const CAD_RATE = 1.36;
    const toMinor = (usd) => currency === 'cad' ? Math.round(usd * 100 * CAD_RATE) : Math.round(usd * 100);
    const subtotalUsd = verifiedItems.reduce((s, i) => s + i.price * i.quantity, 0);
    const hstUsd = country === 'CA' ? Math.round(subtotalUsd * 0.13 * 100) / 100 : 0;
    const totalUsd = subtotalUsd + shippingUsd + hstUsd;
    const itemCount = verifiedItems.reduce((s, i) => s + i.quantity, 0);
    const hasCustom = verifiedItems.some((i) => i.customName || i.isCustomDesign);

    const addrLines = [shippingAddress?.line1, shippingAddress?.line2].filter(Boolean).join(', ');
    const addrStr = [addrLines, shippingAddress?.city, shippingAddress?.state, shippingAddress?.postalCode, shippingAddress?.country]
      .filter(Boolean).join(', ');

    // Persist the cart as a pending order so we don't exceed Stripe's 500-char
    // metadata limit. The webhook retrieves it by id.
    const order = await base44.asServiceRole.entities.Order.create({
      items_json: JSON.stringify(verifiedItems),
      customer_name: customerName,
      customer_email: customerEmail,
      status: 'pending',
      total: totalUsd,
      item_count: itemCount,
      has_custom_names: hasCustom,
      admin_notes: `Ship to: ${addrStr}\nShipping: $${shippingUsd} (${region})\nHST: $${hstUsd}`,
      ip_address: clientIp,
    });

    const stripeKey = secrets.get('STRIPE_SECRET_KEY');
    const ALLOWED_ORIGINS = ['https://nemesis-apparel.base44.app'];
    const rawOrigin = req.headers.get('origin') || '';
    const origin = ALLOWED_ORIGINS.includes(rawOrigin) ? rawOrigin : 'https://nemesis-apparel.base44.app';

    const lineItems = verifiedItems.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency,
        unit_amount: toMinor(item.price),
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
          currency,
          unit_amount: toMinor(shippingUsd),
          product_data: { name: 'Shipping' },
        },
      });
    }

    if (hstUsd > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency,
          unit_amount: toMinor(hstUsd),
          product_data: { name: 'HST (13%)' },
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
    params.append('metadata[hst_usd]', String(hstUsd));

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