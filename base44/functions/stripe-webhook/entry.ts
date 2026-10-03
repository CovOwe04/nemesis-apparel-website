import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import Stripe from 'npm:stripe@17.7.0';
import { createMerchizeOrder, createCustomProductForItem, buildCustomOrderItem, findPresetMatch, buildPresetOrderItem } from '../../shared/merchize.ts';
import { isSafeImageUrl } from '../../shared/security.ts';

const CAD_RATE = 1.36;
const LOGO_URL = 'https://media.base44.com/images/public/6a95dbf0d98672e2f49452f4/65e457e18_Asset63x.png';

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function fmtMoney(usd, currency) {
  const sym = currency === 'cad' ? 'CA$' : '$';
  const val = currency === 'cad' ? Math.round(usd * CAD_RATE) : usd;
  return `${sym}${val.toLocaleString('en-US')}`;
}

function buildReceiptHtml({ customerName, orderId, cartItems, shippingAddress, shippingCostUsd, hstUsd, currency }) {
  const subtotalUsd = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalUsd = subtotalUsd + shippingCostUsd + hstUsd;
  const orderDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const rows = cartItems.map((item) => {
    const line = fmtMoney(item.price * item.quantity, currency);
    let desc = `Size ${esc(item.shirtSize || 'M')}`;
    if (item.customName) desc += ` &middot; Name: ${esc(item.customName)}`;
    if (item.customNumber) desc += ` &middot; #${esc(item.customNumber)}`;
    if (item.isCustomDesign) {
      const d = item.designSpec || {};
      desc = `Custom Design &middot; ${[d.pattern, d.material, d.primary].filter(Boolean).map(esc).join(' / ')}`;
    }
    return `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #2D2D2D;vertical-align:top;">
          <div style="font-family:'Space Grotesk',Arial,sans-serif;font-weight:700;color:#FFFFFF;font-size:15px;text-transform:uppercase;letter-spacing:0.04em;">${esc(item.name || 'Jersey')}</div>
          <div style="font-family:'Inter',Arial,sans-serif;color:#9A9A9A;font-size:12px;margin-top:4px;">${esc(item.team || '')} ${item.team ? '· ' : ''}${desc}</div>
        </td>
        <td align="center" style="padding:14px 0;border-bottom:1px solid #2D2D2D;color:#F5F5F7;font-family:'Space Grotesk',Arial,sans-serif;font-size:14px;vertical-align:top;">${item.quantity}</td>
        <td align="right" style="padding:14px 0;border-bottom:1px solid #2D2D2D;color:#FF1F3D;font-family:'Space Grotesk',Arial,sans-serif;font-weight:700;font-size:14px;vertical-align:top;white-space:nowrap;">${line}</td>
      </tr>`;
  }).join('');

  const addrLines = [shippingAddress.line1, shippingAddress.line2].filter(Boolean).map(esc).join(', ');
  const addrBlock = [addrLines, esc(shippingAddress.city), esc(shippingAddress.state), esc(shippingAddress.postalCode), esc(shippingAddress.country)]
    .filter(Boolean).join('<br>');

  return `<!doctype html>
<html><body style="margin:0;padding:0;background-color:#000000;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#000000;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#0A0A0A;border:1px solid #2D2D2D;border-radius:8px;overflow:hidden;">
        <!-- Header -->
        <tr><td style="padding:36px 40px 28px;border-bottom:1px solid #2D2D2D;background-color:#000000;">
          <img src="${LOGO_URL}" alt="Nemesis Apparel" width="44" height="44" style="display:block;margin:0 auto 18px;" />
          <div align="center" style="font-family:'Space Grotesk',Arial,sans-serif;font-size:11px;letter-spacing:0.28em;color:#FF1F3D;text-transform:uppercase;">Order Confirmation</div>
          <div align="center" style="font-family:'Space Grotesk',Arial,sans-serif;font-size:24px;font-weight:700;color:#FFFFFF;text-transform:uppercase;letter-spacing:0.02em;margin-top:10px;">Your jerseys are locked in</div>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px 40px 8px;">
          <p style="font-family:'Inter',Arial,sans-serif;color:#F5F5F7;font-size:15px;line-height:1.6;margin:0 0 6px;">Hey ${esc(customerName)},</p>
          <p style="font-family:'Inter',Arial,sans-serif;color:#9A9A9A;font-size:14px;line-height:1.6;margin:0 0 28px;">Thanks for the order. Your gear is heading into production now — you'll get a tracking update from our fulfillment partner once it ships. Below is your online receipt for your records.</p>

          <!-- Meta -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr>
              <td style="font-family:'Space Grotesk',Arial,sans-serif;font-size:11px;letter-spacing:0.15em;color:#6B6B6B;text-transform:uppercase;">Order</td>
              <td align="right" style="font-family:'Space Grotesk',Arial,sans-serif;font-size:13px;color:#F5F5F7;">#${orderId.slice(-8).toUpperCase()}</td>
            </tr>
            <tr>
              <td style="font-family:'Space Grotesk',Arial,sans-serif;font-size:11px;letter-spacing:0.15em;color:#6B6B6B;text-transform:uppercase;padding-top:8px;">Date</td>
              <td align="right" style="font-family:'Space Grotesk',Arial,sans-serif;font-size:13px;color:#F5F5F7;padding-top:8px;">${orderDate}</td>
            </tr>
          </table>

          <!-- Items -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-family:'Space Grotesk',Arial,sans-serif;font-size:11px;letter-spacing:0.15em;color:#6B6B6B;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid #2D2D2D;">Item</td>
              <td align="center" style="font-family:'Space Grotesk',Arial,sans-serif;font-size:11px;letter-spacing:0.15em;color:#6B6B6B;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid #2D2D2D;">Qty</td>
              <td align="right" style="font-family:'Space Grotesk',Arial,sans-serif;font-size:11px;letter-spacing:0.15em;color:#6B6B6B;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid #2D2D2D;">Price</td>
            </tr>
            ${rows}
          </table>

          <!-- Totals -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
            <tr>
              <td style="font-family:'Inter',Arial,sans-serif;color:#9A9A9A;font-size:13px;padding:4px 0;">Subtotal</td>
              <td align="right" style="font-family:'Space Grotesk',Arial,sans-serif;color:#F5F5F7;font-size:13px;padding:4px 0;">${fmtMoney(subtotalUsd, currency)}</td>
            </tr>
            <tr>
              <td style="font-family:'Inter',Arial,sans-serif;color:#9A9A9A;font-size:13px;padding:4px 0;">Shipping</td>
              <td align="right" style="font-family:'Space Grotesk',Arial,sans-serif;color:${shippingCostUsd === 0 ? '#FF1F3D' : '#F5F5F7'};font-size:13px;padding:4px 0;">${shippingCostUsd === 0 ? 'FREE' : fmtMoney(shippingCostUsd, currency)}</td>
            </tr>
            ${hstUsd > 0 ? `
            <tr>
              <td style="font-family:'Inter',Arial,sans-serif;color:#9A9A9A;font-size:13px;padding:4px 0;">HST (13%)</td>
              <td align="right" style="font-family:'Space Grotesk',Arial,sans-serif;color:#F5F5F7;font-size:13px;padding:4px 0;">${fmtMoney(hstUsd, currency)}</td>
            </tr>` : ''}
            <tr>
              <td style="font-family:'Space Grotesk',Arial,sans-serif;color:#FFFFFF;font-size:16px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;padding-top:14px;border-top:1px solid #2D2D2D;">Total</td>
              <td align="right" style="font-family:'Space Grotesk',Arial,sans-serif;color:#FF1F3D;font-size:20px;font-weight:700;padding-top:14px;border-top:1px solid #2D2D2D;">${fmtMoney(totalUsd, currency)}</td>
            </tr>
          </table>

          <!-- Shipping -->
          <div style="margin-top:32px;padding:20px;background-color:#000000;border:1px solid #2D2D2D;border-radius:6px;">
            <div style="font-family:'Space Grotesk',Arial,sans-serif;font-size:11px;letter-spacing:0.15em;color:#FF1F3D;text-transform:uppercase;margin-bottom:10px;">Shipping To</div>
            <div style="font-family:'Inter',Arial,sans-serif;color:#F5F5F7;font-size:13px;line-height:1.6;">${esc(customerName)}<br>${addrBlock}</div>
          </div>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:28px 40px 36px;border-top:1px solid #2D2D2D;background-color:#000000;">
          <p style="font-family:'Inter',Arial,sans-serif;color:#6B6B6B;font-size:12px;line-height:1.6;margin:0 0 8px;">Questions about your order? Reply to this email and we'll get you sorted.</p>
          <p style="font-family:'Space Grotesk',Arial,sans-serif;color:#6B6B6B;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;margin:0;">Nemesis Apparel &middot; The Rally Never Stops</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

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
      const hstUsd = Number(session.metadata?.hst_usd || 0);
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
      if (order.merchize_order_id) {
        console.log(`Merchize order already exists for ${orderId}; skipping duplicate fulfillment.`);
        return Response.json({ received: true, duplicate: true });
      }

      const cartItems = JSON.parse(order.items_json || '[]');
      const customerName = order.customer_name || '';
      const customerEmail = session.customer_email || session.customer_details?.email || order.customer_email || '';

      const addrLines = [shippingAddress.line1, shippingAddress.line2].filter(Boolean).join(', ');
      const addrStr = [addrLines, shippingAddress.city, shippingAddress.state, shippingAddress.postalCode, shippingAddress.country]
        .filter(Boolean).join(', ');

      // Store payment + shipping info for later fulfillment / refund
      const stripePaymentId = typeof session.payment_intent === 'string' ? session.payment_intent : '';
      await base44.asServiceRole.entities.Order.update(orderId, {
        status: 'pending',
        stripe_payment_id: stripePaymentId,
        shipping_address_json: JSON.stringify(shippingAddress),
        admin_notes: `Stripe Session: ${session.id}\nShip to: ${addrStr}\nShipping: $${shippingCostUsd}`,
      });

      // Increment promo code usage
      const promoCodeId = session.metadata?.promo_code_id;
      if (promoCodeId) {
        try {
          const promo = await base44.asServiceRole.entities.PromoCode.get(promoCodeId);
          if (promo) {
            await base44.asServiceRole.entities.PromoCode.update(promoCodeId, {
              times_used: (promo.times_used || 0) + 1,
            });
          }
        } catch (err) {
          console.error('Failed to increment promo code usage:', err.message);
        }
      }

      // Send the customer a branded receipt email via Resend
      try {
        const currency = (session.currency || 'usd').toLowerCase();
        const resendApiKey = secrets.get('RESEND_API_KEY');
        const fromEmail = secrets.get('RESEND_FROM_EMAIL') || 'Nemesis Apparel <onboarding@resend.dev>';
        console.log(`ATTEMPTING receipt email to: ${customerEmail} via Resend`);
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: customerEmail,
            subject: `Nemesis Apparel — Order Confirmation #${orderId.slice(-8).toUpperCase()}`,
            html: buildReceiptHtml({ customerName, orderId, cartItems, shippingAddress, shippingCostUsd, hstUsd, currency }),
          }),
        });
        const resendData = await resendRes.json();
        if (!resendRes.ok) {
          throw new Error(`Resend ${resendRes.status}: ${resendData.message || JSON.stringify(resendData)}`);
        }
        console.log(`Receipt email SENT via Resend to ${customerEmail} (id: ${resendData.id})`);
      } catch (emailErr) {
        console.error('Receipt email FAILED:', emailErr.message || emailErr);
      }

      const baseUrl = secrets.get('MERCHIZE_API_BASE_URL');
      const merchizeToken = secrets.get('MERCHIZE_ACCESS_TOKEN');
      const merchizeKey = secrets.get('MERCHIZE_API_KEY');

      // Fetch the exact listings for this order so an older listing is not
      // omitted by the entity list limit.
      const jerseyIds = [...new Set(cartItems.map((i) => i.jerseyId).filter(Boolean))];
      const jerseys = await Promise.all(jerseyIds.map(async (jerseyId) => {
        try {
          return await base44.asServiceRole.entities.Jersey.get(jerseyId);
        } catch (err) {
          console.error(`Could not load listing ${jerseyId} for order ${orderId}:`, err.message || err);
          return null;
        }
      }));
      const jerseyMap = new Map(jerseys.filter(Boolean).map((jersey) => [jersey.id, jersey]));

      // Only truly custom name/number items (not matching any preset) need admin
      // design review. Preset items use pre-generated Merchize products and fulfill
      // automatically, like standard items.
      const trulyCustomItems = cartItems.filter((i) => {
        if (!i.customName && !i.customNumber) return false;
        const jersey = jerseyMap.get(i.jerseyId);
        return !findPresetMatch(i, jersey);
      });
      const hasTrulyCustom = trulyCustomItems.length > 0;

      // Existing-product IDs are entered manually in the listing editor, so
      // their size SKUs may not be stored alongside the ID. Resolve missing
      // SKUs from Merchize's existing all-variants endpoint before deciding an
      // order needs manual review.
      const sizeSkusByListing = new Map();
      await Promise.all(jerseyIds.map(async (jerseyId) => {
        const jersey = jerseyMap.get(jerseyId);
        if (!jersey) return;
        const explicitExistingId = jersey.use_existing_merchize_product === false
          ? ''
          : jersey.merchize_existing_product_id;
        const productId = explicitExistingId || jersey.merchize_product_id || '';
        const configuredSkus = explicitExistingId
          ? jersey.merchize_existing_variants
          : jersey.merchize_variants;
        const sizeSkus = { ...(configuredSkus || {}) };
        sizeSkusByListing.set(jerseyId, sizeSkus);

        const requiredSizes = cartItems
          .filter((item) => item.jerseyId === jerseyId)
          .map((item) => item.shirtSize || 'M');
        if (!productId || !baseUrl || !merchizeToken || requiredSizes.every((size) => sizeSkus[size])) return;

        try {
          const variantsRes = await fetch(`${baseUrl}/product/products/${encodeURIComponent(productId)}/all-variants`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${merchizeToken}` },
          });
          const variantsData = await variantsRes.json();
          if (!variantsRes.ok || !variantsData.success || !Array.isArray(variantsData.data)) {
            throw new Error(variantsData.message || `HTTP ${variantsRes.status}`);
          }
          for (const variant of variantsData.data) {
            const sizeOption = variant.options?.find((option) => option.attribute?.value_type === 'size');
            const size = String(sizeOption?.name || '').toUpperCase();
            if (size && variant.sku) sizeSkus[size] = variant.sku;
          }
          console.log(`Resolved ${Object.keys(sizeSkus).length} size SKUs for listing ${jerseyId} from Merchize product ${productId}`);
        } catch (error) {
          console.error(`Could not resolve Merchize variants for listing ${jerseyId}:`, error.message || error);
        }
      }));

      // Build a merchize item for a standard (non-custom) cart item
      const buildStandardItem = (item, { requireExactSize = false } = {}) => {
        const jersey = jerseyMap.get(item.jerseyId);
        const configuredExistingProductId = jersey?.use_existing_merchize_product === false
          ? ''
          : jersey?.merchize_existing_product_id;
        const productId = configuredExistingProductId || jersey?.merchize_product_id;
        if (!productId) return null;
        const variantSkus = sizeSkusByListing.get(item.jerseyId) || {};
        const size = item.shirtSize || 'M';
        const merchizeSku = requireExactSize
          ? variantSkus[size]
          : (variantSkus[size] || variantSkus['M'] || Object.values(variantSkus)[0]);
        if (!merchizeSku) return null;
        const isPersonalized = Boolean(item.customName || item.customNumber);
        if (isPersonalized && !isSafeImageUrl(item.rendered_artwork_front)) {
          throw new Error(`Personalized front print artwork is missing for ${item.name || 'customized jersey'}.`);
        }
        if (isPersonalized && !isSafeImageUrl(item.rendered_image)) {
          throw new Error(`Customized jersey preview is missing for ${item.name || 'customized jersey'}.`);
        }
        return {
          product_id: productId,
          sku: `NEMESIS-${(jersey.name || 'JERSEY').replace(/\s+/g, '-')}-${size}`,
          merchize_sku: merchizeSku,
          quantity: item.quantity,
          price: item.price,
          currency: 'USD',
          image: isPersonalized ? item.rendered_image : (item.rendered_image || item.front_image || jersey.front_image || ''),
          ...(isPersonalized ? { requires_custom_artwork_front: true } : {}),
          order_artwork: {
            front: isPersonalized ? item.rendered_artwork_front : (item.rendered_artwork_front || item.artwork_front || ''),
            back: item.artwork_back || '',
            sleeve: item.artwork_sleeve || '',
            hood: item.artwork_hood || '',
          },
        };
      };

      if (hasTrulyCustom) {
        // Only truly custom (non-preset) name/number items need admin design
        // review. The admin approves via approve-custom-order, which creates the
        // Merchize products and fulfillment order at that point.
        await base44.asServiceRole.entities.Order.update(orderId, {
          status: 'pending_approval',
          admin_notes: `Stripe: ${session.id}\nPayment: ${stripePaymentId}\nShip to: ${addrStr}\nShipping: $${shippingCostUsd}\nAwaiting admin design review before Merchize fulfillment.`,
        });
        console.log(`Order ${orderId} set to pending_approval — ${trulyCustomItems.length} truly custom item(s) awaiting admin review`);
      } else {
        // No truly custom items — fulfill directly via Merchize. Preset items
        // use their pre-generated product; if a preset has no product yet, create
        // one on the fly (still auto-approved, no admin review).
        try {
          const merchizeItems = [];
          for (const item of cartItems) {
            if (item.isCustomDesign) continue;

            if (!item.customName && !item.customNumber) {
              const mItem = buildStandardItem(item);
              if (mItem) merchizeItems.push(mItem);
              continue;
            }

            // Preset item — use the existing pre-generated product when available.
            const jersey = jerseyMap.get(item.jerseyId);
            const { vmi } = findPresetMatch(item, jersey);
            if (vmi?.merchize_product_id) {
              const mItem = buildPresetOrderItem(item, jersey, vmi);
              if (mItem) merchizeItems.push(mItem);
              continue;
            }

            // Preset without a generated product — create one now and auto-fulfill.
            if (!item.custom_merchize_product_id) {
              const created = await createCustomProductForItem({
                baseUrl, token: merchizeToken, apiKey: merchizeKey, item, jersey,
                sellerSkuPrefix: `NEMESIS-${orderId.slice(-6).toUpperCase()}-${cartItems.indexOf(item) + 1}`,
              });
              if (!created) {
                console.error(`Skipping preset product creation for ${item.name}: no base Merchize product`);
                continue;
              }
              // Persist the new product ID so a webhook retry never duplicates it.
              await base44.asServiceRole.entities.Order.update(orderId, {
                items_json: JSON.stringify(cartItems),
              });
            }
            merchizeItems.push(buildCustomOrderItem(item));
          }

          if (merchizeItems.length > 0) {
            const merchizeData = await createMerchizeOrder(baseUrl, merchizeToken, merchizeKey, {
              orderId, customerName, customerEmail, shippingAddress, items: merchizeItems,
            });
            if (merchizeData.success && merchizeData.data?._id && merchizeData.artwork_import?.success === false) {
              await base44.asServiceRole.entities.Order.update(orderId, {
                merchize_order_id: merchizeData.data._id,
                status: 'approved',
                admin_notes: `Stripe: ${session.id}\nMerchize: ${merchizeData.data._id}\nArtwork import failed: ${merchizeData.artwork_import.error}\nArtwork attachment needs admin retry.`,
              });
              console.error(`Merchize artwork import needs retry for order ${orderId}:`, merchizeData.artwork_import.error);
            } else if (merchizeData.success && merchizeData.data?._id) {
              await base44.asServiceRole.entities.Order.update(orderId, {
                merchize_order_id: merchizeData.data._id,
                status: 'approved',
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
        } catch (merchizeErr) {
          console.error('Merchize integration error:', merchizeErr.message || merchizeErr);
        }
      }

      console.log(`Order ${orderId} processed for ${customerEmail}, total $${totalUsd}`);
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('stripe-webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}