// Shared refund / cancellation notice email, used by the admin refund action
// and by the Stripe webhook when a refund is issued directly in Stripe.

import { secrets } from 'base44:runtime';

const LOGO_URL = 'https://media.base44.com/images/public/6a95dbf0d98672e2f49452f4/65e457e18_Asset63x.png';

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function money(usd) {
  return `$${Number(usd || 0).toFixed(2)}`;
}

export function buildRefundNotice({ customerName, orderId, refundedUsd = 0, fullRefund = true, cancelled = false, reason = '' }) {
  const orderRef = `#${String(orderId || '').slice(-8).toUpperCase()}`;
  const headline = cancelled ? 'Order Cancelled' : 'Refund Processed';
  const bodyText = cancelled
    ? `Your order ${orderRef} has been cancelled. No charge was taken, so there is nothing for you to do.`
    : fullRefund
      ? `Your order ${orderRef} has been cancelled and a full refund of ${money(refundedUsd)} has been issued to your original payment method.`
      : `A partial refund of ${money(refundedUsd)} has been issued for order ${orderRef} to your original payment method.`;
  const timeline = cancelled
    ? 'Because no payment was captured, nothing further is needed from your bank.'
    : 'Refunds usually appear on your statement within 5 to 10 business days, depending on your bank.';
  const reasonLine = reason ? `<p style="font-family:'Inter',Arial,sans-serif;color:#9A9A9A;font-size:13px;line-height:1.6;margin:12px 0 0;">Reason: ${esc(reason)}</p>` : '';

  return `<!doctype html>
<html><body style="margin:0;padding:0;background-color:#000000;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#000000;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#0A0A0A;border:1px solid #2D2D2D;border-radius:8px;overflow:hidden;">
        <tr><td style="padding:36px 40px 28px;border-bottom:1px solid #2D2D2D;background-color:#000000;">
          <img src="${LOGO_URL}" alt="Nemesis Apparel" width="44" height="44" style="display:block;margin:0 auto 18px;" />
          <div align="center" style="font-family:'Space Grotesk',Arial,sans-serif;font-size:11px;letter-spacing:0.28em;color:#FF1F3D;text-transform:uppercase;">Order Update</div>
          <div align="center" style="font-family:'Space Grotesk',Arial,sans-serif;font-size:24px;font-weight:700;color:#FFFFFF;text-transform:uppercase;letter-spacing:0.02em;margin-top:10px;">${headline}</div>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="font-family:'Inter',Arial,sans-serif;color:#F5F5F7;font-size:15px;line-height:1.6;margin:0 0 8px;">Hey ${esc(customerName)},</p>
          <p style="font-family:'Inter',Arial,sans-serif;color:#9A9A9A;font-size:14px;line-height:1.6;margin:0 0 20px;">${bodyText}</p>
          <div style="padding:20px;background-color:#000000;border:1px solid #2D2D2D;border-radius:6px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-family:'Space Grotesk',Arial,sans-serif;font-size:11px;letter-spacing:0.15em;color:#6B6B6B;text-transform:uppercase;">Order</td>
                <td align="right" style="font-family:'Space Grotesk',Arial,sans-serif;font-size:13px;color:#F5F5F7;">${orderRef}</td>
              </tr>
              ${cancelled ? '' : `<tr>
                <td style="font-family:'Space Grotesk',Arial,sans-serif;font-size:11px;letter-spacing:0.15em;color:#6B6B6B;text-transform:uppercase;padding-top:8px;">Amount Refunded</td>
                <td align="right" style="font-family:'Space Grotesk',Arial,sans-serif;font-size:13px;color:#FF1F3D;font-weight:700;padding-top:8px;">${money(refundedUsd)}</td>
              </tr>`}
            </table>
            ${reasonLine}
          </div>
          <p style="font-family:'Inter',Arial,sans-serif;color:#9A9A9A;font-size:13px;line-height:1.6;margin:20px 0 0;">${timeline}</p>
          <p style="font-family:'Inter',Arial,sans-serif;color:#9A9A9A;font-size:13px;line-height:1.6;margin:12px 0 0;">If you have any questions about this, just reply to this email and our team will get you sorted.</p>
        </td></tr>
        <tr><td style="padding:28px 40px 36px;border-top:1px solid #2D2D2D;background-color:#000000;">
          <p style="font-family:'Space Grotesk',Arial,sans-serif;color:#6B6B6B;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;margin:0;">Nemesis Apparel &middot; The Rally Never Stops</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// Sends the notice via Resend. Best effort: never throws, so a mail failure
// never undoes a refund that Stripe has already processed.
export async function sendRefundNotice({ to, customerName, orderId, refundedUsd = 0, fullRefund = true, cancelled = false, reason = '' }) {
  if (!to) return { sent: false, error: 'No customer email on file.' };
  try {
    const resendApiKey = secrets.get('RESEND_API_KEY');
    const fromEmail = secrets.get('RESEND_FROM_EMAIL') || 'Nemesis Apparel <onboarding@resend.dev>';
    const orderRef = `#${String(orderId || '').slice(-8).toUpperCase()}`;
    const subject = cancelled
      ? `Nemesis Apparel — Order Cancelled ${orderRef}`
      : `Nemesis Apparel — Refund Processed ${orderRef}`;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromEmail,
        to,
        subject,
        html: buildRefundNotice({ customerName, orderId, refundedUsd, fullRefund, cancelled, reason }),
      }),
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Resend ${res.status}: ${data.message || JSON.stringify(data)}`);
    console.log(`Refund notice sent to ${to} (id: ${data.id})`);
    return { sent: true };
  } catch (err) {
    console.error('Refund notice email FAILED:', err.message || err);
    return { sent: false, error: err.message || 'Email failed' };
  }
}