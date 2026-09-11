import { checkAdminPasscode } from '../../shared/security.ts';

export default async function(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const passcode = (body.passcode || '').trim();
    const result = checkAdminPasscode(req, passcode);

    if (result.authorized) return Response.json({ valid: true });
    if (result.locked) {
      return Response.json(
        { valid: false, locked: true, retryAfter: result.retryAfter },
        { status: 429, headers: { 'Retry-After': String(result.retryAfter) } },
      );
    }
    return Response.json({ valid: false });
  } catch (error) {
    console.error('verify-admin-passcode error:', error);
    return Response.json({ valid: false }, { status: 500 });
  }
}