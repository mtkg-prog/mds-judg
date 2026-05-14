import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, findOrCreateGoogleUser } from '@/lib/auth';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

const SESSION_COOKIE = 'session';

/**
 * Google OAuth 環境変数を取得
 */
function getGoogleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET が未設定です');
  }
  return {
    clientId,
    clientSecret,
    allowedDomain: process.env.ALLOWED_DOMAIN || '',
  };
}

/**
 * Google ログインハンドラー（Google OAuth 画面にリダイレクト）
 */
export function handleGoogleLogin(request: NextRequest) {
  const config = getGoogleConfig();
  const redirectTo = request.nextUrl.searchParams.get('redirect_to') || '/';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: `${appUrl}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    state: redirectTo,
    prompt: 'consent',
    // 単一ドメインの場合、hd パラメータでドメイン制限
    ...(config.allowedDomain && !config.allowedDomain.includes(',')
      ? { hd: config.allowedDomain.trim() }
      : {}),
  });

  return NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
}

/**
 * Google OAuth コールバックハンドラー
 *
 * 1. Google の認可コードをアクセストークンに交換
 * 2. Google ユーザー情報を取得
 * 3. ドメイン検証
 * 4. ローカル User/Employee を find-or-create
 * 5. セッション JWT を発行して Cookie に設定
 */
export async function handleGoogleCallback(request: NextRequest) {
  const config = getGoogleConfig();
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state') || '/';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${appUrl}/login?error=no_code`);
  }

  try {
    // 1. Google の認可コードをアクセストークンに交換
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: `${appUrl}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const tokenError = await tokenRes.text().catch(() => '');
      console.error('Google token exchange failed:', tokenRes.status, tokenError);
      throw new Error('Failed to exchange code for token');
    }

    const tokenData = await tokenRes.json();

    // 2. Google ユーザー情報を取得
    const userRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) {
      throw new Error('Failed to fetch user info');
    }

    const googleUser = await userRes.json();

    // 3. ドメイン検証（カンマ区切りで複数ドメイン対応）
    if (config.allowedDomain) {
      const allowed = config.allowedDomain
        .split(',')
        .map((d: string) => d.trim().toLowerCase())
        .filter(Boolean);
      const domain = googleUser.email.split('@')[1]?.toLowerCase();
      if (!allowed.includes(domain ?? '')) {
        return NextResponse.redirect(`${appUrl}/login?error=domain_not_allowed`);
      }
    }

    // 4. ローカル User/Employee を find-or-create
    const { userId, role } = await findOrCreateGoogleUser(
      googleUser.email,
      googleUser.name || ''
    );

    // 5. セッション JWT を発行して Cookie に設定
    const { token, expiresAt } = await createSessionToken(userId, role);
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    const maxAge = Math.floor((expiresAt.getTime() - Date.now()) / 1000);

    const redirectUrl = state.startsWith('/') ? `${appUrl}${state}` : state;
    const response = NextResponse.redirect(redirectUrl);
    response.headers.set(
      'Set-Cookie',
      `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`
    );

    return response;
  } catch (error) {
    console.error(
      'Google OAuth callback error:',
      error instanceof Error ? error.message : error,
      error instanceof Error ? error.stack : ''
    );
    return NextResponse.redirect(`${appUrl}/login?error=auth_failed`);
  }
}
