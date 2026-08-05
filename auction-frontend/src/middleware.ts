import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'development-super-secret-key-that-is-very-long');

export async function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get('legxi_session')?.value;
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);

  // 1. Forcefully strip any incoming browser identity header
  requestHeaders.delete('x-user-context');

  // 2. Correlation ID Propagation
  if (!requestHeaders.has('x-correlation-id')) {
    requestHeaders.set('x-correlation-id', crypto.randomUUID());
  }

  // 3. JWT Verification & Trusted Identity Injection
  if (sessionToken) {
    try {
      const { payload } = await jwtVerify(sessionToken, SECRET, {
        issuer: 'legxi-gateway',
        audience: 'legxi-fastify',
      });
      const userContext = {
        user: {
          id: payload.sub,
          roles: [payload.role] // Convert single string to array as per contract
        }
      };
      // Inject trusted identity
      requestHeaders.set('x-user-context', JSON.stringify(userContext));
    } catch {
      // Invalid or expired session token - backend will reject unauthenticated access via authenticateIdentity
    }
  }

  // 4. API & WebSocket Proxy Interception
  if (pathname.startsWith('/api/proxy')) {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // 5. Coarse Route Protection for Frontend
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (pathname.startsWith('/admin') || pathname.startsWith('/profile') || pathname.startsWith('/my-auctions')) {
    if (!sessionToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/profile/:path*', '/my-auctions/:path*', '/api/proxy/:path*'],
};
