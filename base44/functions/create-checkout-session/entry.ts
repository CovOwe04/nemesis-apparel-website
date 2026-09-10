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

    const region = getShipRegion(shippingAddress?.country);
    const jerseyCount = items.reduce((s, i) => s + i.quantity, 0);
    const shippingUsd = SHIPPING_RATES[region] * jerseyCount;

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
    params.append('metadata[customer_name]', customerName);
    params.append('metadata[cart_items]', JSON.stringify(items));
    params.append('metadata[shipping_address]', JSON.stringify(shippingAddress || {}));
    params.append('metadata[shipping_region]', region);
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