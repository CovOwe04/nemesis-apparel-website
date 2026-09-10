import { secrets } from 'base44:runtime';

export default async function(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const passcode = (body.passcode || '').trim();
    const expectedPasscode = secrets.get('ADMIN_PASSCODE');
    if (expectedPasscode && passcode === expectedPasscode) {
      return Response.json({ valid: true });
    }
    return Response.json({ valid: false });
  } catch (error) {
    console.error('verify-admin-passcode error:', error);
    return Response.json({ valid: false }, { status: 500 });
  }
}