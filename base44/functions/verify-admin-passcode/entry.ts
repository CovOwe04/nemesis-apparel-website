import { secrets } from 'base44:runtime';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
const attempts = new Map<string, { count: number; lockedUntil: number }>();

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export default async function(req) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const now = Date.now();
    const record = attempts.get(ip);

    if (record && record.lockedUntil > now) {
      const retryAfter = Math.ceil((record.lockedUntil - now) / 1000);
      return Response.json(
        { valid: false, locked: true, retryAfter },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const passcode = (body.passcode || '').trim();
    const expectedPasscode = secrets.get('ADMIN_PASSCODE');

    if (expectedPasscode && constantTimeEqual(passcode, expectedPasscode)) {
      attempts.delete(ip);
      return Response.json({ valid: true });
    }

    const count = (record?.count || 0) + 1;
    if (count >= MAX_ATTEMPTS) {
      attempts.set(ip, { count: 0, lockedUntil: now + LOCKOUT_MS });
    } else {
      attempts.set(ip, { count, lockedUntil: 0 });
    }

    return Response.json({ valid: false });
  } catch (error) {
    console.error('verify-admin-passcode error:', error);
    return Response.json({ valid: false }, { status: 500 });
  }
}