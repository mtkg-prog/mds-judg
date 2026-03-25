import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_PATHS = ['/login', '/api/health', '/api/setup', '/api/internal/'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Access gate: shared key ---
  const ACCESS_KEY = process.env.ACCESS_KEY;
  if (ACCESS_KEY && !pathname.startsWith('/api/internal/')) {
    const hasAccess = request.cookies.get('access_granted')?.value === ACCESS_KEY;

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

  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
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
