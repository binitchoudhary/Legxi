import { NextResponse } from 'next/server';
import { getFastifyUrl, setAuthCookies, signJWT } from '@/lib/auth-server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('legxi_refresh')?.value;

    if (!refreshToken) {
      return NextResponse.json({ success: false, error: { message: 'Missing refresh token' } }, { status: 401 });
    }

    const correlationId = request.headers.get('x-correlation-id') || crypto.randomUUID();

    // 1. Forward refresh token to Fastify
    const response = await fetch(getFastifyUrl('/auth/refresh'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': request.headers.get('user-agent') || '',
        'X-Forwarded-For': request.headers.get('x-forwarded-for') || '',
        'x-correlation-id': correlationId,
      },
      body: JSON.stringify({ refreshToken })
    });

    const data = await response.json();

    if (!response.ok) {
      const errRes = NextResponse.json(data, { status: response.status });
      errRes.headers.set('x-correlation-id', correlationId);
      return errRes;
    }

    const { user, refreshToken: newRefreshToken } = data;

    // 2. Gateway signs new JWT
    const jwt = await signJWT(user);

    // 3. Set HttpOnly cookies
    await setAuthCookies(jwt, newRefreshToken);

    // 4. Return user to frontend (stripping the refresh token!)
    const successRes = NextResponse.json({ success: true, user });
    successRes.headers.set('x-correlation-id', correlationId);
    return successRes;

  } catch (error: any) {
    console.error('Refresh error:', error);
    return NextResponse.json({ success: false, error: { message: 'Internal Server Error' } }, { status: 500 });
  }
}
