import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'development-super-secret-key-that-is-very-long');

export async function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get('legxi_session')?.value;
  const { pathname } = request.nextUrl;

  // 1. Identity Gateway Proxy Interceptor
  if (pathname.startsWith('/api/proxy')) {
    const requestHeaders = new Headers(request.headers);
    
    if (sessionToken) {
      try {
        const { payload } = await jwtVerify(sessionToken, SECRET);
        const userContext = {
          user: {
            id: payload.sub,
            roles: [payload.role] // Pass role as an array of strings
          }
        };
        // Inject exactly as production API Gateway would
        requestHeaders.set('x-user-context', JSON.stringify(userContext));
      } catch (e) {
        console.error("Identity Gateway: Invalid development session token", e);
      }
    }
    
    // We must forward the updated headers
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // 2. Coarse Route Protection
  if (pathname.startsWith('/admin')) {
    if (!sessionToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  if (pathname.startsWith('/profile') || pathname.startsWith('/my-auctions')) {
    if (!sessionToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/profile/:path*', '/my-auctions/:path*', '/api/proxy/:path*'],
};
