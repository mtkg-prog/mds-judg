import { NextRequest, NextResponse } from "next/server";
import { getConfig } from "../config";
import { SESSION_COOKIE } from "../session";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

/**
 * Google OAuth コールバックハンドラー
 *
 * 1. Googleの認可コードをアクセストークンに交換
 * 2. Googleユーザー情報を取得
 * 3. ドメイン検証
 * 4. CarrierAuth APIの /api/auth/exchange にユーザー情報を送信してJWTを取得
 * 5. JWTをCookieに設定してリダイレクト
 *
 * 使い方:
 * ```typescript
 * // app/api/auth/carrier/callback/route.ts
 * import { handleCallback } from '@carrier-auth/nextjs/handlers';
 * export const GET = handleCallback;
 * ```
 */
export async function handleCallback(request: NextRequest) {
  const config = getConfig();
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state") || "/";
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const loginPath = config.loginPath || "/login";

  if (!code) {
    return NextResponse.redirect(`${appUrl}${loginPath}?error=no_code`);
  }

  try {
    // 1. Googleの認可コードをアクセストークンに交換
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.googleClientId,
        client_secret: config.googleClientSecret,
        redirect_uri: `${appUrl}${config.callbackPath || "/api/auth/carrier/callback"}`,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      throw new Error("Failed to exchange code for token");
    }

    const tokenData = await tokenRes.json();

    // 2. Googleユーザー情報を取得
    const userRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) {
      throw new Error("Failed to fetch user info");
    }

    const googleUser = await userRes.json();

    // 3. ドメイン検証（カンマ区切りで複数ドメイン対応）
    if (config.allowedDomain) {
      const allowed = config.allowedDomain
        .split(",")
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean);
      const domain = googleUser.email.split("@")[1]?.toLowerCase();
      if (!allowed.includes(domain ?? "")) {
        return NextResponse.redirect(
          `${appUrl}${loginPath}?error=domain_not_allowed`
        );
      }
    }

    // 4. CarrierAuth APIにユーザー情報を送信してJWTトークンを取得
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const apiSecret = config.apiSecret || process.env.CARRIER_API_SECRET;
    if (apiSecret) {
      headers["x-carrier-auth-key"] = apiSecret;
    }

    const exchangeRes = await fetch(
      `${config.apiUrl}/api/auth/exchange`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          email: googleUser.email,
          name: googleUser.name,
          picture: googleUser.picture,
          systemName: config.systemName || process.env.SYSTEM_NAME || "unknown",
        }),
      }
    );

    if (!exchangeRes.ok) {
      const errorData = await exchangeRes.json().catch(() => ({}));
      throw new Error(
        `CarrierAuth exchange failed: ${errorData.error || exchangeRes.status}`
      );
    }

    const { token: sessionToken } = await exchangeRes.json();

    if (!sessionToken) {
      throw new Error("No session token from CarrierAuth API");
    }

    // 5. セッションCookieを設定してリダイレクト
    const expireHours = config.sessionExpireHours || 24;
    const maxAge = expireHours * 60 * 60;
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";

    const redirectUrl = state.startsWith("/")
      ? `${appUrl}${state}`
      : state;
    const response = NextResponse.redirect(redirectUrl);
    response.headers.set(
      "Set-Cookie",
      `${SESSION_COOKIE}=${sessionToken}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`
    );

    return response;
  } catch (error) {
    console.error("CarrierAuth callback error:", error);
    return NextResponse.redirect(
      `${appUrl}${loginPath}?error=auth_failed`
    );
  }
}
