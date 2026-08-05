import { NextResponse } from 'next/server';
import { getFastifyUrl, clearAuthCookies } from '@/lib/auth-server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('legxi_refresh')?.value;

    if (refreshToken) {
      // 1. Forward refresh token to Fastify for revocation
      await fetch(getFastifyUrl('/auth/logout'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': request.headers.get('user-agent') || '',
          'X-Forwarded-For': request.headers.get('x-forwarded-for') || ''
        },
        body: JSON.stringify({ refreshToken })
      });
    }

    // 2. Gateway clears cookies regardless of backend response
    await clearAuthCookies();

    return new Response(null, { status: 204 });

  } catch (error: any) {
    console.error('Logout error:', error);
    // Even if backend fails, clear local session
    await clearAuthCookies();
    return new Response(null, { status: 204 });
  }
}
