import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import Stripe from 'npm:stripe@17.7.0';
import { requireAdminPasscode } from '../../shared/security.ts';

const LOGO_URL = 'https://media.base44.com/images/public/6a95dbf0d98672e2f49452f4/65e457e18_Asset63x.png';

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function buildRefundHtml({ customerName, orderId }) {
  const orderRef = `#${orderId.slice(-8).toUpperCase()}`;
  return `<!doctype html>
<html><body style="margin:0;padding:0;background-color:#000000;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#000000;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#0A0A0A;border:1px solid #2D2D2D;border-radius:8px;overflow:hidden;">
        <tr><td style="padding:36px 40px 28px;border-bottom:1px solid #2D2D2D;background-color:#000000;">
          <img src="${LOGO_URL}" alt="Nemesis Apparel" width="44" height="44" style="display:block;margin:0 auto 18px;" />
          <div align="center" style="font-family:'Space Grotesk',Arial,sans-serif;font-size:11px;letter-spacing:0.28em;color:#FF1F3D;text-transform:uppercase;">Order Update</div>
          <div align="center" style="font-family:'Space Grotesk',Arial,sans-serif;font-size:24px;font-weight:700;color:#FFFFFF;text-transform:uppercase;letter-spacing:0.02em;margin-top:10px;">Refund Processed</div>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="font-family:'Inter',Arial,sans-serif;color:#F5F5F7;font-size:15px;line-height:1.6;margin:0 0 6px;">Hey ${esc(customerName)},</p>
          <p style="font-family:'Inter',Arial,sans-serif;color:#9A9A9A;font-size:14px;line-height:1.6;margin:0 0 20px;">Your order ${orderRef} has been reviewed and unfortunately we weren't able to approve the custom design submitted through the Identity Lab. A full refund has been issued to your original payment method.</p>
          <div style="padding:20px;background-color:#000000;border:1px solid #2D2D2D;border-radius:6px;">
            <p style="font-family:'Inter',Arial,sans-serif;color:#F5F5F7;font-size:14px;line-height:1.6;margin:0 0 8px;">This typically happens when the custom name or number doesn't meet our design guidelines. If you believe this was an error or would like to resubmit with adjusted customization, we're happy to help.</p>
            <p style="font-family:'Inter',Arial,sans-serif;color:#9A9A9A;font-size:13px;line-height:1.6;margin:0;">Simply reply to this email and our team will get you sorted.</p>
          </div>
        </td></tr>
        <tr><td style="padding:28px 40px 36px;border-top:1px solid #2D2D2D;background-color:#000000;">
          <p style="font-family:'Space Grotesk',Arial,sans-serif;color:#6B6B6B;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;margin:0;">Nemesis Apparel &middot; The Rally Never Stops</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export default async function (req) {
  try {
    const body = await req.json();
    const { orderId, reason, passcode } = body;

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
    if (order.status !== 'pending_approval') {
      return Response.json({ error: 'Order is not pending approval' });
    }

    const stripe = new Stripe(secrets.get('STRIPE_SECRET_KEY'));
    const paymentIntentId = order.stripe_payment_id || '';

    // Issue Stripe refund
    let refundId = '';
    if (paymentIntentId) {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: paymentIntentId,
          reason: 'requested_by_customer',
        });
        refundId = refund.id;
        console.log(`Refund issued: ${refundId} for order ${orderId}`);
      } catch (err) {
        console.error('Refund failed:', err.message);
        return Response.json({ error: `Refund failed: ${err.message}` });
      }
    } else {
      console.error('No stripe_payment_id on order — cannot refund');
      return Response.json({ error: 'No payment intent on file — cannot refund' });
    }

    // Send refund notification email
    try {
      const resendApiKey = secrets.get('RESEND_API_KEY');
      const fromEmail = secrets.get('RESEND_FROM_EMAIL') || 'Nemesis Apparel <onboarding@resend.dev>';
      const customerEmail = order.customer_email || '';
      const customerName = order.customer_name || '';
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: customerEmail,
          subject: `Nemesis Apparel — Refund Processed #${orderId.slice(-8).toUpperCase()}`,
          html: buildRefundHtml({ customerName, orderId }),
        }),
      });
      const resendData = await resendRes.json();
      if (!resendRes.ok) {
        throw new Error(`Resend ${resendRes.status}: ${resendData.message || JSON.stringify(resendData)}`);
      }
      console.log(`Refund email sent to ${customerEmail}`);
    } catch (emailErr) {
      console.error('Refund email FAILED:', emailErr.message || emailErr);
    }

    await base44.asServiceRole.entities.Order.update(orderId, {
      status: 'rejected',
      admin_notes: (order.admin_notes || '') + `\nRejected & refunded: ${refundId}${reason ? ` — ${reason}` : ''}`,
    });

    return Response.json({ success: true, refund_id: refundId });
  } catch (error) {
    console.error('reject-custom-order error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}