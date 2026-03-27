import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "../session";

/**
 * ログアウトハンドラー
 *
 * 使い方:
 * ```typescript
 * // app/api/auth/carrier/logout/route.ts
 * import { handleLogout } from '@carrier-auth/nextjs/handlers';
 * export const POST = handleLogout;
 * ```
 */
export async function handleLogout() {
  const response = NextResponse.json({ success: true });
  response.headers.set(
    "Set-Cookie",
    `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`
  );
  return response;
}
