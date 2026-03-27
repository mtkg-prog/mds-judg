import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { verifyToken, SESSION_COOKIE } from '@/lib/carrier-auth/session';

const AUTH_PROVIDER = process.env.AUTH_PROVIDER || 'legacy';

const LEGACY_PUBLIC_PATHS = ['/login', '/api/health', '/api/setup', '/api/internal/'];
const CARRIER_PUBLIC_PATHS = ['/login', '/api/auth/carrier', '/api/health', '/api/setup', '/api/internal/', '/change-password'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Access gate: shared key ---
  const ACCESS_KEY = process.env.ACCESS_KEY;
  if (ACCESS_KEY && !pathname.startsWith('/api/internal/')) {
    const hasAccess =
      request.cookies.get('access_granted')?.value === ACCESS_KEY ||
      request.cookies.has('session') ||
      request.cookies.has(SESSION_COOKIE);

    if (!hasAccess) {
      const keyParam = request.nextUrl.searchParams.get('access_key');
      if (keyParam === ACCESS_KEY) {
        const cleanUrl = new URL(request.nextUrl.pathname, request.url);
        const response = NextResponse.redirect(cleanUrl);
        response.cookies.set('access_granted', ACCESS_KEY, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 365,
          path: '/',
        });
        return response;
      }

      if (!pathname.startsWith('/_next/') && !pathname.startsWith('/favicon.ico')) {
        return new Response(
          '<html><body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif"><h1>アクセスが制限されています</h1></body></html>',
          { status: 403, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
        );
      }
    }
  }
  // --- End access gate ---

  if (AUTH_PROVIDER === 'carrier') {
    return handleCarrierAuth(request, pathname);
  }

  return handleLegacyAuth(request, pathname);
}

/**
 * CarrierAuth: verify carrier_session cookie via JWT
 */
async function handleCarrierAuth(request: NextRequest, pathname: string) {
  // Public paths
  if (
    CARRIER_PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return handleUnauthenticated(request, pathname);
  }

  const secret = process.env.CARRIER_AUTH_JWT_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    console.error('CarrierAuth: JWT_SECRET is not configured');
    return handleUnauthenticated(request, pathname);
  }

  const session = await verifyToken(token, secret);
  if (!session || !session.isActive) {
    return handleUnauthenticated(request, pathname);
  }

  // Admin path check (CarrierAuth role is global; app role is checked server-side)
  return NextResponse.next();
}

function handleUnauthenticated(request: NextRequest, pathname: string) {
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: '未認証' }, { status: 401 });
  }
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('redirect_to', pathname);
  return NextResponse.redirect(loginUrl);
}

/**
 * Legacy auth: verify session JWT cookie
 */
async function handleLegacyAuth(request: NextRequest, pathname: string) {
  if (
    LEGACY_PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('session')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId as string);
    requestHeaders.set('x-user-role', payload.role as string);

    if (pathname.startsWith('/admin') && payload.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Force password change redirect
    if (payload.mustChangePassword && pathname !== '/change-password') {
      return NextResponse.redirect(new URL('/change-password', request.url));
    }

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  } catch {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('session');
    return response;
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
