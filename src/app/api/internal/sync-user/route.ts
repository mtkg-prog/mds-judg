import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

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
    const { action, email, name, passwordHash, role } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    if (action === "create") {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json({ status: "skipped", reason: "already exists" });
      }

      // mds-judg の User.passwordHash は required なので、
      // パスワードがない場合はダミーハッシュを生成
      const hash = passwordHash || await hashPassword(crypto.randomUUID());

      await prisma.user.create({
        data: {
          email,
          passwordHash: hash,
          role: role || "employee",
          mustChangePassword: true,
        },
      });

      return NextResponse.json({ status: "created" }, { status: 201 });
    }

    if (action === "update-password") {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return NextResponse.json({ status: "skipped", reason: "user not found" });
      }

      // passwordHash が null の場合（hr-faqでリセットされた場合）、
      // ランダムハッシュを設定して mustChangePassword=true にする
      const hash = passwordHash || await hashPassword(crypto.randomUUID());

      await prisma.user.update({
        where: { email },
        data: {
          passwordHash: hash,
          mustChangePassword: passwordHash == null,
        },
      });

      return NextResponse.json({ status: "updated" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("sync-user エラー:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
