import type { CarrierUser } from "./types";
import { getConfig } from "./config";

/**
 * CarrierAuth API クライアント
 * 各業務システムからCarrierAuth APIにリクエストを送る
 */
export class CarrierAuthClient {
  private apiUrl: string;

  constructor(apiUrl?: string) {
    this.apiUrl = apiUrl || getConfig().apiUrl;
  }

  /**
   * メールアドレスで社員情報を取得する
   */
  async getEmployeeByEmail(
    email: string,
    token: string
  ): Promise<CarrierUser | null> {
    const res = await fetch(
      `${this.apiUrl}/api/employees/${encodeURIComponent(email)}`,
      {
        headers: { Cookie: `carrier_session=${token}` },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      pictureUrl: data.picture,
      role: data.role,
      departmentId: data.department?.id || null,
      departmentName: data.department?.name || null,
      position: data.position,
      managerId: data.managerId,
      isActive: data.isActive,
    };
  }

  /**
   * 部下一覧を取得する
   */
  async getSubordinates(
    employeeId: string,
    token: string
  ): Promise<
    Array<{
      id: string;
      name: string | null;
      email: string;
      position: string | null;
      department: string | null;
    }>
  > {
    const res = await fetch(
      `${this.apiUrl}/api/employees/${employeeId}/subordinates`,
      {
        headers: { Cookie: `carrier_session=${token}` },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.subordinates;
  }

  /**
   * 上司情報を取得する
   */
  async getManager(
    employeeId: string,
    token: string
  ): Promise<{
    id: string;
    name: string | null;
    email: string;
    position: string | null;
    department: string | null;
  } | null> {
    const res = await fetch(
      `${this.apiUrl}/api/employees/${employeeId}/manager`,
      {
        headers: { Cookie: `carrier_session=${token}` },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.manager;
  }
}
