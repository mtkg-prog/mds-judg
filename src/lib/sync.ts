export interface SyncPayload {
  action: "create" | "update-password";
  email: string;
  name?: string;
  passwordHash?: string | null;
  role?: string;
}

export async function syncToSisterApp(data: SyncPayload): Promise<void> {
  const url = process.env.SISTER_APP_API_URL;
  const secret = process.env.INTERNAL_API_SECRET;

  if (!url || !secret) return;

  try {
    const res = await fetch(`${url}/api/internal/sync-user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("ユーザー同期失敗:", res.status, text);
    }
  } catch (error) {
    console.error("ユーザー同期エラー:", error);
  }
}

// mds-judg → hr-faq ロールマッピング
const ROLE_MAP: Record<string, string> = {
  admin: "ADMIN",
  manager: "EDITOR",
  employee: "VIEWER",
};

export function mapRoleToSisterApp(role: string): string {
  return ROLE_MAP[role] || "VIEWER";
}
