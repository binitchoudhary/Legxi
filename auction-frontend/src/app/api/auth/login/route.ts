import { NextResponse } from 'next/server';
import { getFastifyUrl, setAuthCookies, signJWT } from '@/lib/auth-server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const correlationId = request.headers.get('x-correlation-id') || crypto.randomUUID();

    // 1. Forward credentials to Fastify
    const response = await fetch(getFastifyUrl('/auth/login'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': request.headers.get('user-agent') || '',
        'X-Forwarded-For': request.headers.get('x-forwarded-for') || '',
        'x-correlation-id': correlationId,
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      const errRes = NextResponse.json(data, { status: response.status });
      errRes.headers.set('x-correlation-id', correlationId);
      return errRes;
    }

    const { user, refreshToken } = data;

    // 2. Gateway signs new JWT
    const jwt = await signJWT(user);

    // 3. Set HttpOnly cookies
    await setAuthCookies(jwt, refreshToken);

    // 4. Return user to frontend (stripping the refresh token!)
    const successRes = NextResponse.json({ success: true, user });
    successRes.headers.set('x-correlation-id', correlationId);
    return successRes;

  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: { message: 'Internal Server Error' } }, { status: 500 });
  }
}
