/**
 * CarrierAuth ユーザー情報
 */
export interface CarrierUser {
  /** 社員ID */
  id: string;
  /** Googleメールアドレス */
  email: string;
  /** 名前 */
  name: string | null;
  /** Googleアイコン画像URL */
  pictureUrl: string | null;
  /** グローバルロール: admin | user */
  role: "admin" | "user";
  /** 部署ID */
  departmentId: string | null;
  /** 部署名 */
  departmentName: string | null;
  /** 役職 */
  position: string | null;
  /** 上司ID */
  managerId: string | null;
  /** アカウント有効状態 */
  isActive: boolean;
}

/**
 * CarrierAuth SDK 設定
 */
export interface CarrierAuthConfig {
  /** CarrierAuth APIのURL (例: "https://carrier-auth-xxxxx.run.app") */
  apiUrl: string;
  /** Google OAuth2 クライアントID */
  googleClientId: string;
  /** Google OAuth2 クライアントシークレット */
  googleClientSecret: string;
  /** 許可するメールドメイン (例: "company.co.jp") */
  allowedDomain?: string;
  /** ログインページのパス (デフォルト: "/login") */
  loginPath?: string;
  /** コールバックパス (デフォルト: "/api/auth/carrier/callback") */
  callbackPath?: string;
  /** セッション有効期限(時間) (デフォルト: 24) */
  sessionExpireHours?: number;
  /** CarrierAuth APIシークレット (サービス間認証用) */
  apiSecret?: string;
  /** システム名 (監査ログ用) */
  systemName?: string;
}
