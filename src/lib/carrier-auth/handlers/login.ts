import { NextRequest, NextResponse } from "next/server";
import { getConfig } from "../config";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

/**
 * Googleログインハンドラー
 *
 * 使い方:
 * ```typescript
 * // app/api/auth/carrier/login/route.ts
 * import { handleLogin } from '@carrier-auth/nextjs/handlers';
 * export const GET = handleLogin;
 * ```
 */
export function handleLogin(request: NextRequest) {
  const config = getConfig();
  const redirectTo = request.nextUrl.searchParams.get("redirect_to") || "/";
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

  const params = new URLSearchParams({
    client_id: config.googleClientId,
    redirect_uri: `${appUrl}${config.callbackPath || "/api/auth/carrier/callback"}`,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    state: redirectTo,
    prompt: "consent",
    ...(config.allowedDomain && !config.allowedDomain.includes(",")
      ? { hd: config.allowedDomain.trim() }
      : {}),
  });

  return NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
}
