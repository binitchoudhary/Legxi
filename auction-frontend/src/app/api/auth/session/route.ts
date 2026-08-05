import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';

// Use a deterministic secret for local development
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'development-super-secret-key-that-is-very-long');

const DEMO_USERS = [
  { id: 'usr_admin', email: 'admin@legxi.com', name: 'System Admin', role: 'ADMIN', phone: '+1234567890' },
  { id: 'usr_collector', email: 'collector@legxi.com', name: 'Demo Collector', role: 'USER', phone: '+1234567891' },
  { id: 'usr_vip', email: 'vip@legxi.com', name: 'VIP Collector', role: 'USER', phone: '+1234567892' },
  { id: 'usr_operator', email: 'operator@legxi.com', name: 'System Operator', role: 'OPERATOR', phone: '+1234567893' },
  { id: 'usr_guest', email: 'guest@legxi.com', name: 'Guest User', role: 'USER', phone: '+1234567894' },
];

export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get('legxi_session')?.value;

  if (!sessionToken) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'No session found' } },
      { status: 401 }
    );
  }

  try {
    const { payload } = await jwtVerify(sessionToken, SECRET);
    
    // We recreate the user object to send back to the client
    const user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role
    };

    return NextResponse.json({ success: true, user, role: payload.role });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Session invalid' } },
      { status: 401 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // Development Identity Gateway: deterministic login
    const user = DEMO_USERS.find(u => u.email === email) || DEMO_USERS.find(u => u.email === 'collector@legxi.com');

    // Create development JWT
    const token = await new SignJWT({
      sub: user!.id,
      email: user!.email,
      name: user!.name,
      role: user!.role,
      phone: user!.phone
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(SECRET);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user!.id,
        email: user!.email,
        name: user!.name
      },
      role: user!.role
    });

    // Set the cookie exactly as production would
    response.cookies.set({
      name: 'legxi_session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    return response;
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Authentication failed' }, { status: 400 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('legxi_session');
  return response;
}
