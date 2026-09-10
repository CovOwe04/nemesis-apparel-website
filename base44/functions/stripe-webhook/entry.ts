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
      const orderId = session.metadata?.order_id;
      const shippingAddress = JSON.parse(session.metadata?.shipping_address || '{}');
      const shippingCostUsd = Number(session.metadata?.shipping_cost_usd || 0);
      const totalUsd = session.amount_total / 100;

      if (!orderId) {
        console.error('No order_id in session metadata — legacy session, skipping');
        return Response.json({ received: true });
      }

      const order = await base44.asServiceRole.entities.Order.get(orderId);
      if (!order) {
        console.error('Order not found:', orderId);
        return Response.json({ error: 'Order not found' }, { status: 404 });
      }

      const cartItems = JSON.parse(order.items_json || '[]');
      const customerName = order.customer_name || '';
      const customerEmail = session.customer_email || session.customer_details?.email || order.customer_email || '';

      const addrLines = [shippingAddress.line1, shippingAddress.line2].filter(Boolean).join(', ');
      const addrStr = [addrLines, shippingAddress.city, shippingAddress.state, shippingAddress.postalCode, shippingAddress.country]
        .filter(Boolean).join(', ');

      await base44.asServiceRole.entities.Order.update(orderId, {
        status: 'approved',
        admin_notes: `Stripe Session: ${session.id}\nShip to: ${addrStr}\nShipping: $${shippingCostUsd}`,
      });

      // Forward to Merchize for supplier fulfillment
      try {
        const jerseyIds = [...new Set(cartItems.map((i) => i.jerseyId).filter(Boolean))];
        if (jerseyIds.length > 0) {
          const jerseys = await base44.asServiceRole.entities.Jersey.list('-created_date', 100);
          const jerseyMap = new Map(jerseys.map((j) => [j.id, j]));

          const merchizeItems = [];
          for (const item of cartItems) {
            if (item.isCustomDesign) continue;
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
              design_front: jersey.front_image || '',
              design_back: jersey.back_image || item.back_image || '',
            });
          }

          if (merchizeItems.length > 0) {
            const baseUrl = secrets.get('MERCHIZE_API_BASE_URL');
            const merchizeToken = secrets.get('MERCHIZE_ACCESS_TOKEN');
            const merchizeKey = secrets.get('MERCHIZE_API_KEY');

            const merchizeRes = await fetch(`${baseUrl}/order/external/orders/catalog`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${merchizeToken}`,
                'x-api-key': merchizeKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                order_id: orderId,
                identifier: 'nemesis-apparel.base44.app',
                shipping_info: {
                  full_name: customerName,
                  address_1: shippingAddress.line1 || '',
                  address_2: shippingAddress.line2 || '',
                  city: shippingAddress.city || '',
                  state: shippingAddress.state || '',
                  postcode: shippingAddress.postalCode || '',
                  country: shippingAddress.country || 'US',
                  email: customerEmail,
                  phone: '',
                },
                items: merchizeItems,
              }),
            });

            const merchizeData = await merchizeRes.json();
            if (merchizeData.success && merchizeData.data?._id) {
              await base44.asServiceRole.entities.Order.update(orderId, {
                merchize_order_id: merchizeData.data._id,
                status: 'fulfilled',
                admin_notes: `Stripe: ${session.id}\nMerchize: ${merchizeData.data._id}\nShip to: ${addrStr}\nShipping: $${shippingCostUsd}`,
              });
              console.log(`Merchize order created: ${merchizeData.data._id}`);
            } else {
              console.error('Merchize order creation failed:', JSON.stringify(merchizeData).substring(0, 500));
              await base44.asServiceRole.entities.Order.update(orderId, {
                admin_notes: `Stripe: ${session.id}\nMerchize FAILED: ${merchizeData.msg || 'unknown error'}\nShip to: ${addrStr}\nShipping: $${shippingCostUsd}`,
              });
            }
          } else {
            console.log('No items with Merchize product mapping — skipping fulfillment');
          }
        }
      } catch (merchizeErr) {
        console.error('Merchize integration error:', merchizeErr.message || merchizeErr);
      }

      console.log(`Order ${orderId} approved for ${customerEmail}, total $${totalUsd}`);
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('stripe-webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}