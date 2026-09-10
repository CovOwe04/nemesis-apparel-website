import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import Stripe from 'npm:stripe@17.7.0';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const stripe = new Stripe(secrets.get('STRIPE_SECRET_KEY'));
    const webhookSecret = secrets.get('STRIPE_WEBHOOK_SECRET');

    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return Response.json({ error: 'Invalid signature' }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const cartItems = JSON.parse(session.metadata?.cart_items || '[]');
      const shippingAddress = JSON.parse(session.metadata?.shipping_address || '{}');
      const customerName = session.metadata?.customer_name || '';
      const customerEmail = session.customer_email || session.customer_details?.email || '';
      const shippingCostUsd = Number(session.metadata?.shipping_cost_usd || 0);
      const totalUsd = session.amount_total / 100;
      const itemCount = cartItems.reduce((s, i) => s + i.quantity, 0);
      const hasCustom = cartItems.some((i) => i.customName || i.isCustomDesign);

      const addrLines = [shippingAddress.line1, shippingAddress.line2].filter(Boolean).join(', ');
      const addrStr = [addrLines, shippingAddress.city, shippingAddress.state, shippingAddress.postalCode, shippingAddress.country]
        .filter(Boolean)
        .join(', ');

      await base44.asServiceRole.entities.Order.create({
        items_json: JSON.stringify(cartItems),
        customer_name: customerName,
        customer_email: customerEmail,
        status: 'approved',
        total: totalUsd,
        item_count: itemCount,
        has_custom_names: hasCustom,
        admin_notes: `Stripe Session: ${session.id}\nShip to: ${addrStr}\nShipping: $${shippingCostUsd}`,
      });

      // TODO: Forward to Shopify for commerce handling
      // TODO: Forward to Merchize for supplier fulfillment

      console.log(`Order created for ${customerEmail}, total $${totalUsd}`);
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('stripe-webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}