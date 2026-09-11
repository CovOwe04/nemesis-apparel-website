import { secrets } from 'base44:runtime';

// ===== Admin passcode verification (rate-limited + constant-time) =====
// Centralized so every passcode-protected endpoint enforces the same
// brute-force protection — not just the login verifier.

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

function getClientIp(req): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

export function checkAdminPasscode(req, passcode: string) {
  const ip = getClientIp(req);
  const now = Date.now();
  const record = attempts.get(ip);

  if (record && record.lockedUntil > now) {
    return { authorized: false, locked: true, retryAfter: Math.ceil((record.lockedUntil - now) / 1000) };
  }

  const expectedPasscode = secrets.get('ADMIN_PASSCODE') || '';
  if (expectedPasscode && constantTimeEqual((passcode || '').trim(), expectedPasscode)) {
    attempts.delete(ip);
    return { authorized: true };
  }

  const count = (record?.count || 0) + 1;
  if (count >= MAX_ATTEMPTS) {
    attempts.set(ip, { count: 0, lockedUntil: now + LOCKOUT_MS });
  } else {
    attempts.set(ip, { count, lockedUntil: 0 });
  }
  return { authorized: false, locked: false };
}

// Returns null if authorized, or a 401/429 Response to send back if not.
export function requireAdminPasscode(req, passcode: string): Response | null {
  const result = checkAdminPasscode(req, passcode);
  if (result.authorized) return null;
  if (result.locked) {
    return Response.json(
      { error: 'Too many attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(result.retryAfter) } },
    );
  }
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}

// ===== SSRF prevention: validate user-supplied image URLs before fetching =====

export function isSafeImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

  const host = parsed.hostname.toLowerCase().replace(/^\[|]$/g, '');

  // Block localhost / loopback
  if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1' || host === '::') return false;
  // Block cloud metadata & link-local
  if (host === '169.254.169.254' || host === '169.254.170.2') return false;
  if (/^169\.254\./.test(host)) return false;
  // Block private IPv4 ranges (RFC 1918)
  if (/^10\./.test(host)) return false;
  if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(host)) return false;
  if (/^192\.168\./.test(host)) return false;
  // Block IPv6 unique local (fc00::/7) and link-local (fe80::/10)
  if (/^f[cd][0-9a-f]{2}/.test(host)) return false;
  if (/^fe[89ab][0-9a-f]{2}/.test(host)) return false;

  return true;
}