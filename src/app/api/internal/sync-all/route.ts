import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncToSisterApp, mapRoleToSisterApp } from "@/lib/sync";

export async function POST(request: NextRequest) {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      include: { employee: true },
    });
    let synced = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const user of users) {
      try {
        await syncToSisterApp({
          action: "create",
          email: user.email,
          name: user.employee?.name || user.email.split("@")[0],
          passwordHash: user.passwordHash,
          role: mapRoleToSisterApp(user.role),
        });
        synced++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${user.email}: ${msg}`);
        skipped++;
      }
    }

    return NextResponse.json({
      total: users.length,
      synced,
      skipped,
      errors,
    });
  } catch (error) {
    console.error("一括同期エラー:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
