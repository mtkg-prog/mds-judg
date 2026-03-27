import type { CarrierAuthConfig } from "./types";

let _config: CarrierAuthConfig | null = null;

/**
 * SDK設定を初期化する
 */
export function initCarrierAuth(config: CarrierAuthConfig): void {
  _config = config;
}

/**
 * 環境変数から設定を読み込む
 */
export function getConfig(): CarrierAuthConfig {
  if (_config) return _config;

  // 環境変数からフォールバック
  const apiUrl = process.env.CARRIER_AUTH_API_URL;
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!apiUrl || !googleClientId || !googleClientSecret) {
    throw new Error(
      "CarrierAuth SDK: CARRIER_AUTH_API_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET must be set"
    );
  }

  return {
    apiUrl,
    googleClientId,
    googleClientSecret,
    allowedDomain: process.env.ALLOWED_DOMAIN,
    loginPath: process.env.CARRIER_AUTH_LOGIN_PATH || "/login",
    callbackPath:
      process.env.CARRIER_AUTH_CALLBACK_PATH || "/api/auth/carrier/callback",
    sessionExpireHours: parseInt(
      process.env.SESSION_EXPIRE_HOURS || "24",
      10
    ),
    apiSecret: process.env.CARRIER_API_SECRET,
    systemName: process.env.SYSTEM_NAME,
  };
}
