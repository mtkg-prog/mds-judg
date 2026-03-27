import { NextRequest, NextResponse } from "next/server";
import { verifyToken, SESSION_COOKIE } from "./session";

interface WithCarrierAuthOptions {
  /** ログインページのパス (デフォルト: "/login") */
  loginPath?: string;
  /** 認証不要のパス */
  publicPaths?: string[];
  /** 管理者専用のパス */
  adminPaths?: string[];
}

/**
 * Next.js ミドルウェアラッパー
 *
 * 使い方:
 * ```typescript
 * // middleware.ts
 * import { withCarrierAuth } from '@carrier-auth/nextjs';
 * export default withCarrierAuth();
 * export const config = { matcher: ['/((?!_next|favicon.ico).*)'] };
 * ```
 */
export function withCarrierAuth(options: WithCarrierAuthOptions = {}) {
  const {
    loginPath = "/login",
    publicPaths = ["/login", "/api/auth/carrier"],
    adminPaths = [],
  } = options;

  return async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 認証不要のパスはスキップ
    if (publicPaths.some((p) => pathname.startsWith(p))) {
      return NextResponse.next();
    }

    // セッションCookieを検証
    const token = request.cookies.get(SESSION_COOKIE)?.value;

    if (!token) {
      return handleUnauthenticated(request, pathname, loginPath);
    }

    const secret =
      process.env.CARRIER_AUTH_JWT_SECRET || process.env.JWT_SECRET;
    if (!secret) {
      console.error("CarrierAuth: JWT_SECRET is not configured");
      return handleUnauthenticated(request, pathname, loginPath);
    }

    const session = await verifyToken(token, secret);
    if (!session || !session.isActive) {
      return handleUnauthenticated(request, pathname, loginPath);
    }

    // 管理者専用パスのチェック
    if (adminPaths.some((p) => pathname.startsWith(p))) {
      if (session.role !== "admin") {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json(
            { error: "管理者権限が必要です" },
            { status: 403 }
          );
        }
        return NextResponse.redirect(
          new URL(`${loginPath}?error=not_admin`, request.url)
        );
      }
    }

    return NextResponse.next();
  };
}

function handleUnauthenticated(
  request: NextRequest,
  pathname: string,
  loginPath: string
) {
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "未認証" }, { status: 401 });
  }
  const loginUrl = new URL(loginPath, request.url);
  loginUrl.searchParams.set("redirect_to", pathname);
  return NextResponse.redirect(loginUrl);
}
