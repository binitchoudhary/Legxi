import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'development-super-secret-key-that-is-very-long');

const SESSION_COOKIE_NAME = 'legxi_session';
const REFRESH_COOKIE_NAME = 'legxi_refresh';

export async function signJWT(user: { id: string; email: string; roles: string[] }) {
  // Convert roles array to single string role for the JWT as per contract
  const primaryRole = user.roles && user.roles.length > 0 ? user.roles[0] : 'USER';
  
  return new SignJWT({
    sub: user.id,
    email: user.email,
    role: primaryRole,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setIssuer('legxi-gateway')
    .setAudience('legxi-fastify')
    .setExpirationTime('15m')
    .setJti(crypto.randomUUID())
    .sign(SECRET);
}

export async function setAuthCookies(jwt: string, refreshToken: string) {
  const cookieStore = await cookies();
  
  const secure = process.env.NODE_ENV === 'production';
  
  // 15 minutes
  cookieStore.set(SESSION_COOKIE_NAME, jwt, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60, 
  });

  // 7 days
  cookieStore.set(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  
  const secure = process.env.NODE_ENV === 'production';
  
  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });

  cookieStore.set(REFRESH_COOKIE_NAME, '', {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });
}

export function getFastifyUrl(path: string) {
  const baseUrl = process.env.BACKEND_API_URL || 'http://localhost:8080/api/v1';
  return `${baseUrl}${path}`;
}
