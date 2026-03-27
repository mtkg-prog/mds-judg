import * as jose from "jose";
import type { CarrierUser } from "./types";

const SESSION_COOKIE = "carrier_session";

/**
 * JWTトークンを検証してCarrierUser情報を返す
 */
export async function verifyToken(
  token: string,
  secret: string
): Promise<CarrierUser | null> {
  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jose.jwtVerify(token, secretKey, {
      issuer: "carrier-auth",
    });

    return {
      id: payload.sub as string,
      email: payload.email as string,
      name: (payload.name as string) || null,
      pictureUrl: (payload.picture as string) || null,
      role: payload.role as "admin" | "user",
      departmentId: (payload.departmentId as string) || null,
      departmentName: (payload.departmentName as string) || null,
      position: (payload.position as string) || null,
      managerId: (payload.managerId as string) || null,
      isActive: payload.isActive as boolean,
    };
  } catch {
    return null;
  }
}

/**
 * Next.js Server Component / API Route からセッションを取得する
 */
export async function getCarrierSession(): Promise<CarrierUser | null> {
  // Dynamic import to work in server context
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const secret = process.env.JWT_SECRET || process.env.CARRIER_AUTH_JWT_SECRET;
  if (!secret) {
    throw new Error(
      "CarrierAuth SDK: JWT_SECRET or CARRIER_AUTH_JWT_SECRET must be set"
    );
  }

  return verifyToken(token, secret);
}

/**
 * セッションを取得し、未認証の場合はエラーをスローする
 */
export async function requireCarrierAuth(): Promise<CarrierUser> {
  const session = await getCarrierSession();
  if (!session) {
    throw new Error("認証が必要です");
  }
  if (!session.isActive) {
    throw new Error("このアカウントは無効化されています");
  }
  return session;
}

/**
 * 管理者権限を要求する
 */
export async function requireCarrierAdmin(): Promise<CarrierUser> {
  const session = await requireCarrierAuth();
  if (session.role !== "admin") {
    throw new Error("管理者権限が必要です");
  }
  return session;
}

export { SESSION_COOKIE };
